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

function isoShift(hours = 1) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

async function login(email, password, ip) {
  const res = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Services Visits E2E", appVersion: "1.0.0" }
    }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

async function run() {
  const report = [];
  const suffix = Date.now();
  const lockClient = await pool.connect();

  try {
    await lockClient.query("select pg_advisory_lock(hashtext($1))", [BONUS_SETTINGS_LOCK_KEY]);

    const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.30.0.1");
    const bonusSettings = await request("/bonus-settings", {
      method: "PUT",
      token: superAccess,
      body: { accrualMode: "percentage", percentageValue: 5, fixedValue: null }
    });
    assert(bonusSettings.status === 200, `bonus settings update failed: ${bonusSettings.status}`);
    report.push(`bonus_settings_percentage=${bonusSettings.status}`);

  const visitClientEmail = `visit-client-${suffix}@example.com`;
  const createClient = await request("/users", {
    method: "POST",
    token: superAccess,
    body: { email: visitClientEmail, password: "Passw0rd123", role: "client", fullName: "Visit Client" }
  });
  assert(createClient.status === 201, `create client failed: ${createClient.status}`);
  const clientId = createClient.json.id;
  report.push(`create_client=${createClient.status}`);

  const newAdminEmail = `visit-admin-${suffix}@example.com`;
  const createAdmin = await request("/users", {
    method: "POST",
    token: superAccess,
    body: { email: newAdminEmail, password: "Passw0rd123", role: "admin", fullName: "Visit Admin" }
  });
  assert(createAdmin.status === 201, `create admin failed: ${createAdmin.status}`);
  report.push(`create_admin=${createAdmin.status}`);

  const adminAccess = await login(newAdminEmail, "Passw0rd123", "10.30.0.2");

  const branch = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Visit Branch ${suffix}`,
      address: "350 5th Ave, New York, NY",
      lat: 40.7484,
      lng: -73.9857,
      isActive: true
    }
  });
  assert(branch.status === 201, `branch create failed: ${branch.status}`);
  const branchId = branch.json.id;

  const serviceA = await request("/services", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Oil Change ${suffix}`,
      description: "Oil + filter",
      basePrice: 100,
      isActive: true
    }
  });
  assert(serviceA.status === 201, `service A create failed: ${serviceA.status}`);
  report.push(`service_create_a=${serviceA.status}`);

  const serviceB = await request("/services", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Tire Rotation ${suffix}`,
      description: "Rotate tires",
      basePrice: 50,
      isActive: true
    }
  });
  assert(serviceB.status === 201, `service B create failed: ${serviceB.status}`);
  report.push(`service_create_b=${serviceB.status}`);

  const servicePatch = await request(`/services/${serviceB.json.id}`, {
    method: "PATCH",
    token: superAccess,
    body: { basePrice: 55, description: "Rotate tires (updated)" }
  });
  assert(servicePatch.status === 200, `service patch failed: ${servicePatch.status}`);
  report.push(`service_patch=${servicePatch.status}`);

  const servicesList = await request("/services", { token: superAccess });
  assert(servicesList.status === 200, `services list failed: ${servicesList.status}`);
  assert(servicesList.json.some((s) => s.id === serviceA.json.id), "service A missing in list");
  report.push(`service_list=${servicesList.status}`);

  const visitCreate = await request("/visits", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId,
      branchId,
      visitDate: isoShift(2),
      discountAmount: 25,
      comment: "Multi-service visit",
      services: [
        { serviceId: serviceA.json.id, quantity: 2 },
        { serviceId: serviceB.json.id, quantity: 1.5, price: 50 }
      ]
    }
  });
  assert(visitCreate.status === 201, `visit create failed: ${visitCreate.status}`);
  report.push(`visit_create=${visitCreate.status}`);

  const visit = visitCreate.json;
  assert(visit.services.length === 2, "visit services count mismatch");
  assert(Math.abs(visit.totalAmount - 275) < 0.001, `totalAmount expected 275, got ${visit.totalAmount}`);
  assert(Math.abs(visit.finalAmount - 250) < 0.001, `finalAmount expected 250, got ${visit.finalAmount}`);
  assert(Math.abs(visit.discountAmount - 25) < 0.001, `discountAmount expected 25, got ${visit.discountAmount}`);
  assert(visit.bonusAccrualAmount === 12, `bonusAccrualAmount expected 12, got ${visit.bonusAccrualAmount}`);
  report.push(`visit_amounts_ok=true`);

  const snapshotNames = visit.services.map((s) => s.serviceNameSnapshot);
  assert(snapshotNames.includes(`Oil Change ${suffix}`), "service snapshot name A missing");
  assert(snapshotNames.includes(`Tire Rotation ${suffix}`), "service snapshot name B missing");
  report.push(`visit_snapshot_ok=true`);

  const visitGet = await request(`/visits/${visit.id}`, { token: adminAccess });
  assert(visitGet.status === 200, `visit get failed: ${visitGet.status}`);
  report.push(`visit_get=${visitGet.status}`);

  const filterByClient = await request(`/visits?clientId=${clientId}`, { token: superAccess });
  assert(filterByClient.status === 200, `visit filter client failed: ${filterByClient.status}`);
  assert(filterByClient.json.some((v) => v.id === visit.id), "visit missing in client filter");

  const filterByBranch = await request(`/visits?branchId=${branchId}`, { token: superAccess });
  assert(filterByBranch.status === 200, `visit filter branch failed: ${filterByBranch.status}`);
  assert(filterByBranch.json.some((v) => v.id === visit.id), "visit missing in branch filter");

  const adminId = createAdmin.json.id;
  const filterByAdmin = await request(`/visits?adminId=${adminId}`, { token: superAccess });
  assert(filterByAdmin.status === 200, `visit filter admin failed: ${filterByAdmin.status}`);
  assert(filterByAdmin.json.some((v) => v.id === visit.id), "visit missing in admin filter");

  const dateFrom = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const dateTo = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const filterByDate = await request(`/visits?dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`, {
    token: superAccess
  });
  assert(filterByDate.status === 200, `visit filter date failed: ${filterByDate.status}`);
  assert(filterByDate.json.some((v) => v.id === visit.id), "visit missing in date filter");
  report.push(`visit_filters_ok=true`);

  const badDiscount = await request("/visits", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId,
      branchId,
      visitDate: isoShift(3),
      discountAmount: 9999,
      services: [{ serviceId: serviceA.json.id, quantity: 1 }]
    }
  });
  assert(badDiscount.status === 400, `discount guard should fail with 400, got ${badDiscount.status}`);
  report.push(`visit_discount_guard=${badDiscount.status}`);

  const bonusBalance = await request(`/bonuses/balance?client_id=${clientId}`, { token: superAccess });
  assert(bonusBalance.status === 200, `bonus balance failed: ${bonusBalance.status}`);
  assert(Math.abs(bonusBalance.json.balance - 12) < 0.001, `expected auto bonus balance 12, got ${bonusBalance.json.balance}`);

  const bonusHistory = await request(`/bonuses/history?client_id=${clientId}`, { token: superAccess });
  assert(bonusHistory.status === 200, `bonus history failed: ${bonusHistory.status}`);
  assert(
    bonusHistory.json.some((tx) => tx.type === "accrual" && tx.isAuto === true && Number(tx.amount) === 12 && tx.visitId === visit.id),
    "auto accrual history entry missing"
  );
  report.push(`visit_auto_bonus_ok=true`);

  const auditRows = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where action in ('service.create','service.update','visit.create','bonus.accrual.auto')
       and created_at > now() - interval '20 minutes'
     group by action order by action`
  );
  const audit = Object.fromEntries(auditRows.rows.map((r) => [r.action, r.cnt]));
  assert((audit["service.create"] ?? 0) >= 2, "missing service.create audit");
  assert((audit["service.update"] ?? 0) >= 1, "missing service.update audit");
  assert((audit["visit.create"] ?? 0) >= 1, "missing visit.create audit");
  assert((audit["bonus.accrual.auto"] ?? 0) >= 1, "missing bonus.accrual.auto audit");
  report.push(
    `audit_service_create=${audit["service.create"] ?? 0},audit_service_update=${audit["service.update"] ?? 0},audit_visit_create=${audit["visit.create"] ?? 0},audit_bonus_auto=${audit["bonus.accrual.auto"] ?? 0}`
  );

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
