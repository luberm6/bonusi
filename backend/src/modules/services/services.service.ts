import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { CreateServiceDto, UpdateServiceDto } from "./services.dto.js";

type ServiceRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function toServiceView(row: ServiceRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    basePrice: Number(row.base_price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function assertManagePermission(actor: AuthenticatedUser) {
  if (!["super_admin", "admin"].includes(actor.role)) {
    throw new HttpError(403, "Insufficient role");
  }
}

async function getServiceByIdRaw(serviceId: string, client?: PoolClient): Promise<ServiceRow> {
  const runner = client ?? pool;
  const result = await runner.query(
    `select id, name, description, base_price, is_active, created_at, updated_at
     from public.services
     where id = $1
     limit 1`,
    [serviceId]
  );
  if (!result.rowCount) throw new HttpError(404, "Service not found");
  return result.rows[0] as ServiceRow;
}

export async function createService(actor: AuthenticatedUser, dto: CreateServiceDto) {
  assertManagePermission(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into public.services (name, description, base_price, is_active)
       values ($1, $2, $3, $4)
       returning id, name, description, base_price, is_active, created_at, updated_at`,
      [dto.name, dto.description, dto.basePrice, dto.isActive]
    );
    const service = inserted.rows[0] as ServiceRow;
    await logAudit({
      actorUserId: actor.id,
      action: "service.create",
      entityType: "services",
      entityId: service.id,
      payload: { name: service.name, basePrice: service.base_price, isActive: service.is_active },
      client
    });
    await client.query("commit");
    return toServiceView(service);
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      throw new HttpError(409, "Service with this name already exists");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function listServices(actor: AuthenticatedUser) {
  const result =
    actor.role === "client"
      ? await pool.query(
          `select id, name, description, base_price, is_active, created_at, updated_at
           from public.services
           where is_active = true
           order by name asc`
        )
      : await pool.query(
          `select id, name, description, base_price, is_active, created_at, updated_at
           from public.services
           order by created_at desc`
        );
  return (result.rows as ServiceRow[]).map(toServiceView);
}

function buildUpdateQuery(dto: UpdateServiceDto) {
  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (dto.name !== undefined) push("name", dto.name);
  if (dto.description !== undefined) push("description", dto.description);
  if (dto.basePrice !== undefined) push("base_price", dto.basePrice);
  if (dto.isActive !== undefined) push("is_active", dto.isActive);
  return { sets, values };
}

export async function updateService(actor: AuthenticatedUser, serviceId: string, dto: UpdateServiceDto) {
  assertManagePermission(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await getServiceByIdRaw(serviceId, client);
    const update = buildUpdateQuery(dto);
    if (!update.sets.length) throw new HttpError(400, "No fields to update");
    update.values.push(serviceId);
    const updated = await client.query(
      `update public.services
       set ${update.sets.join(", ")}
       where id = $${update.values.length}
       returning id, name, description, base_price, is_active, created_at, updated_at`,
      update.values
    );
    const service = updated.rows[0] as ServiceRow;
    await logAudit({
      actorUserId: actor.id,
      action: "service.update",
      entityType: "services",
      entityId: service.id,
      payload: { changedFields: Object.keys(dto) },
      client
    });
    await client.query("commit");
    return toServiceView(service);
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      throw new HttpError(409, "Service with this name already exists");
    }
    throw error;
  } finally {
    client.release();
  }
}
