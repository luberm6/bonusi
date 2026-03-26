import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/pool.js";
import { HttpError } from "../http/error.js";
import { verifyAccessToken } from "../../modules/auth/token.service.js";
import type { UserRole } from "../types/auth.js";

function getBearerToken(req: Request): string {
  const raw = req.headers.authorization;
  if (!raw || !raw.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing bearer token");
  }
  return raw.slice("Bearer ".length);
}

export async function authGuard(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = getBearerToken(req);
    const payload = verifyAccessToken(token);
    if (payload.typ !== "access") {
      throw new HttpError(401, "Invalid token type");
    }

    const result = await pool.query(
      `select id, email, role, is_active
       from public.users
       where id = $1
       limit 1`,
      [payload.sub]
    );
    if (result.rowCount === 0) {
      throw new HttpError(401, "User not found");
    }

    const user = result.rows[0] as {
      id: string;
      email: string;
      role: UserRole;
      is_active: boolean;
    };
    if (!user.is_active) {
      throw new HttpError(403, "User is deactivated");
    }

    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    };
    req.authSessionId = payload.sid;
    req.authDeviceId = payload.did;

    await pool.query(
      "update public.users set last_seen = now() where id = $1 and (last_seen is null or last_seen < now() - interval '2 minutes')",
      [user.id]
    );
    if (payload.did) {
      await pool.query(
        "update public.devices set last_seen = now(), is_active = true where id = $1 and user_id = $2",
        [payload.did, user.id]
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
