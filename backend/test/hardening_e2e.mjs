import { randomUUID } from "crypto";
import pg from "pg";
import { io as ioClient } from "socket.io-client";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:55432/bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const wsBase = process.env.WS_BASE_URL ?? "http://127.0.0.1:4010";
const filesEnabled = process.env.FILES_ENABLED === "true";
const pool = new Pool({ connectionString: dbUrl });

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { method = "GET", token, body, forwardedFor } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function login(email, password, ip) {
  return request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Hardening E2E", appVersion: "1.0.0" }
    }
  });
}

async function run() {
  const report = [];
  const suffix = Date.now();

  const goodLogin = await login("superadmin@example.com", "Passw0rd123", "10.60.0.1");
  assert(goodLogin.status === 200, "super login failed");
  const superAccess = goodLogin.json.accessToken;

  const securityCreateUser = await request("/users", {
    method: "POST",
    token: superAccess,
    body: { email: `audit-hardening-${suffix}@example.com`, password: "Passw0rd123", role: "client" }
  });
  assert(securityCreateUser.status === 201, "user create failed");

  let saw429 = false;
  for (let i = 0; i < 7; i += 1) {
    const bad = await login("superadmin@example.com", "wrong-password", "10.60.0.2");
    if (bad.status === 429) saw429 = true;
  }
  assert(saw429, "expected login rate limiting / brute-force lock to produce 429");
  report.push("rate_limit_login=ok");

  if (filesEnabled) {
    let upload429 = false;
    for (let i = 0; i < 35; i += 1) {
      const up = await request("/chat/attachments/presign", {
        method: "POST",
        token: superAccess,
        body: { fileName: `f-${i}.pdf`, fileType: "application/pdf", size: 1000 }
      });
      if (up.status === 429) {
        upload429 = true;
        break;
      }
    }
    assert(upload429, "expected upload rate limiting to produce 429");
    report.push("rate_limit_upload=ok");
  } else {
    report.push("rate_limit_upload=skipped_files_disabled");
  }

  const users = await request("/users", { token: superAccess });
  const client = users.json.find((u) => u.email === "client@example.com");
  const admin = users.json.find((u) => u.email === "superadmin@example.com");
  assert(client?.id && admin?.id, "missing users for ws test");
  const conv = await pool.query(
    `insert into public.conversations (client_id, admin_id)
     values ($1, $2)
     on conflict (client_id, admin_id)
     do update set updated_at = now()
     returning id`,
    [client.id, admin.id]
  );
  const conversationId = conv.rows[0].id;

  const socket = ioClient(wsBase, {
    auth: { token: superAccess },
    transports: ["polling"]
  });
  await new Promise((resolve) => socket.on("connect", resolve));
  const joinAck = await new Promise((resolve) =>
    socket.emit("conversation:join", { conversationId }, (ack) => resolve(ack))
  );
  assert(joinAck.ok === true, "polling fallback socket join failed");
  socket.close();
  report.push("websocket_polling_fallback=ok");

  const audit = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where action in ('auth.login_success','auth.login_failed','user.create')
       and created_at > now() - interval '20 minutes'
     group by action`
  );
  const auditMap = Object.fromEntries(audit.rows.map((r) => [r.action, r.cnt]));
  assert((auditMap["auth.login_success"] ?? 0) >= 1, "missing auth.login_success audit");
  assert((auditMap["auth.login_failed"] ?? 0) >= 1, "missing auth.login_failed audit");
  assert((auditMap["user.create"] ?? 0) >= 1, "missing user.create audit");
  report.push("audit_log=ok");

  console.log(report.join("\n"));
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
