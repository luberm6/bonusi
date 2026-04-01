import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { getActiveBonusSettings, calculateAccrualBonus } from "../bonus-settings/bonus-settings.service.js";
import { insertBonusTx } from "../bonuses/bonuses.service.js";
import { logAudit } from "../audit/audit.service.js";
import type { CreateVisitDto, VisitsFilterDto } from "./visits.dto.js";

type VisitRow = {
  id: string;
  client_id: string;
  client_name: string;
  admin_id: string | null;
  admin_name: string | null;
  branch_id: string;
  branch_name: string;
  status: string;
  visit_date: Date;
  total_amount: string;
  discount_amount: string;
  final_amount: string;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
  bonus_accrual_amount: string;
  services_count: number | string;
  service_names: string[] | null;
};

type VisitBaseRow = {
  id: string;
  client_id: string;
  admin_id: string | null;
  branch_id: string;
  status: string;
  visit_date: Date;
  total_amount: string;
  discount_amount: string;
  final_amount: string;
  comment: string | null;
  created_at: Date;
  updated_at: Date;
};

type VisitServiceRow = {
  id: string;
  visit_id: string;
  service_id: string | null;
  service_name_snapshot: string;
  price: string;
  quantity: string;
  total: string;
};

type VisitBonusRow = {
  id: string;
  client_id: string;
  client_name: string;
  admin_id: string | null;
  admin_name: string | null;
  visit_id: string | null;
  type: "accrual" | "writeoff";
  amount: string;
  comment: string | null;
  is_auto: boolean;
  created_at: Date;
};

function toServiceView(row: VisitServiceRow) {
  const price = Number(row.price);
  const quantity = Number(row.quantity);
  const total = Number(row.total);
  return {
    id: row.id,
    visitId: row.visit_id,
    visit_id: row.visit_id,
    serviceId: row.service_id,
    service_id: row.service_id,
    serviceNameSnapshot: row.service_name_snapshot,
    service_name_snapshot: row.service_name_snapshot,
    price,
    quantity,
    total
  };
}

function toBonusAccrualView(row: VisitBonusRow) {
  const amount = Number(row.amount);
  return {
    id: row.id,
    clientId: row.client_id,
    client_id: row.client_id,
    clientName: row.client_name,
    client_name: row.client_name,
    adminId: row.admin_id,
    admin_id: row.admin_id,
    adminName: row.admin_name,
    admin_name: row.admin_name,
    visitId: row.visit_id,
    visit_id: row.visit_id,
    type: row.type,
    amount,
    comment: row.comment,
    isAuto: row.is_auto,
    is_auto: row.is_auto,
    createdAt: row.created_at,
    created_at: row.created_at
  };
}

function toVisitSummary(row: VisitRow) {
  const visitDate = row.visit_date;
  const totalAmount = Number(row.total_amount);
  const discountAmount = Number(row.discount_amount);
  const finalAmount = Number(row.final_amount);
  const bonusAccrualAmount = Number(row.bonus_accrual_amount ?? 0);
  const servicesCount = Number(row.services_count ?? 0);
  const serviceNames = row.service_names ?? [];

  return {
    id: row.id,
    clientId: row.client_id,
    client_id: row.client_id,
    clientName: row.client_name,
    client_name: row.client_name,
    adminId: row.admin_id,
    admin_id: row.admin_id,
    adminName: row.admin_name,
    admin_name: row.admin_name,
    branchId: row.branch_id,
    branch_id: row.branch_id,
    branchName: row.branch_name,
    branch_name: row.branch_name,
    status: row.status,
    visitDate,
    visit_date: visitDate,
    totalAmount,
    total_amount: totalAmount,
    discountAmount,
    discount_amount: discountAmount,
    finalAmount,
    final_amount: finalAmount,
    bonusAccrualAmount,
    bonus_accrual_amount: bonusAccrualAmount,
    servicesCount,
    services_count: servicesCount,
    serviceNames,
    service_names: serviceNames,
    comment: row.comment,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

function assertCanCreateVisit(actor: AuthenticatedUser) {
  if (!["super_admin", "admin"].includes(actor.role)) {
    throw new HttpError(403, "Only admin/super_admin can create visits");
  }
}

function assertCanReadClientVisits(actor: AuthenticatedUser, clientId: string) {
  if (actor.role === "client" && actor.id !== clientId) {
    throw new HttpError(403, "Access denied");
  }
}

async function assertUserRole(client: PoolClient, userId: string, expected: "client" | "admin", field: string) {
  const result = await client.query("select id, role, is_active from public.users where id = $1 limit 1", [userId]);
  if (!result.rowCount) throw new HttpError(404, `${field} user not found`);
  const row = result.rows[0] as { role: string; is_active: boolean };
  if (!row.is_active) throw new HttpError(400, `${field} user is inactive`);
  if (expected === "admin" && !["admin", "super_admin"].includes(row.role)) {
    throw new HttpError(400, `${field} user role must be admin`);
  }
  if (expected === "client" && row.role !== "client") {
    throw new HttpError(400, `${field} user role must be client`);
  }
}

async function assertBranchActive(client: PoolClient, branchId: string) {
  const result = await client.query("select id, is_active from public.branches where id = $1 limit 1", [branchId]);
  if (!result.rowCount) throw new HttpError(404, "Branch not found");
  const row = result.rows[0] as { is_active: boolean };
  if (!row.is_active) throw new HttpError(400, "Branch is inactive");
}

async function getVisitServices(visitId: string) {
  const result = await pool.query(
    `select id, visit_id, service_id, service_name_snapshot, price, quantity, total
     from public.visit_services
     where visit_id = $1
     order by id asc`,
    [visitId]
  );
  return (result.rows as VisitServiceRow[]).map(toServiceView);
}

async function getVisitBonusAccruals(visitId: string) {
  const result = await pool.query(
    `select bt.id, bt.client_id, uc.email as client_name, bt.admin_id, ua.email as admin_name, bt.visit_id,
            bt.type, bt.amount, bt.comment, bt.is_auto, bt.created_at
     from public.bonus_transactions bt
     join public.users uc on uc.id = bt.client_id
     left join public.users ua on ua.id = bt.admin_id
     where bt.visit_id = $1
       and bt.type = 'accrual'
     order by bt.created_at desc, bt.id desc`,
    [visitId]
  );
  return (result.rows as VisitBonusRow[]).map(toBonusAccrualView);
}

function buildVisitWhere(actor: AuthenticatedUser, filters: VisitsFilterDto) {
  const clauses: string[] = [];
  const values: unknown[] = [];
  const push = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(`${sql} $${values.length}`);
  };

  if (filters.clientId) push("v.client_id =", filters.clientId);
  if (filters.adminId) push("v.admin_id =", filters.adminId);
  if (filters.branchId) push("v.branch_id =", filters.branchId);
  if (filters.dateFrom) push("v.visit_date >=", filters.dateFrom);
  if (filters.dateTo) push("v.visit_date <=", filters.dateTo);
  if (actor.role === "admin") clauses.push("coalesce(u_admin.role, 'admin') <> 'super_admin'");

  return {
    whereSql: clauses.length ? `where ${clauses.join(" and ")}` : "",
    values
  };
}

async function fetchVisitRows(actor: AuthenticatedUser, filters: VisitsFilterDto) {
  const { whereSql, values } = buildVisitWhere(actor, filters);
  const result = await pool.query(
    `select v.id, v.client_id, uc.email as client_name, v.admin_id, ua.email as admin_name,
            v.branch_id, b.name as branch_name, v.status, v.visit_date, v.total_amount,
            v.discount_amount, v.final_amount, v.comment, v.created_at, v.updated_at,
            coalesce(bt.bonus_accrual_amount, 0)::numeric(12,2) as bonus_accrual_amount,
            coalesce(vs.services_count, 0)::int as services_count,
            coalesce(vs.service_names, '{}'::text[]) as service_names
     from public.visits v
     join public.users uc on uc.id = v.client_id
     left join public.users ua on ua.id = v.admin_id
     join public.branches b on b.id = v.branch_id
     left join public.users u_admin on u_admin.id = v.admin_id
     left join lateral (
       select count(*)::int as services_count,
              array_agg(vs.service_name_snapshot order by vs.id) as service_names
       from public.visit_services vs
       where vs.visit_id = v.id
     ) vs on true
     left join lateral (
       select coalesce(sum(bt.amount), 0)::numeric(12,2) as bonus_accrual_amount
       from public.bonus_transactions bt
       where bt.visit_id = v.id
         and bt.type = 'accrual'
     ) bt on true
     ${whereSql}
     order by v.visit_date desc, v.created_at desc, v.id desc`,
    values
  );
  return result.rows as VisitRow[];
}

async function fetchVisitRowById(visitId: string) {
  const result = await pool.query(
    `select v.id, v.client_id, uc.email as client_name, v.admin_id, ua.email as admin_name,
            v.branch_id, b.name as branch_name, v.status, v.visit_date, v.total_amount,
            v.discount_amount, v.final_amount, v.comment, v.created_at, v.updated_at,
            coalesce(bt.bonus_accrual_amount, 0)::numeric(12,2) as bonus_accrual_amount,
            coalesce(vs.services_count, 0)::int as services_count,
            coalesce(vs.service_names, '{}'::text[]) as service_names
     from public.visits v
     join public.users uc on uc.id = v.client_id
     left join public.users ua on ua.id = v.admin_id
     join public.branches b on b.id = v.branch_id
     left join lateral (
       select count(*)::int as services_count,
              array_agg(vs.service_name_snapshot order by vs.id) as service_names
       from public.visit_services vs
       where vs.visit_id = v.id
     ) vs on true
     left join lateral (
       select coalesce(sum(bt.amount), 0)::numeric(12,2) as bonus_accrual_amount
       from public.bonus_transactions bt
       where bt.visit_id = v.id
         and bt.type = 'accrual'
     ) bt on true
     where v.id = $1
     limit 1`,
    [visitId]
  );
  if (!result.rowCount) throw new HttpError(404, "Visit not found");
  return result.rows[0] as VisitRow;
}

async function assertVisitReadable(actor: AuthenticatedUser, visit: VisitRow) {
  if (actor.role === "client" && visit.client_id !== actor.id) {
    throw new HttpError(403, "Access denied");
  }
  if (actor.role === "admin" && visit.admin_id) {
    const adminRole = await pool.query("select role from public.users where id = $1 limit 1", [visit.admin_id]);
    const row = adminRole.rows[0] as { role: string } | undefined;
    if (row?.role === "super_admin" && visit.admin_id !== actor.id) {
      throw new HttpError(403, "Access denied");
    }
  }
}

function applyRoleVisibility(actor: AuthenticatedUser, filters: VisitsFilterDto) {
  if (actor.role === "client") {
    if (filters.clientId && filters.clientId !== actor.id) {
      throw new HttpError(403, "Access denied");
    }
    return { ...filters, clientId: actor.id };
  }
  return filters;
}

export async function createVisit(actor: AuthenticatedUser, dto: CreateVisitDto) {
  assertCanCreateVisit(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await assertUserRole(client, dto.clientId, "client", "client");
    await assertUserRole(client, actor.id, "admin", "admin");
    await assertBranchActive(client, dto.branchId);

    const serviceIds = [...new Set(dto.services.map((s) => s.serviceId))];
    const serviceResult = await client.query(
      `select id, name, base_price, is_active
       from public.services
       where id = any($1::uuid[])`,
      [serviceIds]
    );
    const serviceMap = new Map(
      serviceResult.rows.map((r) => [
        r.id as string,
        { name: r.name as string, basePrice: Number(r.base_price), isActive: r.is_active as boolean }
      ])
    );

    for (const id of serviceIds) {
      if (!serviceMap.has(id)) throw new HttpError(404, `Service not found: ${id}`);
      if (!serviceMap.get(id)!.isActive) throw new HttpError(400, `Service is inactive: ${id}`);
    }

    const preparedItems = dto.services.map((item) => {
      const service = serviceMap.get(item.serviceId)!;
      const price = item.price ?? service.basePrice;
      const quantity = Number(item.quantity.toFixed(2));
      const total = Number((price * quantity).toFixed(2));
      return {
        serviceId: item.serviceId,
        serviceNameSnapshot: service.name,
        price: Number(price.toFixed(2)),
        quantity,
        total
      };
    });

    const totalAmount = Number(preparedItems.reduce((acc, item) => acc + item.total, 0).toFixed(2));
    const discountAmount = Number(dto.discountAmount.toFixed(2));
    if (discountAmount < 0) throw new HttpError(400, "discountAmount cannot be negative");
    if (discountAmount > totalAmount) throw new HttpError(400, "discountAmount cannot exceed totalAmount");
    const finalAmount = Number((totalAmount - discountAmount).toFixed(2));

    const insertedVisit = await client.query(
      `insert into public.visits
       (client_id, admin_id, branch_id, status, visit_date, total_amount, discount_amount, final_amount, comment)
       values ($1, $2, $3, 'scheduled', $4, $5, $6, $7, $8)
       returning id, client_id, admin_id, branch_id, status, visit_date, total_amount, discount_amount, final_amount, comment, created_at, updated_at`,
      [dto.clientId, actor.id, dto.branchId, dto.visitDate, totalAmount, discountAmount, finalAmount, dto.comment ?? null]
    );
    const visit = insertedVisit.rows[0] as VisitBaseRow;
    const bonusSettings = await getActiveBonusSettings(client);

    for (const item of preparedItems) {
      await client.query(
        `insert into public.visit_services
         (visit_id, service_id, service_name_snapshot, price, quantity)
         values ($1, $2, $3, $4, $5)`,
        [visit.id, item.serviceId, item.serviceNameSnapshot, item.price, item.quantity]
      );
    }

    const bonusAccrualAmount = calculateAccrualBonus(finalAmount, bonusSettings);
    if (bonusAccrualAmount > 0) {
      const autoAccrual = await insertBonusTx(client, {
        clientId: dto.clientId,
        adminId: actor.id,
        visitId: visit.id,
        type: "accrual",
        amount: bonusAccrualAmount,
        comment: `Автоматическое начисление за визит #${visit.id.slice(0, 8)}`,
        isAuto: true
      });

      await logAudit({
        actorUserId: actor.id,
        action: "bonus.accrual.auto",
        entityType: "bonus_transactions",
        entityId: autoAccrual.id,
        payload: {
          clientId: dto.clientId,
          visitId: visit.id,
          amount: bonusAccrualAmount,
          finalAmount,
          settings: bonusSettings
        },
        client
      });
    }

    await logAudit({
      actorUserId: actor.id,
      action: "visit.create",
      entityType: "visits",
      entityId: visit.id,
      payload: {
        clientId: dto.clientId,
        branchId: dto.branchId,
        totalAmount,
        discountAmount,
        finalAmount,
        serviceCount: preparedItems.length
      },
      client
    });

    await client.query("commit");
    return { ...(await getVisitById(actor, visit.id)), bonusAccrualAmount, bonus_accrual_amount: bonusAccrualAmount };
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      throw new HttpError(409, "Automatic bonus accrual was already created for this visit");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listVisits(actor: AuthenticatedUser, rawFilters: VisitsFilterDto) {
  const filters = applyRoleVisibility(actor, rawFilters);
  const rows = await fetchVisitRows(actor, filters);
  return rows.map(toVisitSummary);
}

export async function getClientVisits(actor: AuthenticatedUser, clientId: string, rawFilters: VisitsFilterDto = {}) {
  assertCanReadClientVisits(actor, clientId);
  const filters = applyRoleVisibility(actor, { ...rawFilters, clientId });
  const rows = await fetchVisitRows(actor, filters);
  return rows.map(toVisitSummary);
}

export async function getVisitById(actor: AuthenticatedUser, visitId: string) {
  const visit = await fetchVisitRowById(visitId);
  await assertVisitReadable(actor, visit);

  const summary = toVisitSummary(visit);
  const services = await getVisitServices(visit.id);
  const bonusAccruals = await getVisitBonusAccruals(visit.id);

  return {
    ...summary,
    services,
    visitServices: services,
    visit_services: services,
    bonusAccruals,
    bonus_accruals: bonusAccruals
  };
}
