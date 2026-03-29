import { apiBase, assert, createTestPool, login, request, withAdvisoryLock } from "./helpers/runtime.mjs";

const pool = createTestPool();
const BONUS_SETTINGS_LOCK_KEY = "e2e_bonus_settings_global";

async function run() {
  const report = [];
  const suffix = Date.now();

  await withAdvisoryLock(pool, BONUS_SETTINGS_LOCK_KEY, async () => {
    const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.70.0.1", "Bonus Settings Super");

  const adminEmail = `bonus-settings-admin-${suffix}@example.com`;
  const clientEmail = `bonus-settings-client-${suffix}@example.com`;

  const adminCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: adminEmail,
      password: "Passw0rd123",
      role: "admin",
      fullName: "Bonus Settings Admin"
    }
  });
  assert(adminCreate.status === 201, `admin create failed: ${adminCreate.status}`);
  report.push(`admin_create=${adminCreate.status}`);

  const clientCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: clientEmail,
      password: "Passw0rd123",
      role: "client",
      fullName: "Bonus Settings Client"
    }
  });
  assert(clientCreate.status === 201, `client create failed: ${clientCreate.status}`);
  report.push(`client_create=${clientCreate.status}`);

  const adminAccess = await login(adminEmail, "Passw0rd123", "10.70.0.2", "Bonus Settings Admin");
  const clientAccess = await login(clientEmail, "Passw0rd123", "10.70.0.3", "Bonus Settings Client");

  const initial = await request("/bonus-settings", { token: adminAccess });
  assert(initial.status === 200, `get bonus settings failed: ${initial.status}`);
  assert(initial.json.isActive === true, "initial bonus settings must be active");
  report.push(`get_settings=${initial.status}`);

  const percentageUpdate = await request("/bonus-settings", {
    method: "PUT",
    token: adminAccess,
    body: {
      accrualMode: "percentage",
      percentageValue: 7.5,
      fixedValue: null
    }
  });
  assert(percentageUpdate.status === 200, `percentage update failed: ${percentageUpdate.status}`);
  assert(percentageUpdate.json.accrualMode === "percentage", "expected percentage mode");
  assert(Number(percentageUpdate.json.percentageValue) === 7.5, "expected percentage value 7.5");
  report.push(`put_percentage=${percentageUpdate.status}`);

  const fixedUpdate = await request("/bonus-settings", {
    method: "PUT",
    token: superAccess,
    body: {
      accrualMode: "fixed",
      percentageValue: null,
      fixedValue: 100
    }
  });
  assert(fixedUpdate.status === 200, `fixed update failed: ${fixedUpdate.status}`);
  assert(fixedUpdate.json.accrualMode === "fixed", "expected fixed mode");
  assert(Number(fixedUpdate.json.fixedValue) === 100, "expected fixed value 100");
  report.push(`put_fixed=${fixedUpdate.status}`);

  const invalidCombo = await request("/bonus-settings", {
    method: "PUT",
    token: adminAccess,
    body: {
      accrualMode: "fixed",
      percentageValue: 5,
      fixedValue: 50
    }
  });
  assert(invalidCombo.status === 400, `invalid combo expected 400, got ${invalidCombo.status}`);
  report.push(`invalid_combo_guard=${invalidCombo.status}`);

  const invalidValue = await request("/bonus-settings", {
    method: "PUT",
    token: adminAccess,
    body: {
      accrualMode: "percentage",
      percentageValue: 0,
      fixedValue: null
    }
  });
  assert(invalidValue.status === 400, `invalid value expected 400, got ${invalidValue.status}`);
  report.push(`invalid_value_guard=${invalidValue.status}`);

  const clientGet = await request("/bonus-settings", { token: clientAccess });
  assert(clientGet.status === 403, `client get expected 403, got ${clientGet.status}`);
  const clientPut = await request("/bonus-settings", {
    method: "PUT",
    token: clientAccess,
    body: {
      accrualMode: "fixed",
      fixedValue: 10,
      percentageValue: null
    }
  });
  assert(clientPut.status === 403, `client put expected 403, got ${clientPut.status}`);
  report.push(`client_guard_get=${clientGet.status},client_guard_put=${clientPut.status}`);

  const activeRows = await pool.query(
    "select count(*)::int as cnt from public.bonus_settings where is_active = true"
  );
  assert(activeRows.rows[0].cnt === 1, `expected exactly one active row, got ${activeRows.rows[0].cnt}`);
  report.push(`single_active=${activeRows.rows[0].cnt}`);

  const auditRows = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where created_at > now() - interval '20 minutes'
       and action = 'bonus_settings.update'
     group by action`
  );
  const auditCount = auditRows.rows[0]?.cnt ?? 0;
  assert(auditCount >= 2, `missing bonus_settings.update audit, got ${auditCount}`);
  report.push(`audit_bonus_settings_update=${auditCount}`);
  });

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
