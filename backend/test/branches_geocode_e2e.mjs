import { createHash } from "crypto";
import pg from "pg";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:55432/bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const expectNominatimDown = process.env.EXPECT_NOMINATIM_DOWN === "1";

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

function queryHash(address) {
  const normalized = address.trim().replace(/\s+/g, " ").toLowerCase();
  return createHash("sha256").update(normalized).digest("hex");
}

async function login(email, password, ip) {
  const response = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Branches E2E", appVersion: "1.0.0" }
    }
  });
  assert(response.status === 200, `login failed for ${email}: ${response.status}`);
  return response.json.accessToken;
}

async function run() {
  const report = [];
  const suffix = Date.now();

  const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.20.30.1");
  const clientAccess = await login("client@example.com", "Passw0rd123", "10.20.30.2");

  const branchCreate = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Main Branch ${suffix}`,
      address: "11 Wall St, New York, NY",
      lat: 40.707490,
      lng: -74.011270,
      phone: "+1-555-0199",
      workHours: { mon_fri: "09:00-20:00", sat: "10:00-16:00" },
      description: "Primary branch from e2e",
      isActive: true
    }
  });
  assert(branchCreate.status === 201, `branch create failed: ${branchCreate.status}`);
  const branchId = branchCreate.json.id;
  report.push(`branch_create=${branchCreate.status}`);

  const branchGet = await request(`/branches/${branchId}`, { token: superAccess });
  assert(branchGet.status === 200, `branch get failed: ${branchGet.status}`);
  report.push(`branch_get=${branchGet.status}`);

  const branchPatch = await request(`/branches/${branchId}`, {
    method: "PATCH",
    token: superAccess,
    body: {
      description: "Manual coordinate correction",
      lat: 40.707600,
      lng: -74.011100
    }
  });
  assert(branchPatch.status === 200, `branch patch failed: ${branchPatch.status}`);
  assert(Number(branchPatch.json.lat) === 40.7076, "manual lat correction not applied");
  report.push(`branch_patch_manual_coords=${branchPatch.status}`);

  const branchListSuper = await request("/branches", { token: superAccess });
  assert(branchListSuper.status === 200, `branch list (super) failed: ${branchListSuper.status}`);
  assert(branchListSuper.json.some((b) => b.id === branchId), "created branch missing from super list");
  report.push(`branch_list_super=${branchListSuper.status}`);

  const validAddress = "Times Square, New York, NY";
  const qHash = queryHash(validAddress);
  await pool.query("delete from public.geocode_cache where source='nominatim' and query_hash=$1", [qHash]);

  const geocode1 = await request("/geocode", {
    method: "POST",
    token: superAccess,
    body: { address: validAddress }
  });

  if (expectNominatimDown) {
    assert(geocode1.status === 503, `expected 503 when nominatim is down, got ${geocode1.status}`);
    report.push(`geocode_nominatim_down=${geocode1.status}`);
  } else {
    assert(geocode1.status === 200, `valid geocode failed: ${geocode1.status}`);
    assert(geocode1.json.cached === false, "first geocode should be cache miss");
    report.push(`geocode_valid_first=${geocode1.status}`);

    const geocode2 = await request("/geocode", {
      method: "POST",
      token: superAccess,
      body: { address: validAddress }
    });
    assert(geocode2.status === 200, `cached geocode failed: ${geocode2.status}`);
    assert(geocode2.json.cached === true, "second geocode should be cache hit");
    report.push(`geocode_cached_second=${geocode2.status}`);

    const cacheCount = await pool.query(
      "select count(*)::int as cnt from public.geocode_cache where source='nominatim' and query_hash=$1",
      [qHash]
    );
    assert(cacheCount.rows[0].cnt >= 1, "geocode cache row missing");
    report.push(`geocode_cache_rows=${cacheCount.rows[0].cnt}`);

    const geocodeInvalid = await request("/geocode", {
      method: "POST",
      token: superAccess,
      body: { address: `zxqv-nonexistent-address-${suffix}-noresult` }
    });
    assert(
      geocodeInvalid.status === 404 || geocodeInvalid.status === 503,
      `invalid geocode expected 404/503, got ${geocodeInvalid.status}`
    );
    report.push(`geocode_invalid_status=${geocodeInvalid.status}`);
  }

  const deactivate = await request(`/branches/${branchId}/deactivate`, {
    method: "PATCH",
    token: superAccess
  });
  assert(deactivate.status === 200, `branch deactivate failed: ${deactivate.status}`);
  report.push(`branch_deactivate=${deactivate.status}`);

  const branchListClient = await request("/branches", { token: clientAccess });
  assert(branchListClient.status === 200, `branch list (client) failed: ${branchListClient.status}`);
  assert(!branchListClient.json.some((b) => b.id === branchId), "client should not see inactive branch");
  report.push(`branch_list_client_active_only=${branchListClient.status}`);

  const auditCounts = await pool.query(
    `select action, count(*)::int as cnt
     from public.audit_logs
     where action in ('branch.create','branch.update','branch.deactivate')
       and created_at > now() - interval '20 minutes'
     group by action
     order by action`
  );
  const actions = Object.fromEntries(auditCounts.rows.map((r) => [r.action, r.cnt]));
  assert((actions["branch.create"] ?? 0) >= 1, "missing branch.create audit");
  assert((actions["branch.update"] ?? 0) >= 1, "missing branch.update audit");
  assert((actions["branch.deactivate"] ?? 0) >= 1, "missing branch.deactivate audit");
  report.push(
    `audit_branch_create=${actions["branch.create"] ?? 0},audit_branch_update=${actions["branch.update"] ?? 0},audit_branch_deactivate=${actions["branch.deactivate"] ?? 0}`
  );

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
