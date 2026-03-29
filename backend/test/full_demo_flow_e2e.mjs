import { randomUUID } from "crypto";
import pg from "pg";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:55432/bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const pool = new Pool({ connectionString: dbUrl });

async function request(path, { method = "GET", token, body, forwardedFor } = {}) {
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email, password, ip, deviceName) {
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

async function run() {
  const report = [];
  const suffix = Date.now();

  const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.60.0.1", "Demo Flow Super");

  const adminEmail = `demo-admin-${suffix}@example.com`;
  const clientEmail = `demo-client-${suffix}@example.com`;

  const adminCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: adminEmail,
      password: "Passw0rd123",
      role: "admin",
      fullName: "Demo Admin"
    }
  });
  assert(adminCreate.status === 201, `admin create failed: ${adminCreate.status}`);
  const adminId = adminCreate.json.id;
  report.push(`admin_create=${adminCreate.status}`);

  const clientCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: clientEmail,
      password: "Passw0rd123",
      role: "client",
      fullName: "Demo Client"
    }
  });
  assert(clientCreate.status === 201, `client create failed: ${clientCreate.status}`);
  const clientId = clientCreate.json.id;
  report.push(`client_create=${clientCreate.status}`);

  const adminAccess = await login(adminEmail, "Passw0rd123", "10.60.0.2", "Demo Flow Admin");

  const branchCreate = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Demo Branch ${suffix}`,
      address: "1 Demo Street, New York, NY",
      lat: 40.7128,
      lng: -74.006,
      phone: "+15550001111",
      workHours: { weekdays: "09:00-19:00" },
      description: "Primary demo branch",
      isActive: true
    }
  });
  assert(branchCreate.status === 201, `branch create failed: ${branchCreate.status}`);
  const branchId = branchCreate.json.id;
  report.push(`branch_create=${branchCreate.status}`);

  const serviceCreate = await request("/services", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Demo Service ${suffix}`,
      description: "Demo service",
      basePrice: 120,
      isActive: true
    }
  });
  assert(serviceCreate.status === 201, `service create failed: ${serviceCreate.status}`);
  const serviceId = serviceCreate.json.id;
  report.push(`service_create=${serviceCreate.status}`);

  const visitCreate = await request("/visits", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId,
      branchId,
      visitDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      discountAmount: 0,
      comment: "End-to-end demo visit",
      services: [{ serviceId, quantity: 1 }]
    }
  });
  assert(visitCreate.status === 201, `visit create failed: ${visitCreate.status}`);
  const visitId = visitCreate.json.id;
  report.push(`visit_create=${visitCreate.status}`);

  const accrual = await request("/bonuses/accrual", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId,
      visitId,
      amount: 100,
      comment: "Demo bonus accrual"
    }
  });
  assert(accrual.status === 201, `bonus accrual failed: ${accrual.status}`);
  assert(Math.abs(accrual.json.balance - 100) < 0.001, `expected bonus balance 100, got ${accrual.json.balance}`);
  report.push(`bonus_accrual=${accrual.status}`);

  const clientAccess = await login(clientEmail, "Passw0rd123", "10.60.0.3", "Demo Flow Client");

  const clientBalance = await request("/bonuses/balance", { token: clientAccess });
  assert(clientBalance.status === 200, `client balance failed: ${clientBalance.status}`);
  assert(Math.abs(clientBalance.json.balance - 100) < 0.001, `client sees wrong balance ${clientBalance.json.balance}`);
  report.push(`client_balance=${clientBalance.status}`);

  const clientVisits = await request("/visits", { token: clientAccess });
  assert(clientVisits.status === 200, `client visits failed: ${clientVisits.status}`);
  assert(clientVisits.json.some((visit) => visit.id === visitId), "client does not see created visit");
  report.push(`client_visits=${clientVisits.status}`);

  const conversationInsert = await pool.query(
    `insert into public.conversations (client_id, admin_id)
     values ($1, $2)
     on conflict (client_id, admin_id)
     do update set updated_at = now()
     returning id`,
    [clientId, adminId]
  );
  const conversationId = conversationInsert.rows[0].id;

  const clientMessageId = randomUUID();
  const clientSend = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    token: clientAccess,
    body: {
      clientMessageId,
      text: "Добрый день, хочу уточнить статус визита"
    }
  });
  assert(clientSend.status === 201, `client chat send failed: ${clientSend.status}`);
  report.push(`client_chat_send=${clientSend.status}`);

  const adminReplyId = randomUUID();
  const adminReply = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    token: adminAccess,
    body: {
      clientMessageId: adminReplyId,
      text: "Добрый день, ваш визит подтвержден"
    }
  });
  assert(adminReply.status === 201, `admin chat reply failed: ${adminReply.status}`);
  report.push(`admin_chat_reply=${adminReply.status}`);

  const clientMessages = await request(`/chat/conversations/${conversationId}/messages`, {
    token: clientAccess
  });
  assert(clientMessages.status === 200, `client message history failed: ${clientMessages.status}`);
  assert(
    clientMessages.json.some((message) => message.clientMessageId === adminReplyId),
    "client does not see admin reply in chat history"
  );
  report.push(`client_chat_history=${clientMessages.status}`);

  const auditRows = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where created_at > now() - interval '20 minutes'
       and (
        entity_id = any($1::text[])
         or action in ('service.create', 'visit.create', 'bonus.accrual')
       )
     group by action
     order by action`,
    [[adminId, clientId, serviceId, visitId]]
  );
  const audit = Object.fromEntries(auditRows.rows.map((row) => [row.action, row.cnt]));
  assert((audit["user.create"] ?? 0) >= 2, "missing user.create audit in full flow");
  assert((audit["service.create"] ?? 0) >= 1, "missing service.create audit in full flow");
  assert((audit["visit.create"] ?? 0) >= 1, "missing visit.create audit in full flow");
  assert((audit["bonus.accrual"] ?? 0) >= 1, "missing bonus.accrual audit in full flow");
  report.push(
    `audit_ok=user.create:${audit["user.create"] ?? 0},service.create:${audit["service.create"] ?? 0},visit.create:${audit["visit.create"] ?? 0},bonus.accrual:${audit["bonus.accrual"] ?? 0}`
  );

  console.log(report.join("\n"));
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
    process.exit(process.exitCode ?? 0);
  });
