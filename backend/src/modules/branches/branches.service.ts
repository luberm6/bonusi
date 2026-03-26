import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import { geocodeAddress } from "../geocoding/geocode.service.js";
import type { CreateBranchDto, UpdateBranchDto } from "./branches.dto.js";

type BranchRow = {
  id: string;
  name: string;
  address: string;
  lat: string;
  lng: string;
  phone: string | null;
  work_hours: Record<string, unknown>;
  description: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function toBranchView(row: BranchRow) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: row.phone,
    workHours: row.work_hours,
    description: row.description,
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

async function getBranchByIdRaw(branchId: string, client?: PoolClient): Promise<BranchRow> {
  const runner = client ?? pool;
  const result = await runner.query(
    `select id, name, address, lat, lng, phone, work_hours, description, is_active, created_at, updated_at
     from public.branches where id = $1 limit 1`,
    [branchId]
  );
  if (result.rowCount === 0) throw new HttpError(404, "Branch not found");
  return result.rows[0] as BranchRow;
}

export async function createBranch(actor: AuthenticatedUser, dto: CreateBranchDto) {
  assertManagePermission(actor);

  let lat = dto.lat;
  let lng = dto.lng;
  let normalizedAddress = dto.address;
  if (lat === undefined || lng === undefined) {
    const geocoded = await geocodeAddress(dto.address);
    lat = geocoded.lat;
    lng = geocoded.lng;
    normalizedAddress = geocoded.normalizedAddress;
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into public.branches
       (name, address, lat, lng, phone, work_hours, description, is_active)
       values ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       returning id, name, address, lat, lng, phone, work_hours, description, is_active, created_at, updated_at`,
      [dto.name, normalizedAddress, lat, lng, dto.phone ?? null, JSON.stringify(dto.workHours ?? {}), dto.description ?? null, dto.isActive]
    );
    const branch = inserted.rows[0] as BranchRow;

    await logAudit({
      actorUserId: actor.id,
      action: "branch.create",
      entityType: "branches",
      entityId: branch.id,
      payload: { name: branch.name, address: branch.address, isActive: branch.is_active },
      client
    });
    await client.query("commit");
    return toBranchView(branch);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listBranches(actor: AuthenticatedUser) {
  const result =
    actor.role === "client"
      ? await pool.query(
          `select id, name, address, lat, lng, phone, work_hours, description, is_active, created_at, updated_at
           from public.branches
           where is_active = true
           order by name asc`
        )
      : await pool.query(
          `select id, name, address, lat, lng, phone, work_hours, description, is_active, created_at, updated_at
           from public.branches
           order by created_at desc`
        );
  return (result.rows as BranchRow[]).map(toBranchView);
}

export async function getBranchById(actor: AuthenticatedUser, branchId: string) {
  const branch = await getBranchByIdRaw(branchId);
  if (actor.role === "client" && !branch.is_active) {
    throw new HttpError(404, "Branch not found");
  }
  return toBranchView(branch);
}

function buildUpdateSql(dto: UpdateBranchDto) {
  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (dto.name !== undefined) push("name", dto.name);
  if (dto.address !== undefined) push("address", dto.address);
  if (dto.lat !== undefined) push("lat", dto.lat);
  if (dto.lng !== undefined) push("lng", dto.lng);
  if (dto.phone !== undefined) push("phone", dto.phone ?? null);
  if (dto.workHours !== undefined) push("work_hours", JSON.stringify(dto.workHours));
  if (dto.description !== undefined) push("description", dto.description ?? null);
  if (dto.isActive !== undefined) push("is_active", dto.isActive);
  return { sets, values };
}

export async function updateBranch(actor: AuthenticatedUser, branchId: string, dto: UpdateBranchDto) {
  assertManagePermission(actor);

  const client = await pool.connect();
  try {
    await client.query("begin");
    await getBranchByIdRaw(branchId, client);

    // Manual correction supported: explicit lat/lng are respected.
    if (dto.address !== undefined && (dto.lat === undefined || dto.lng === undefined)) {
      const geocoded = await geocodeAddress(dto.address);
      dto.address = geocoded.normalizedAddress;
      if (dto.lat === undefined) dto.lat = geocoded.lat;
      if (dto.lng === undefined) dto.lng = geocoded.lng;
    }

    const update = buildUpdateSql(dto);
    if (update.sets.length === 0) throw new HttpError(400, "No fields to update");
    update.values.push(branchId);

    const updated = await client.query(
      `update public.branches
       set ${update.sets.join(", ")}
       where id = $${update.values.length}
       returning id, name, address, lat, lng, phone, work_hours, description, is_active, created_at, updated_at`,
      update.values
    );
    const branch = updated.rows[0] as BranchRow;

    await logAudit({
      actorUserId: actor.id,
      action: "branch.update",
      entityType: "branches",
      entityId: branch.id,
      payload: { changedFields: Object.keys(dto) },
      client
    });
    await client.query("commit");
    return toBranchView(branch);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function deactivateBranch(actor: AuthenticatedUser, branchId: string) {
  assertManagePermission(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const target = await getBranchByIdRaw(branchId, client);
    if (target.is_active) {
      await client.query("update public.branches set is_active = false where id = $1", [branchId]);
    }
    await logAudit({
      actorUserId: actor.id,
      action: "branch.deactivate",
      entityType: "branches",
      entityId: branchId,
      payload: { alreadyDeactivated: !target.is_active },
      client
    });
    await client.query("commit");
    return { success: true, alreadyDeactivated: !target.is_active, branchId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
