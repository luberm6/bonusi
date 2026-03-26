import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { CreateVisitDto, VisitsFilterDto } from "./visits.dto.js";

type VisitRow = {
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

function toVisitSummary(row: VisitRow) {
  return {
    id: row.id,
    clientId: row.client_id,
    adminId: row.admin_id,
    branchId: row.branch_id,
    status: row.status,
    visitDate: row.visit_date,
    totalAmount: Number(row.total_amount),
    discountAmount: Number(row.discount_amount),
    finalAmount: Number(row.final_amount),
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertCanCreateVisit(actor: AuthenticatedUser) {
  if (!["super_admin", "admin"].includes(actor.role)) {
    throw new HttpError(403, "Only admin/super_admin can create visits");
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
    const visit = insertedVisit.rows[0] as VisitRow;

    for (const item of preparedItems) {
      await client.query(
        `insert into public.visit_services
         (visit_id, service_id, service_name_snapshot, price, quantity)
         values ($1, $2, $3, $4, $5)`,
        [visit.id, item.serviceId, item.serviceNameSnapshot, item.price, item.quantity]
      );
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
    return await getVisitById(actor, visit.id);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

function applyRoleVisibility(actor: AuthenticatedUser, filters: VisitsFilterDto) {
  if (actor.role === "client") {
    return { ...filters, clientId: actor.id };
  }
  return filters;
}

export async function listVisits(actor: AuthenticatedUser, rawFilters: VisitsFilterDto) {
  const filters = applyRoleVisibility(actor, rawFilters);
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

  const whereSql = clauses.length ? `where ${clauses.join(" and ")}` : "";
  const result = await pool.query(
    `select v.id, v.client_id, v.admin_id, v.branch_id, v.status, v.visit_date, v.total_amount,
            v.discount_amount, v.final_amount, v.comment, v.created_at, v.updated_at
     from public.visits v
     left join public.users u_admin on u_admin.id = v.admin_id
     ${whereSql}
     order by v.visit_date desc, v.created_at desc`,
    values
  );
  return (result.rows as VisitRow[]).map(toVisitSummary);
}

async function getVisitServices(visitId: string) {
  const result = await pool.query(
    `select id, visit_id, service_id, service_name_snapshot, price, quantity, total
     from public.visit_services
     where visit_id = $1
     order by id asc`,
    [visitId]
  );
  return (result.rows as VisitServiceRow[]).map((row) => ({
    id: row.id,
    visitId: row.visit_id,
    serviceId: row.service_id,
    serviceNameSnapshot: row.service_name_snapshot,
    price: Number(row.price),
    quantity: Number(row.quantity),
    total: Number(row.total)
  }));
}

export async function getVisitById(actor: AuthenticatedUser, visitId: string) {
  const result = await pool.query(
    `select id, client_id, admin_id, branch_id, status, visit_date, total_amount,
            discount_amount, final_amount, comment, created_at, updated_at
     from public.visits
     where id = $1
     limit 1`,
    [visitId]
  );
  if (!result.rowCount) throw new HttpError(404, "Visit not found");
  const visit = result.rows[0] as VisitRow;
  if (actor.role === "client" && visit.client_id !== actor.id) throw new HttpError(403, "Access denied");
  if (actor.role === "admin" && visit.admin_id) {
    const adminRole = await pool.query("select role from public.users where id = $1 limit 1", [visit.admin_id]);
    const row = adminRole.rows[0] as { role: string } | undefined;
    if (row?.role === "super_admin" && visit.admin_id !== actor.id) {
      throw new HttpError(403, "Access denied");
    }
  }

  return {
    ...toVisitSummary(visit),
    services: await getVisitServices(visit.id)
  };
}
