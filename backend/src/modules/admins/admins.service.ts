import type { Pool, PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import { hashPassword } from "../../common/security/password.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { CreateAdminDto, UpdateAdminDto } from "./admins.dto.js";

type AdminRow = {
  id: string;
  email: string;
  role: "admin";
  is_active: boolean;
  created_by: string | null;
  full_name: string | null;
  phone: string | null;
  notes: string | null;
  last_seen: Date | null;
  created_at: Date;
  updated_at: Date;
};

function assertSuperAdmin(actor: AuthenticatedUser) {
  if (actor.role !== "super_admin") {
    throw new HttpError(403, "Only super_admin can manage admin users");
  }
}

function toAdminView(row: AdminRow) {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdBy: row.created_by,
    fullName: row.full_name,
    phone: row.phone,
    notes: row.notes,
    lastSeen: row.last_seen,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getAdminRowById(adminId: string, queryable: Pool | PoolClient = pool): Promise<AdminRow> {
  const result = await queryable.query(
    `select id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at
     from public.users
     where id = $1 and role = 'admin'
     limit 1`,
    [adminId]
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "Admin not found");
  }
  return result.rows[0] as AdminRow;
}

export async function listAdmins(actor: AuthenticatedUser) {
  assertSuperAdmin(actor);
  const result = await pool.query(
    `select id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at
     from public.users
     where role = 'admin'
     order by created_at desc`
  );
  return (result.rows as AdminRow[]).map(toAdminView);
}

export async function createAdmin(actor: AuthenticatedUser, dto: CreateAdminDto) {
  assertSuperAdmin(actor);
  const passwordHash = await hashPassword(dto.password);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const created = await client.query(
      `insert into public.users
       (email, password_hash, role, created_by, is_active, full_name, phone, notes)
       values ($1, $2, 'admin', $3, $4, $5, $6, $7)
       on conflict (email) do nothing
       returning id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at`,
      [dto.email, passwordHash, actor.id, dto.isActive, dto.fullName, dto.phone, dto.notes]
    );
    if (created.rowCount === 0) {
      throw new HttpError(409, "User with this email already exists");
    }

    const admin = created.rows[0] as AdminRow;
    await logAudit({
      actorUserId: actor.id,
      action: "user.create",
      entityType: "users",
      entityId: admin.id,
      payload: { createdBy: actor.id, role: admin.role, email: admin.email, isActive: admin.is_active },
      client
    });

    await client.query("commit");
    return toAdminView(admin);
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      throw new HttpError(409, "Пользователь с такими данными уже существует");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAdmin(actor: AuthenticatedUser, adminId: string, dto: UpdateAdminDto) {
  assertSuperAdmin(actor);
  if (adminId === actor.id && dto.isActive === false) {
    throw new HttpError(400, "self-deactivation is not allowed");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await getAdminRowById(adminId, client);

    const sets: string[] = [];
    const values: unknown[] = [];
    const push = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (dto.email !== undefined) push("email", dto.email);
    if (dto.fullName !== undefined) push("full_name", dto.fullName);
    if (dto.phone !== undefined) push("phone", dto.phone);
    if (dto.notes !== undefined) push("notes", dto.notes);
    if (dto.isActive !== undefined) push("is_active", dto.isActive);
    if (dto.password !== undefined) {
      push("password_hash", await hashPassword(dto.password));
    }

    values.push(adminId);
    const updated = await client.query(
      `update public.users
       set ${sets.join(", ")}
       where id = $${values.length} and role = 'admin'
       returning id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at`,
      values
    );
    if (updated.rowCount === 0) {
      throw new HttpError(404, "Admin not found");
    }

    const admin = updated.rows[0] as AdminRow;
    if (dto.isActive === false) {
      await client.query("update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [
        admin.id
      ]);
      await client.query("update public.devices set is_active = false where user_id = $1", [admin.id]);
    }

    await logAudit({
      actorUserId: actor.id,
      action: "user.update",
      entityType: "users",
      entityId: admin.id,
      payload: { changedFields: Object.keys(dto), role: admin.role, isActive: admin.is_active },
      client
    });

    await client.query("commit");
    return toAdminView(admin);
  } catch (error) {
    await client.query("rollback");
    if ((error as { code?: string }).code === "23505") {
      throw new HttpError(409, "Пользователь с такими данными уже существует");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function deactivateAdmin(actor: AuthenticatedUser, adminId: string) {
  assertSuperAdmin(actor);
  if (adminId === actor.id) {
    throw new HttpError(400, "self-deactivation is not allowed");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const target = await getAdminRowById(adminId, client);

    if (target.is_active) {
      await client.query("update public.users set is_active = false where id = $1", [adminId]);
      await client.query("update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [
        adminId
      ]);
      await client.query("update public.devices set is_active = false where user_id = $1", [adminId]);
    }

    await logAudit({
      actorUserId: actor.id,
      action: "user.deactivate",
      entityType: "users",
      entityId: adminId,
      payload: { alreadyDeactivated: !target.is_active, role: "admin" },
      client
    });

    await client.query("commit");
    return { success: true, alreadyDeactivated: !target.is_active, userId: adminId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
