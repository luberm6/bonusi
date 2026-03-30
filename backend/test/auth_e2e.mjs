import { requireEnvUrl } from "./helpers/require-env-url.mjs";

const baseUrl = requireEnvUrl("API_BASE_URL");

async function request(path, { method = "GET", body, token, forwardedFor } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  if (forwardedFor) {
    headers["x-forwarded-for"] = forwardedFor;
  }

  const response = await fetch(`${baseUrl}${path}`, {
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
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const report = [];
  const createdAdminEmail = `new-admin-${Date.now()}@example.com`;

  const loginOk = await request("/auth/login", {
    method: "POST",
    body: {
      email: "superadmin@example.com",
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "E2E Browser", appVersion: "1.0.0", pushToken: "e2e-token-web" }
    },
    forwardedFor: "10.0.0.1"
  });
  assert(loginOk.status === 200, `Expected login 200, got ${loginOk.status}`);
  assert(loginOk.json?.accessToken && loginOk.json?.refreshToken, "Login tokens missing");
  report.push(`login_success=${loginOk.status}`);
  const refresh1 = loginOk.json.refreshToken;
  const access1 = loginOk.json.accessToken;

  const loginBad = await request("/auth/login", {
    method: "POST",
    body: { email: "superadmin@example.com", password: "wrong-password" },
    forwardedFor: "10.0.0.2"
  });
  assert(loginBad.status === 401, `Expected bad login 401, got ${loginBad.status}`);
  report.push(`login_fail=${loginBad.status}`);

  const refreshOk = await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken: refresh1 },
    forwardedFor: "10.0.0.1"
  });
  assert(refreshOk.status === 200, `Expected refresh 200, got ${refreshOk.status}`);
  report.push(`refresh_success=${refreshOk.status}`);
  const refresh2 = refreshOk.json.refreshToken;
  const access2 = refreshOk.json.accessToken;

  const refreshReuse = await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken: refresh1 },
    forwardedFor: "10.0.0.1"
  });
  assert(refreshReuse.status === 401, `Expected old refresh token rejection 401, got ${refreshReuse.status}`);
  report.push(`refresh_reuse_rejected=${refreshReuse.status}`);

  const me = await request("/users/me", { token: access2 });
  assert(me.status === 200, `Expected /users/me 200, got ${me.status}`);
  report.push(`me_success=${me.status}`);

  const clientLogin = await request("/auth/login", {
    method: "POST",
    body: {
      email: "client@example.com",
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Client Browser", appVersion: "1.0.0", pushToken: "e2e-client-web" }
    },
    forwardedFor: "10.0.0.3"
  });
  assert(clientLogin.status === 200, `Expected client login 200, got ${clientLogin.status}`);
  const clientAccess = clientLogin.json.accessToken;

  const clientCreateUser = await request("/users", {
    method: "POST",
    token: clientAccess,
    body: { email: "new-admin@example.com", password: "Passw0rd123", role: "admin" }
  });
  assert(clientCreateUser.status === 403, `Expected client create user forbidden 403, got ${clientCreateUser.status}`);
  report.push(`rbac_client_forbidden=${clientCreateUser.status}`);

  const createBySuper = await request("/users", {
    method: "POST",
    token: access2,
    body: { email: createdAdminEmail, password: "Passw0rd123", role: "admin", isActive: true }
  });
  assert(createBySuper.status === 201, `Expected super_admin create user 201, got ${createBySuper.status}`);
  report.push(`rbac_super_create=${createBySuper.status}`);
  const newAdminId = createBySuper.json.id;

  const deactivateBySuper = await request(`/users/${newAdminId}/deactivate`, {
    method: "PATCH",
    token: access2
  });
  assert(deactivateBySuper.status === 200, `Expected deactivate 200, got ${deactivateBySuper.status}`);
  report.push(`deactivate_user=${deactivateBySuper.status}`);

  const registerDevice = await request("/devices/register", {
    method: "POST",
    token: access2,
    body: {
      platform: "web",
      deviceName: "Registered Device",
      appVersion: "1.0.1",
      pushToken: "e2e-registered-device"
    }
  });
  assert(registerDevice.status === 200, `Expected register device 200, got ${registerDevice.status}`);
  report.push(`device_register=${registerDevice.status}`);

  const logoutCurrent = await request("/devices/logout-current", {
    method: "POST",
    token: access2,
    body: { deviceId: registerDevice.json.id }
  });
  assert(logoutCurrent.status === 200, `Expected logout-current 200, got ${logoutCurrent.status}`);
  report.push(`device_logout_current=${logoutCurrent.status}`);

  const logoutAll = await request("/devices/logout-all-if-supported", {
    method: "POST",
    token: access2
  });
  assert(logoutAll.status === 200, `Expected logout-all 200, got ${logoutAll.status}`);
  report.push(`device_logout_all=${logoutAll.status}`);

  const logout = await request("/auth/logout", {
    method: "POST",
    token: access2,
    body: { refreshToken: refresh2 }
  });
  assert(logout.status === 200, `Expected logout 200, got ${logout.status}`);
  report.push(`logout_success=${logout.status}`);

  const refreshAfterLogout = await request("/auth/refresh", {
    method: "POST",
    body: { refreshToken: refresh2 },
    forwardedFor: "10.0.0.1"
  });
  assert(refreshAfterLogout.status === 401, `Expected refresh after logout 401, got ${refreshAfterLogout.status}`);
  report.push(`refresh_after_logout=${refreshAfterLogout.status}`);

  let bruteForceStatuses = [];
  for (let i = 0; i < 6; i += 1) {
    const attempt = await request("/auth/login", {
      method: "POST",
      body: { email: "client@example.com", password: "wrong-password" },
      forwardedFor: "10.0.0.99"
    });
    bruteForceStatuses.push(attempt.status);
  }
  const bruteForceLocked = bruteForceStatuses[5] === 429;
  assert(bruteForceLocked, `Expected brute force lock on 6th attempt, got ${bruteForceStatuses.join(",")}`);
  report.push(`bruteforce_statuses=${bruteForceStatuses.join("/")}`);

  let refreshStatuses = [];
  for (let i = 0; i < 45; i += 1) {
    const result = await request("/auth/refresh", {
      method: "POST",
      body: { refreshToken: `invalid-token-${i}` },
      forwardedFor: "10.0.0.77"
    });
    refreshStatuses.push(result.status);
  }
  const has429 = refreshStatuses.includes(429);
  assert(has429, `Expected refresh rate limit 429, got ${refreshStatuses.join(",")}`);
  report.push(`refresh_rate_limit_hit=true`);

  console.log(report.join("\n"));
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit(process.exitCode ?? 0);
  });
