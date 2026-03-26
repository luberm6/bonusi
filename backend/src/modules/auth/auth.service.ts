import { randomUUID } from "crypto";
import { pool } from "../../common/db/pool.js";
import { env } from "../../common/config/env.js";
import { HttpError } from "../../common/http/error.js";
import type { UserRole } from "../../common/types/auth.js";
import { verifyPassword } from "../../common/security/password.js";
import { logAudit } from "../audit/audit.service.js";
import { createRawRefreshToken, hashRefreshToken, signAccessToken } from "./token.service.js";

type DeviceInput = {
  deviceId?: string;
  platform?: "ios" | "android" | "web";
  deviceName?: string;
  pushToken?: string;
  appVersion?: string;
};

const FAILED_WINDOW_MINUTES = 15;
const MAX_FAILED_ATTEMPTS = 5;

function refreshExpirySql(days: number) {
  return `now() + interval '${days} days'`;
}

function sanitizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.replace("::ffff:", "") : ip;
}

async function assertNotBruteforceLocked(email: string, ip: string) {
  const result = await pool.query(
    `select lock_until
     from public.auth_login_attempts
     where email = $1 and ip = $2::inet
     limit 1`,
    [email, sanitizeIp(ip)]
  );

  const lockUntil = result.rows[0]?.lock_until as Date | undefined;
  if (lockUntil && lockUntil.getTime() > Date.now()) {
    throw new HttpError(429, "Too many failed login attempts. Try again later.");
  }
}

async function registerFailedLoginAttempt(email: string, ip: string) {
  const client = await pool.connect();
  const safeIp = sanitizeIp(ip);
  try {
    await client.query("begin");
    const current = await client.query(
      `select id, fail_count, first_failed_at, lock_until
       from public.auth_login_attempts
       where email = $1 and ip = $2::inet
       for update`,
      [email, safeIp]
    );

    if (current.rowCount === 0) {
      await client.query(
        `insert into public.auth_login_attempts
         (email, ip, fail_count, first_failed_at, last_failed_at, lock_until)
         values ($1, $2::inet, 1, now(), now(), null)`,
        [email, safeIp]
      );
      await client.query("commit");
      return;
    }

    const row = current.rows[0] as {
      fail_count: number;
      first_failed_at: Date;
      lock_until: Date | null;
    };
    const now = Date.now();
    const windowStart = now - FAILED_WINDOW_MINUTES * 60_000;
    const inWindow = row.first_failed_at.getTime() >= windowStart;
    const nextFailCount = inWindow ? row.fail_count + 1 : 1;
    const nextFirstFailedAt = inWindow ? row.first_failed_at : new Date();
    const shouldLock = nextFailCount >= MAX_FAILED_ATTEMPTS;
    const lockUntil = shouldLock ? new Date(now + FAILED_WINDOW_MINUTES * 60_000) : null;

    await client.query(
      `update public.auth_login_attempts
       set fail_count = $1,
           first_failed_at = $2,
           last_failed_at = now(),
           lock_until = $3
       where email = $4 and ip = $5::inet`,
      [nextFailCount, nextFirstFailedAt, lockUntil, email, safeIp]
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

async function clearFailedLoginAttempts(email: string, ip: string) {
  await pool.query(
    "delete from public.auth_login_attempts where email = $1 and ip = $2::inet",
    [email, sanitizeIp(ip)]
  );
}

async function upsertDevice(userId: string, device?: DeviceInput): Promise<string | null> {
  if (!device?.platform) {
    return null;
  }

  const explicitDeviceId = device.deviceId;
  if (explicitDeviceId) {
    const updated = await pool.query(
      `update public.devices
       set platform = $3,
           device_name = $4,
           push_token = $5,
           app_version = $6,
           is_active = true,
           last_seen = now()
       where id = $1 and user_id = $2
       returning id`,
      [
        explicitDeviceId,
        userId,
        device.platform,
        device.deviceName ?? null,
        device.pushToken ?? null,
        device.appVersion ?? null
      ]
    );

    if (updated.rowCount && updated.rowCount > 0) {
      return updated.rows[0].id as string;
    }
  }

  if (device.pushToken) {
    const byPushToken = await pool.query(
      `update public.devices
       set user_id = $1,
           platform = $2,
           device_name = $3,
           app_version = $4,
           is_active = true,
           last_seen = now()
       where push_token = $5
       returning id`,
      [userId, device.platform, device.deviceName ?? null, device.appVersion ?? null, device.pushToken]
    );
    if (byPushToken.rowCount && byPushToken.rowCount > 0) {
      return byPushToken.rows[0].id as string;
    }
  }

  const inserted = await pool.query(
    `insert into public.devices
     (user_id, platform, device_name, push_token, app_version, is_active, last_seen)
     values ($1, $2, $3, $4, $5, true, now())
     returning id`,
    [
      userId,
      device.platform,
      device.deviceName ?? null,
      device.pushToken ?? null,
      device.appVersion ?? null
    ]
  );
  return inserted.rows[0].id as string;
}

export async function login(input: {
  email: string;
  password: string;
  ip: string;
  device?: DeviceInput;
}) {
  const email = input.email.trim().toLowerCase();
  await assertNotBruteforceLocked(email, input.ip);

  const result = await pool.query(
    `select id, email, password_hash, role, is_active
     from public.users
     where email = $1
     limit 1`,
    [email]
  );
  if (result.rowCount === 0) {
    await registerFailedLoginAttempt(email, input.ip);
    await logAudit({
      action: "auth.login_failed",
      entityType: "users",
      entityId: email,
      payload: { reason: "user_not_found", ip: sanitizeIp(input.ip) }
    });
    throw new HttpError(401, "Invalid credentials");
  }

  const user = result.rows[0] as {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    is_active: boolean;
  };

  if (!user.is_active) {
    await logAudit({
      actorUserId: user.id,
      action: "auth.login_blocked",
      entityType: "users",
      entityId: user.id,
      payload: { reason: "user_inactive", ip: sanitizeIp(input.ip) }
    });
    throw new HttpError(403, "User is deactivated");
  }

  const ok = await verifyPassword(input.password, user.password_hash);
  if (!ok) {
    await registerFailedLoginAttempt(email, input.ip);
    await logAudit({
      actorUserId: user.id,
      action: "auth.login_failed",
      entityType: "users",
      entityId: user.id,
      payload: { reason: "invalid_password", ip: sanitizeIp(input.ip) }
    });
    throw new HttpError(401, "Invalid credentials");
  }

  await clearFailedLoginAttempts(email, input.ip);
  const deviceId = await upsertDevice(user.id, input.device);
  const refreshToken = createRawRefreshToken();
  const refreshHash = hashRefreshToken(refreshToken);
  const familyId = randomUUID();

  const session = await pool.query(
     `insert into public.refresh_tokens
     (user_id, device_id, token_hash, family_id, expires_at)
     values ($1, $2, $3, $4, ${refreshExpirySql(env.refreshTokenTtlDays)})
     returning id`,
    [user.id, deviceId, refreshHash, familyId]
  );

  const sessionId = session.rows[0].id as string;
  const accessToken = signAccessToken({
    sub: user.id,
    sid: sessionId,
    did: deviceId,
    typ: "access"
  });

  await logAudit({
    actorUserId: user.id,
    action: "auth.login_success",
    entityType: "auth_sessions",
    entityId: sessionId,
    payload: { deviceId, ip: sanitizeIp(input.ip) }
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    },
    deviceId
  };
}

export async function rotateRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  const client = await pool.connect();

  try {
    await client.query("begin");
    const result = await client.query(
      `select rt.id, rt.user_id, rt.device_id, rt.family_id, rt.expires_at, rt.revoked_at,
              u.email, u.role, u.is_active
       from public.refresh_tokens rt
       join public.users u on u.id = rt.user_id
       where rt.token_hash = $1
       for update`,
      [tokenHash]
    );

    if (result.rowCount === 0) {
      throw new HttpError(401, "Invalid refresh token");
    }

    const row = result.rows[0] as {
      id: string;
      user_id: string;
      device_id: string | null;
      family_id: string;
      expires_at: Date;
      revoked_at: Date | null;
      email: string;
      role: UserRole;
      is_active: boolean;
    };

    if (row.revoked_at) {
      await client.query(
        "update public.refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null",
        [row.family_id]
      );
      await logAudit({
        actorUserId: row.user_id,
        action: "auth.refresh_reuse_detected",
        entityType: "refresh_tokens",
        entityId: row.id,
        payload: { familyId: row.family_id }
      });
      throw new HttpError(401, "Refresh token reuse detected");
    }

    if (row.expires_at.getTime() <= Date.now()) {
      await client.query("update public.refresh_tokens set revoked_at = now() where id = $1", [row.id]);
      throw new HttpError(401, "Refresh token expired");
    }

    if (!row.is_active) {
      await client.query("update public.refresh_tokens set revoked_at = now() where id = $1", [row.id]);
      throw new HttpError(403, "User is deactivated");
    }

    await client.query("update public.refresh_tokens set revoked_at = now() where id = $1", [row.id]);
    const newRefreshToken = createRawRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    const inserted = await client.query(
      `insert into public.refresh_tokens
       (user_id, device_id, token_hash, family_id, rotated_from_token_id, expires_at)
       values ($1, $2, $3, $4, $5, ${refreshExpirySql(env.refreshTokenTtlDays)})
       returning id`,
      [row.user_id, row.device_id, newHash, row.family_id, row.id]
    );

    const newSessionId = inserted.rows[0].id as string;
    const accessToken = signAccessToken({
      sub: row.user_id,
      sid: newSessionId,
      did: row.device_id,
      typ: "access"
    });

    await client.query("commit");
    await logAudit({
      actorUserId: row.user_id,
      action: "auth.refresh_success",
      entityType: "refresh_tokens",
      entityId: newSessionId,
      payload: { rotatedFrom: row.id, familyId: row.family_id }
    });
    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function logoutByRefreshToken(refreshToken: string) {
  const tokenHash = hashRefreshToken(refreshToken);
  await pool.query(
    "update public.refresh_tokens set revoked_at = now() where token_hash = $1 and revoked_at is null",
    [tokenHash]
  );
  await logAudit({
    action: "auth.logout_by_refresh",
    entityType: "refresh_tokens",
    entityId: tokenHash,
    payload: {}
  });
}

export async function logoutBySessionId(sessionId: string) {
  await pool.query(
    "update public.refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null",
    [sessionId]
  );
  await logAudit({
    action: "auth.logout_by_session",
    entityType: "refresh_tokens",
    entityId: sessionId,
    payload: {}
  });
}

export async function registerDevice(userId: string, device: Required<Omit<DeviceInput, "deviceId">> & { deviceId?: string }) {
  const deviceId = await upsertDevice(userId, device);
  if (!deviceId) {
    throw new HttpError(400, "platform is required");
  }

  const result = await pool.query(
    `select id, user_id, platform, device_name, push_token, app_version, is_active, last_seen
     from public.devices
     where id = $1`,
    [deviceId]
  );
  return result.rows[0];
}

export async function logoutCurrentDevice(userId: string, deviceId: string) {
  await pool.query(
    "update public.refresh_tokens set revoked_at = now() where user_id = $1 and device_id = $2 and revoked_at is null",
    [userId, deviceId]
  );
  await pool.query(
    "update public.devices set is_active = false where id = $1 and user_id = $2",
    [deviceId, userId]
  );
}

export async function logoutAllDevices(userId: string) {
  await pool.query(
    "update public.refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null",
    [userId]
  );
  await pool.query("update public.devices set is_active = false where user_id = $1", [userId]);
}

export async function listActiveSessions(userId: string) {
  const result = await pool.query(
    `select rt.id as session_id, rt.device_id, rt.created_at, rt.expires_at, rt.revoked_at,
            d.platform, d.device_name, d.app_version, d.last_seen, d.is_active as device_active
     from public.refresh_tokens rt
     left join public.devices d on d.id = rt.device_id
     where rt.user_id = $1
     order by rt.created_at desc`,
    [userId]
  );
  return result.rows.map((row) => ({
    sessionId: row.session_id,
    deviceId: row.device_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    device: row.device_id
      ? {
          platform: row.platform,
          deviceName: row.device_name,
          appVersion: row.app_version,
          lastSeen: row.last_seen,
          isActive: row.device_active
        }
      : null
  }));
}

export async function revokeSession(userId: string, sessionId: string) {
  const updated = await pool.query(
    `update public.refresh_tokens
     set revoked_at = now()
     where id = $1 and user_id = $2 and revoked_at is null
     returning id, device_id`,
    [sessionId, userId]
  );
  if (!updated.rowCount) {
    return { success: false, reason: "session_not_found_or_already_revoked" as const };
  }
  const deviceId = updated.rows[0].device_id as string | null;
  if (deviceId) {
    const activeCount = await pool.query(
      "select count(*)::int as cnt from public.refresh_tokens where user_id = $1 and device_id = $2 and revoked_at is null",
      [userId, deviceId]
    );
    if (activeCount.rows[0].cnt === 0) {
      await pool.query("update public.devices set is_active = false where id = $1 and user_id = $2", [deviceId, userId]);
    }
  }
  return { success: true as const };
}
