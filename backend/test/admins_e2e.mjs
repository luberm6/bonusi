const baseUrl = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";

async function request(path, { method = "GET", body, token, forwardedFor } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

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
  if (!condition) throw new Error(message);
}

async function run() {
  const report = [];
  const suffix = Date.now();
  const uniquePhone = `+1${String(suffix).slice(-10)}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`;

  const superLogin = await request("/auth/login", {
    method: "POST",
    forwardedFor: "10.20.0.1",
    body: {
      email: "superadmin@example.com",
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Admins E2E Super", appVersion: "1.0.0" }
    }
  });
  assert(superLogin.status === 200, `super login failed: ${superLogin.status}`);
  const superAccess = superLogin.json.accessToken;
  report.push(`super_login=${superLogin.status}`);

  const createEmail = `managed-admin-${suffix}@example.com`;
  const createAdmin = await request("/admins", {
    method: "POST",
    token: superAccess,
    body: {
      email: createEmail,
      password: "Passw0rd123",
      fullName: "Управляемый администратор",
      phone: uniquePhone
    }
  });
  assert(createAdmin.status === 201, `super create admin failed: ${createAdmin.status}`);
  report.push(`super_create_admin=${createAdmin.status}`);

  const adminsList = await request("/admins", { token: superAccess });
  assert(adminsList.status === 200, `super list admins failed: ${adminsList.status}`);
  assert(adminsList.json.some((admin) => admin.id === createAdmin.json.id), "new admin missing from list");
  report.push(`super_list_admins=${adminsList.status}`);

  const adminLogin = await request("/auth/login", {
    method: "POST",
    forwardedFor: "10.20.0.2",
    body: {
      email: createEmail,
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Admins E2E Managed", appVersion: "1.0.0" }
    }
  });
  assert(adminLogin.status === 200, `created admin login failed: ${adminLogin.status}`);
  const adminAccess = adminLogin.json.accessToken;
  report.push(`created_admin_login=${adminLogin.status}`);

  const adminCreateAttempt = await request("/admins", {
    method: "POST",
    token: adminAccess,
    body: {
      email: `forbidden-admin-${suffix}@example.com`,
      password: "Passw0rd123"
    }
  });
  assert(adminCreateAttempt.status === 403, `admin create via /admins should be 403, got ${adminCreateAttempt.status}`);
  report.push(`admin_create_admin_forbidden=${adminCreateAttempt.status}`);

  const adminCreateViaUsers = await request("/users", {
    method: "POST",
    token: adminAccess,
    body: {
      email: `forbidden-users-${suffix}@example.com`,
      password: "Passw0rd123",
      role: "admin"
    }
  });
  assert(adminCreateViaUsers.status === 403, `admin create via /users should be 403, got ${adminCreateViaUsers.status}`);
  report.push(`admin_create_via_users_forbidden=${adminCreateViaUsers.status}`);

  const adminListAttempt = await request("/admins", { token: adminAccess });
  assert(adminListAttempt.status === 403, `admin list /admins should be 403, got ${adminListAttempt.status}`);
  report.push(`admin_list_admins_forbidden=${adminListAttempt.status}`);

  const patchAdmin = await request(`/admins/${createAdmin.json.id}`, {
    method: "PATCH",
    token: superAccess,
    body: { notes: "updated by super admin", fullName: "Администратор обновлен" }
  });
  assert(patchAdmin.status === 200, `super patch admin failed: ${patchAdmin.status}`);
  report.push(`super_patch_admin=${patchAdmin.status}`);

  const deleteAdmin = await request(`/admins/${createAdmin.json.id}`, {
    method: "DELETE",
    token: superAccess
  });
  assert(deleteAdmin.status === 200, `super delete admin failed: ${deleteAdmin.status}`);
  report.push(`super_delete_admin=${deleteAdmin.status}`);

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
