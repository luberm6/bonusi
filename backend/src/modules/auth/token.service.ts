import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../common/config/env.js";
import type { AccessTokenPayload } from "../../common/types/auth.js";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwtAccessSecret, {
    algorithm: "HS256",
    expiresIn: env.accessTokenTtl as jwt.SignOptions["expiresIn"]
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function createRawRefreshToken(): string {
  return crypto.randomBytes(48).toString("base64url");
}

export function hashRefreshToken(rawToken: string): string {
  return crypto
    .createHmac("sha256", env.jwtRefreshSecret)
    .update(rawToken)
    .digest("hex");
}
