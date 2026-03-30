import pg from "pg";
import { requireEnvUrl } from "./require-env-url.mjs";

const { Pool } = pg;

export const dbUrl = process.env.DATABASE_URL ?? "postgresql:///bonusi_dev";
export const apiBase = requireEnvUrl("API_BASE_URL");

export function createTestPool() {
  return new Pool({ connectionString: dbUrl });
}

export async function request(path, { method = "GET", token, body, forwardedFor } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

  const response = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: response.status, json };
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function login(email, password, ip, deviceName) {
  const res = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName, appVersion: "1.0.0" }
    }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

export async function withAdvisoryLock(pool, key, callback) {
  const client = await pool.connect();
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [key]);
    return await callback(client);
  } finally {
    await client.query("select pg_advisory_unlock(hashtext($1))", [key]);
    client.release();
  }
}
