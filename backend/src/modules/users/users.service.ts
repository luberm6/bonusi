import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import { toPgHttpError } from "../../common/http/pg-error.js";
import { hashPassword } from "../../common/security/password.js";
import type { AuthenticatedUser, UserRole } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { CreateUserDto, ResetUserPasswordDto, UpdateUserDto } from "./users.dto.js";

type UserRow = {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_by: string | null;
  full_name: string | null;
  phone: string | null;
  notes: string | null;
  last_seen: Date | null;
  created_at: Date;
  updated_at: Date;
};

function toUserView(row: UserRow) {
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

function canAdminAccessTarget(actor: AuthenticatedUser, target: UserRow): boolean {
  if (actor.role === "super_admin") {
    return true;
  }
  if (actor.role === "admin") {
    return target.role !== "super_admin";
  }
  return actor.id === target.id;
}

function assertCanManageCreation(actor: AuthenticatedUser, roleToCreate: UserRole) {
  if (actor.role === "client") {
    throw new HttpError(403, "client cannot create users");
  }
  if (!["admin", "client"].includes(roleToCreate)) {
    throw new HttpError(400, "Only admin or client can be created");
  }
  if (actor.role === "admin" && roleToCreate === "admin") {
    throw new HttpError(403, "admin cannot create admin users");
  }
}

async function getUserRowById(userId: string, client?: PoolClient): Promise<UserRow> {
  const runner = client ?? pool;
  const result = await runner.query(
    `select id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at
     from public.users where id = $1 limit 1`,
    [userId]
  );
  if (result.rowCount === 0) {
    throw new HttpError(404, "User not found");
  }
  return result.rows[0] as UserRow;
}

function buildUpdateQuery(dto: UpdateUserDto, passwordHash: string | null) {
  const sets: string[] = [];
  const values: unknown[] = [];

  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (dto.email !== undefined) push("email", dto.email);
  if (dto.role !== undefined) push("role", dto.role);
  if (dto.isActive !== undefined) push("is_active", dto.isActive);
  if (dto.fullName !== undefined) push("full_name", dto.fullName);
  if (dto.phone !== undefined) push("phone", dto.phone);
  if (dto.notes !== undefined) push("notes", dto.notes);
  if (passwordHash) push("password_hash", passwordHash);

  return { sets, values };
}

function validateUpdatePermissions(actor: AuthenticatedUser, target: UserRow, dto: UpdateUserDto) {
  if (actor.role === "client" && actor.id !== target.id) {
    throw new HttpError(403, "client can update only own profile");
  }
  if (actor.role === "client") {
    const forbidden = ["email", "password", "role", "isActive"].filter((field) => dto[field as keyof UpdateUserDto] !== undefined);
    if (forbidden.length > 0) {
      throw new HttpError(403, "client can update only fullName, phone and notes");
    }
    return;
  }
  if (actor.role === "admin") {
    if (target.role === "super_admin") {
      throw new HttpError(403, "admin cannot update super_admin");
    }
    if (target.role === "admin") {
      throw new HttpError(403, "admin cannot manage admin users");
    }
    if (dto.role !== undefined) {
      throw new HttpError(403, "admin cannot change roles");
    }
  }
}

function validatePasswordResetPermissions(actor: AuthenticatedUser, target: UserRow) {
  if (actor.role === "client") {
    throw new HttpError(403, "client cannot reset passwords");
  }
  if (target.role !== "client") {
    throw new HttpError(403, "Можно менять пароль только клиентским аккаунтам");
  }
  if (actor.role === "admin" && target.role !== "client") {
    throw new HttpError(403, "admin cannot reset this password");
  }
}

export async function createUser(actor: AuthenticatedUser, dto: CreateUserDto) {
  assertCanManageCreation(actor, dto.role);
  const passwordHash = await hashPassword(dto.password);

  const client = await pool.connect();
  try {
    await client.query("begin");
    const created = await client.query(
      `insert into public.users
       (email, password_hash, role, created_by, is_active, full_name, phone, notes)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (email) do nothing
       returning id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at`,
      [dto.email, passwordHash, dto.role, actor.id, dto.isActive, dto.fullName, dto.phone, dto.notes]
    );
    if (created.rowCount === 0) {
      throw new HttpError(409, "User with this email already exists");
    }

    const user = created.rows[0] as UserRow;
    await logAudit({
      actorUserId: actor.id,
      action: "user.create",
      entityType: "users",
      entityId: user.id,
      payload: { createdBy: actor.id, role: user.role, email: user.email, isActive: user.is_active },
      client
    });

    await client.query("commit");
    return toUserView(user);
  } catch (error) {
    await client.query("rollback");
    const normalized = toPgHttpError(error);
    if (normalized) throw normalized;
    throw error;
  } finally {
    client.release();
  }
}

export async function listUsers(actor: AuthenticatedUser) {
  if (actor.role === "client") {
    const me = await getUserRowById(actor.id);
    return [toUserView(me)];
  }
  const result =
    actor.role === "super_admin"
      ? await pool.query(
          `select id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at
           from public.users
           order by created_at desc`
        )
      : await pool.query(
          `select id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at
           from public.users
           where role <> 'super_admin'
           order by created_at desc`
        );

  return (result.rows as UserRow[]).map(toUserView);
}

export async function getUserById(actor: AuthenticatedUser, userId: string) {
  const target = await getUserRowById(userId);
  if (!canAdminAccessTarget(actor, target)) {
    throw new HttpError(403, "Access denied");
  }
  return toUserView(target);
}

export async function updateUser(actor: AuthenticatedUser, userId: string, dto: UpdateUserDto) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const target = await getUserRowById(userId, client);
    validateUpdatePermissions(actor, target, dto);

    const passwordHash = dto.password ? await hashPassword(dto.password) : null;
    const update = buildUpdateQuery(dto, passwordHash);
    if (update.sets.length === 0) {
      throw new HttpError(400, "No fields to update");
    }
    update.values.push(userId);
    const sql = `update public.users set ${update.sets.join(", ")} where id = $${update.values.length}
                 returning id, email, role, is_active, created_by, full_name, phone, notes, last_seen, created_at, updated_at`;

    const updated = await client.query(sql, update.values);
    if (updated.rowCount === 0) {
      throw new HttpError(404, "User not found");
    }

    const user = updated.rows[0] as UserRow;
    if (dto.isActive === false) {
      await client.query("update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [
        user.id
      ]);
      await client.query("update public.devices set is_active = false where user_id = $1", [user.id]);
    }

    await logAudit({
      actorUserId: actor.id,
      action: "user.update",
      entityType: "users",
      entityId: user.id,
      payload: {
        changedFields: Object.keys(dto),
        role: user.role,
        isActive: user.is_active
      },
      client
    });

    await client.query("commit");
    return toUserView(user);
  } catch (error) {
    await client.query("rollback");
    const normalized = toPgHttpError(error);
    if (normalized) throw normalized;
    throw error;
  } finally {
    client.release();
  }
}

export async function deactivateUser(actor: AuthenticatedUser, userId: string) {
  if (actor.role === "client") {
    throw new HttpError(403, "client cannot deactivate users");
  }
  if (userId === actor.id) {
    throw new HttpError(400, "self-deactivation is not allowed");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    const target = await getUserRowById(userId, client);
    if (actor.role === "admin" && target.role !== "client") {
      throw new HttpError(403, "admin cannot deactivate admin users");
    }

    if (target.is_active) {
      await client.query("update public.users set is_active = false where id = $1", [userId]);
      await client.query("update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [
        userId
      ]);
      await client.query("update public.devices set is_active = false where user_id = $1", [userId]);
    }

    await logAudit({
      actorUserId: actor.id,
      action: "user.deactivate",
      entityType: "users",
      entityId: userId,
      payload: { alreadyDeactivated: !target.is_active },
      client
    });
    await client.query("commit");
    return { success: true, alreadyDeactivated: !target.is_active, userId };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetUserPassword(actor: AuthenticatedUser, userId: string, dto: ResetUserPasswordDto) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const target = await getUserRowById(userId, client);
    validatePasswordResetPermissions(actor, target);

    const passwordHash = await hashPassword(dto.newPassword);
    await client.query("update public.users set password_hash = $1, updated_at = now() where id = $2", [passwordHash, userId]);
    await client.query("update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null", [userId]);
    await client.query("update public.devices set is_active = false where user_id = $1", [userId]);

    await logAudit({
      actorUserId: actor.id,
      action: "client.password.reset",
      entityType: "users",
      entityId: userId,
      payload: {
        targetRole: target.role,
        targetEmail: target.email
      },
      client
    });

    await client.query("commit");
    return { success: true, userId };
  } catch (error) {
    await client.query("rollback");
    const normalized = toPgHttpError(error);
    if (normalized) throw normalized;
    throw error;
  } finally {
    client.release();
  }
}

export async function getCurrentUser(actor: AuthenticatedUser) {
  const user = await getUserRowById(actor.id);
  return toUserView(user);
}
