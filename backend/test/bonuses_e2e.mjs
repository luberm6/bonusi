import pg from "pg";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:55432/bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const pool = new Pool({ connectionString: dbUrl });

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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email, password, ip) {
  const res = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Bonuses E2E", appVersion: "1.0.0" }
    }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

async function run() {
  const report = [];
  const suffix = Date.now();

  const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.40.0.1");
  const clientAccess = await login("client@example.com", "Passw0rd123", "10.40.0.2");

  const users = await request("/users", { token: superAccess });
  const client = users.json.find((u) => u.email === "client@example.com");
  assert(client?.id, "client user missing");
  const clientId = client.id;

  const branch = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Bonus Branch ${suffix}`,
      address: "200 Broadway, New York, NY",
      lat: 40.7101,
      lng: -74.0089,
      isActive: true
    }
  });
  assert(branch.status === 201, `branch create failed: ${branch.status}`);

  const service = await request("/services", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Bonus Service ${suffix}`,
      basePrice: 120,
      isActive: true
    }
  });
  assert(service.status === 201, `service create failed: ${service.status}`);

  const visit = await request("/visits", {
    method: "POST",
    token: superAccess,
    body: {
      clientId,
      branchId: branch.json.id,
      visitDate: new Date(Date.now() + 3600 * 1000).toISOString(),
      discountAmount: 0,
      services: [{ serviceId: service.json.id, quantity: 1 }]
    }
  });
  assert(visit.status === 201, `visit create failed: ${visit.status}`);
  const visitId = visit.json.id;

  const accrual = await request("/bonuses/accrual", {
    method: "POST",
    token: superAccess,
    body: {
      clientId,
      visitId,
      amount: 100,
      comment: "Manual bonus accrual"
    }
  });
  assert(accrual.status === 201, `accrual failed: ${accrual.status}`);
  assert(Math.abs(accrual.json.balance - 100) < 0.001, `balance after accrual expected 100 got ${accrual.json.balance}`);
  report.push(`bonus_accrual=${accrual.status}`);

  const writeoff = await request("/bonuses/writeoff", {
    method: "POST",
    token: superAccess,
    body: {
      clientId,
      visitId,
      amount: 30,
      comment: "Manual writeoff as discount"
    }
  });
  assert(writeoff.status === 201, `writeoff failed: ${writeoff.status}`);
  assert(Math.abs(writeoff.json.balance - 70) < 0.001, `balance after writeoff expected 70 got ${writeoff.json.balance}`);
  report.push(`bonus_writeoff=${writeoff.status}`);

  const overWriteoff = await request("/bonuses/writeoff", {
    method: "POST",
    token: superAccess,
    body: {
      clientId,
      amount: 1000,
      comment: "Should fail"
    }
  });
  assert(overWriteoff.status === 400, `over writeoff should be 400, got ${overWriteoff.status}`);
  report.push(`bonus_writeoff_overdraft_guard=${overWriteoff.status}`);

  const balance = await request(`/bonuses/balance?client_id=${clientId}`, { token: superAccess });
  assert(balance.status === 200, `balance endpoint failed: ${balance.status}`);
  assert(Math.abs(balance.json.balance - 70) < 0.001, `balance endpoint expected 70 got ${balance.json.balance}`);
  report.push(`bonus_balance=${balance.status}`);

  const history = await request(`/bonuses/history?client_id=${clientId}`, { token: superAccess });
  assert(history.status === 200, `history failed: ${history.status}`);
  const hasAccrual = history.json.some((tx) => tx.type === "accrual" && Number(tx.amount) === 100);
  const hasWriteoff = history.json.some((tx) => tx.type === "writeoff" && Number(tx.amount) === 30);
  assert(hasAccrual && hasWriteoff, "history does not include expected operations");
  report.push(`bonus_history=${history.status}`);

  const clientBalanceOwn = await request("/bonuses/balance", { token: clientAccess });
  assert(clientBalanceOwn.status === 200, `client own balance failed: ${clientBalanceOwn.status}`);

  const clientForeignHistory = await request(`/bonuses/history?client_id=${branch.json.id}`, { token: clientAccess });
  assert(clientForeignHistory.status === 403, `client foreign history should be 403, got ${clientForeignHistory.status}`);
  report.push(`client_bonus_forbidden=${clientForeignHistory.status}`);

  const visitCheck = await request(`/visits/${visitId}`, { token: superAccess });
  assert(visitCheck.status === 200, `visit check failed: ${visitCheck.status}`);
  assert(Math.abs(visitCheck.json.discountAmount - 30) < 0.001, "visit discount was not updated by writeoff");
  assert(Math.abs(visitCheck.json.finalAmount - 90) < 0.001, "visit final amount mismatch after writeoff");
  report.push(`visit_discount_from_writeoff_ok=true`);

  const auditRows = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where action in ('bonus.accrual','bonus.writeoff')
       and created_at > now() - interval '20 minutes'
     group by action order by action`
  );
  const audit = Object.fromEntries(auditRows.rows.map((r) => [r.action, r.cnt]));
  assert((audit["bonus.accrual"] ?? 0) >= 1, "missing bonus.accrual audit");
  assert((audit["bonus.writeoff"] ?? 0) >= 1, "missing bonus.writeoff audit");
  report.push(`audit_bonus_accrual=${audit["bonus.accrual"] ?? 0},audit_bonus_writeoff=${audit["bonus.writeoff"] ?? 0}`);

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
