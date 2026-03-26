import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { BonusOperationDto } from "./bonuses.dto.js";

type BonusRow = {
  id: string;
  client_id: string;
  admin_id: string | null;
  visit_id: string | null;
  type: "accrual" | "writeoff";
  amount: string;
  comment: string | null;
  created_at: Date;
};

function toBonusView(row: BonusRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    adminId: row.admin_id,
    visitId: row.visit_id,
    type: row.type,
    amount: Number(row.amount),
    comment: row.comment,
    createdAt: row.created_at
  };
}

function assertAdmin(actor: AuthenticatedUser) {
  if (!["admin", "super_admin"].includes(actor.role)) {
    throw new HttpError(403, "Only admin/super_admin can manage bonuses");
  }
}

function clientCanView(actor: AuthenticatedUser, clientId: string) {
  if (actor.role === "client" && actor.id !== clientId) {
    throw new HttpError(403, "client can access only own bonuses");
  }
}

async function assertClientRole(client: PoolClient, userId: string) {
  const result = await client.query("select role, is_active from public.users where id = $1 limit 1", [userId]);
  if (!result.rowCount) throw new HttpError(404, "Client user not found");
  const row = result.rows[0] as { role: string; is_active: boolean };
  if (row.role !== "client") throw new HttpError(400, "Target user must have client role");
  if (!row.is_active) throw new HttpError(400, "Target client is inactive");
}

async function assertVisitBelongsToClient(client: PoolClient, visitId: string, clientId: string) {
  const result = await client.query(
    "select id, client_id, total_amount, discount_amount, final_amount from public.visits where id = $1 limit 1",
    [visitId]
  );
  if (!result.rowCount) throw new HttpError(404, "Visit not found");
  const row = result.rows[0] as {
    id: string;
    client_id: string;
    total_amount: string;
    discount_amount: string;
    final_amount: string;
  };
  if (row.client_id !== clientId) throw new HttpError(400, "visit_id must belong to provided client");
  return row;
}

async function lockClientBonusStream(client: PoolClient, clientId: string) {
  await client.query("select pg_advisory_xact_lock(hashtext($1))", [clientId]);
}

async function getBalanceInternal(client: PoolClient, clientId: string): Promise<number> {
  const result = await client.query(
    `select coalesce(sum(case when type='accrual' then amount else -amount end), 0)::numeric(12,2) as balance
     from public.bonus_transactions
     where client_id = $1`,
    [clientId]
  );
  return Number(result.rows[0].balance);
}

async function insertBonusTx(
  client: PoolClient,
  input: {
    clientId: string;
    adminId: string;
    visitId?: string;
    type: "accrual" | "writeoff";
    amount: number;
    comment?: string | null;
  }
) {
  const inserted = await client.query(
    `insert into public.bonus_transactions
     (client_id, admin_id, visit_id, type, amount, comment)
     values ($1, $2, $3, $4, $5, $6)
     returning id, client_id, admin_id, visit_id, type, amount, comment, created_at`,
    [input.clientId, input.adminId, input.visitId ?? null, input.type, input.amount, input.comment ?? null]
  );
  return inserted.rows[0] as BonusRow;
}

async function applyVisitDiscountFromWriteoff(
  client: PoolClient,
  visit: { id: string; total_amount: string; discount_amount: string },
  writeoffAmount: number
) {
  const total = Number(visit.total_amount);
  const currentDiscount = Number(visit.discount_amount);
  const nextDiscount = Number((currentDiscount + writeoffAmount).toFixed(2));
  if (nextDiscount > total) {
    throw new HttpError(400, "writeoff would exceed visit total after discount");
  }
  const nextFinal = Number((total - nextDiscount).toFixed(2));
  await client.query("update public.visits set discount_amount = $1, final_amount = $2 where id = $3", [
    nextDiscount,
    nextFinal,
    visit.id
  ]);
}

export async function accrual(actor: AuthenticatedUser, dto: BonusOperationDto) {
  assertAdmin(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await assertClientRole(client, dto.clientId);
    if (dto.visitId) {
      await assertVisitBelongsToClient(client, dto.visitId, dto.clientId);
    }

    await lockClientBonusStream(client, dto.clientId);
    const tx = await insertBonusTx(client, {
      clientId: dto.clientId,
      adminId: actor.id,
      visitId: dto.visitId,
      type: "accrual",
      amount: dto.amount,
      comment: dto.comment
    });
    const balance = await getBalanceInternal(client, dto.clientId);

    await logAudit({
      actorUserId: actor.id,
      action: "bonus.accrual",
      entityType: "bonus_transactions",
      entityId: tx.id,
      payload: { clientId: dto.clientId, visitId: dto.visitId ?? null, amount: dto.amount, balanceAfter: balance },
      client
    });

    await client.query("commit");
    return { operation: toBonusView(tx), balance };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function writeoff(actor: AuthenticatedUser, dto: BonusOperationDto) {
  assertAdmin(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await assertClientRole(client, dto.clientId);
    const visit = dto.visitId ? await assertVisitBelongsToClient(client, dto.visitId, dto.clientId) : null;

    await lockClientBonusStream(client, dto.clientId);
    const balanceBefore = await getBalanceInternal(client, dto.clientId);
    if (dto.amount > balanceBefore) {
      throw new HttpError(400, "Insufficient bonus balance");
    }

    if (visit) {
      await applyVisitDiscountFromWriteoff(client, visit, dto.amount);
    }

    const tx = await insertBonusTx(client, {
      clientId: dto.clientId,
      adminId: actor.id,
      visitId: dto.visitId,
      type: "writeoff",
      amount: dto.amount,
      comment: dto.comment
    });
    const balance = await getBalanceInternal(client, dto.clientId);

    await logAudit({
      actorUserId: actor.id,
      action: "bonus.writeoff",
      entityType: "bonus_transactions",
      entityId: tx.id,
      payload: {
        clientId: dto.clientId,
        visitId: dto.visitId ?? null,
        amount: dto.amount,
        balanceBefore,
        balanceAfter: balance
      },
      client
    });

    await client.query("commit");
    return { operation: toBonusView(tx), balance };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function getBalance(actor: AuthenticatedUser, clientId: string) {
  if (actor.role !== "super_admin" && actor.role !== "admin") {
    clientCanView(actor, clientId);
  }
  const result = await pool.query(
    `select coalesce(sum(case when type='accrual' then amount else -amount end), 0)::numeric(12,2) as balance
     from public.bonus_transactions
     where client_id = $1`,
    [clientId]
  );
  return { clientId, balance: Number(result.rows[0].balance) };
}

export async function getHistory(actor: AuthenticatedUser, clientId: string) {
  if (actor.role !== "super_admin" && actor.role !== "admin") {
    clientCanView(actor, clientId);
  }
  const result = await pool.query(
    `select id, client_id, admin_id, visit_id, type, amount, comment, created_at
     from public.bonus_transactions
     where client_id = $1
     order by created_at desc, id desc`,
    [clientId]
  );
  return (result.rows as BonusRow[]).map(toBonusView);
}
