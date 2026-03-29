import pg from "pg";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql:///bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const pool = new Pool({ connectionString: dbUrl });
const BONUS_SETTINGS_LOCK_KEY = "e2e_bonus_settings_global";

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

async function login(email, password, ip) {
  const res = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Visits Auto Bonus E2E", appVersion: "1.0.0" }
    }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

async function createClient(superAccess, suffix, label) {
  const email = `auto-bonus-${label}-${suffix}@example.com`;
  const create = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email,
      password: "Passw0rd123",
      role: "client",
      fullName: `Auto Bonus ${label}`
    }
  });
  assert(create.status === 201, `client create failed for ${label}: ${create.status}`);
  return { id: create.json.id, email };
}

async function run() {
  const report = [];
  const suffix = Date.now();
  const lockClient = await pool.connect();

  try {
    await lockClient.query("select pg_advisory_lock(hashtext($1))", [BONUS_SETTINGS_LOCK_KEY]);
    const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.80.0.1");

  const branch = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Auto Bonus Branch ${suffix}`,
      address: "400 Auto Bonus Ave, New York, NY",
      lat: 40.73061,
      lng: -73.935242,
      isActive: true
    }
  });
  assert(branch.status === 201, `branch create failed: ${branch.status}`);

  const service = await request("/services", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Auto Bonus Service ${suffix}`,
      basePrice: 235,
      isActive: true
    }
  });
  assert(service.status === 201, `service create failed: ${service.status}`);

  const percentageClient = await createClient(superAccess, suffix, "percentage");
  const fixedClient = await createClient(superAccess, suffix, "fixed");

  const percentageSettings = await request("/bonus-settings", {
    method: "PUT",
    token: superAccess,
    body: { accrualMode: "percentage", percentageValue: 10, fixedValue: null }
  });
  assert(percentageSettings.status === 200, `percentage settings failed: ${percentageSettings.status}`);
  report.push(`bonus_settings_percentage=${percentageSettings.status}`);

  const percentageVisit = await request("/visits", {
    method: "POST",
    token: superAccess,
    body: {
      clientId: percentageClient.id,
      branchId: branch.json.id,
      visitDate: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      discountAmount: 0,
      services: [{ serviceId: service.json.id, quantity: 1 }]
    }
  });
  assert(percentageVisit.status === 201, `percentage visit failed: ${percentageVisit.status}`);
  assert(percentageVisit.json.bonusAccrualAmount === 23, `expected percentage auto bonus 23, got ${percentageVisit.json.bonusAccrualAmount}`);
  report.push(`visit_percentage=${percentageVisit.status}`);

  const percentageBalance = await request(`/bonuses/balance?client_id=${percentageClient.id}`, { token: superAccess });
  assert(percentageBalance.status === 200, `percentage balance failed: ${percentageBalance.status}`);
  assert(Math.abs(percentageBalance.json.balance - 23) < 0.001, `expected percentage balance 23, got ${percentageBalance.json.balance}`);

  const fixedSettings = await request("/bonus-settings", {
    method: "PUT",
    token: superAccess,
    body: { accrualMode: "fixed", percentageValue: null, fixedValue: 40 }
  });
  assert(fixedSettings.status === 200, `fixed settings failed: ${fixedSettings.status}`);
  report.push(`bonus_settings_fixed=${fixedSettings.status}`);

  const fixedVisit = await request("/visits", {
    method: "POST",
    token: superAccess,
    body: {
      clientId: fixedClient.id,
      branchId: branch.json.id,
      visitDate: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      discountAmount: 15,
      services: [{ serviceId: service.json.id, quantity: 1 }]
    }
  });
  assert(fixedVisit.status === 201, `fixed visit failed: ${fixedVisit.status}`);
  assert(fixedVisit.json.finalAmount === 220, `expected fixed visit finalAmount 220, got ${fixedVisit.json.finalAmount}`);
  assert(fixedVisit.json.bonusAccrualAmount === 40, `expected fixed auto bonus 40, got ${fixedVisit.json.bonusAccrualAmount}`);
  report.push(`visit_fixed=${fixedVisit.status}`);

  const fixedBalance = await request(`/bonuses/balance?client_id=${fixedClient.id}`, { token: superAccess });
  assert(fixedBalance.status === 200, `fixed balance failed: ${fixedBalance.status}`);
  assert(Math.abs(fixedBalance.json.balance - 40) < 0.001, `expected fixed balance 40, got ${fixedBalance.json.balance}`);

  const history = await request(`/bonuses/history?client_id=${fixedClient.id}`, { token: superAccess });
  assert(history.status === 200, `fixed history failed: ${history.status}`);
  assert(
    history.json.some(
      (tx) => tx.type === "accrual" && tx.isAuto === true && tx.visitId === fixedVisit.json.id && Number(tx.amount) === 40
    ),
    "fixed auto accrual history entry missing"
  );
  assert(
    history.json.some((tx) => typeof tx.comment === "string" && tx.comment.includes(fixedVisit.json.id.slice(0, 8))),
    "auto accrual comment missing visit reference"
  );

  const autoCount = await pool.query(
    `select count(*)::int as cnt
     from public.bonus_transactions
     where visit_id = $1 and type = 'accrual' and is_auto = true`,
    [fixedVisit.json.id]
  );
  assert(autoCount.rows[0].cnt === 1, `expected one auto accrual per visit, got ${autoCount.rows[0].cnt}`);
  report.push(`single_auto_accrual=${autoCount.rows[0].cnt}`);

  const auditRows = await pool.query(
    `select count(*)::int as cnt
     from public.audit_logs
     where action = 'bonus.accrual.auto'
       and created_at > now() - interval '20 minutes'`
  );
  assert(auditRows.rows[0].cnt >= 2, `expected bonus.accrual.auto audit rows, got ${auditRows.rows[0].cnt}`);
  report.push(`audit_bonus_auto=${auditRows.rows[0].cnt}`);

    console.log(report.join("\n"));
  } finally {
    await lockClient.query("select pg_advisory_unlock(hashtext($1))", [BONUS_SETTINGS_LOCK_KEY]);
    lockClient.release();
  }
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
