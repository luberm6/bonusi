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

  const superLogin = await request("/auth/login", {
    method: "POST",
    forwardedFor: "10.10.10.1",
    body: {
      email: "superadmin@example.com",
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Users E2E Super", appVersion: "1.0.0" }
    }
  });
  assert(superLogin.status === 200, `super login failed: ${superLogin.status}`);
  const superAccess = superLogin.json.accessToken;
  report.push(`super_login=${superLogin.status}`);

  const superMe = await request("/users/me", { token: superAccess });
  assert(superMe.status === 200, `super /users/me failed: ${superMe.status}`);
  report.push(`super_me=${superMe.status}`);

  const adminBySuperEmail = `admin-by-super-${suffix}@example.com`;
  const adminBySuper = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: adminBySuperEmail,
      password: "Passw0rd123",
      role: "admin",
      fullName: "Admin By Super",
      phone: `+1555${String(suffix).slice(-6)}`
    }
  });
  assert(adminBySuper.status === 201, `super->admin create failed: ${adminBySuper.status}`);
  assert(adminBySuper.json.createdBy, "createdBy missing on created admin");
  report.push(`super_create_admin=${adminBySuper.status}`);

  const clientBySuperEmail = `client-by-super-${suffix}@example.com`;
  const clientBySuper = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: clientBySuperEmail,
      password: "Passw0rd123",
      role: "client",
      fullName: "Client By Super"
    }
  });
  assert(clientBySuper.status === 201, `super->client create failed: ${clientBySuper.status}`);
  report.push(`super_create_client=${clientBySuper.status}`);

  const adminLogin = await request("/auth/login", {
    method: "POST",
    forwardedFor: "10.10.10.2",
    body: {
      email: adminBySuperEmail,
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Users E2E Admin", appVersion: "1.0.0" }
    }
  });
  assert(adminLogin.status === 200, `admin login failed: ${adminLogin.status}`);
  const adminAccess = adminLogin.json.accessToken;
  report.push(`admin_login=${adminLogin.status}`);

  const adminByAdminEmail = `admin-by-admin-${suffix}@example.com`;
  const adminByAdmin = await request("/users", {
    method: "POST",
    token: adminAccess,
    body: {
      email: adminByAdminEmail,
      password: "Passw0rd123",
      role: "admin",
      notes: "created by admin"
    }
  });
  assert(adminByAdmin.status === 403, `admin->admin create should be 403, got ${adminByAdmin.status}`);
  report.push(`admin_create_admin_forbidden=${adminByAdmin.status}`);

  const clientByAdminEmail = `client-by-admin-${suffix}@example.com`;
  const clientByAdmin = await request("/users", {
    method: "POST",
    token: adminAccess,
    body: {
      email: clientByAdminEmail,
      password: "Passw0rd123",
      role: "client",
      fullName: "Client By Admin"
    }
  });
  assert(clientByAdmin.status === 201, `admin->client create failed: ${clientByAdmin.status}`);
  report.push(`admin_create_client=${clientByAdmin.status}`);

  const listByAdmin = await request("/users", { token: adminAccess });
  assert(listByAdmin.status === 200, `admin list users failed: ${listByAdmin.status}`);
  const hasSuper = listByAdmin.json.some((u) => u.role === "super_admin");
  assert(!hasSuper, "admin list unexpectedly contains super_admin");
  report.push(`admin_list_users=${listByAdmin.status}`);

  const getUserByAdmin = await request(`/users/${clientByAdmin.json.id}`, { token: adminAccess });
  assert(getUserByAdmin.status === 200, `admin get user failed: ${getUserByAdmin.status}`);
  report.push(`admin_get_user=${getUserByAdmin.status}`);

  const updatedUser = await request(`/users/${clientByAdmin.json.id}`, {
    method: "PATCH",
    token: adminAccess,
    body: { fullName: "Client By Admin Updated", notes: "updated", isActive: true }
  });
  assert(updatedUser.status === 200, `admin patch user failed: ${updatedUser.status}`);
  report.push(`admin_patch_user=${updatedUser.status}`);

  const duplicateEmail = await request("/users", {
    method: "POST",
    token: adminAccess,
    body: {
      email: clientByAdminEmail,
      password: "Passw0rd123",
      role: "client"
    }
  });
  assert(duplicateEmail.status === 409, `duplicate email should be 409, got ${duplicateEmail.status}`);
  report.push(`duplicate_email_conflict=${duplicateEmail.status}`);

  const deactivateByAdmin = await request(`/users/${clientByAdmin.json.id}/deactivate`, {
    method: "PATCH",
    token: adminAccess
  });
  assert(deactivateByAdmin.status === 200, `admin deactivate client failed: ${deactivateByAdmin.status}`);
  report.push(`admin_deactivate_client=${deactivateByAdmin.status}`);

  const clientLogin = await request("/auth/login", {
    method: "POST",
    forwardedFor: "10.10.10.3",
    body: {
      email: clientBySuperEmail,
      password: "Passw0rd123",
      device: { platform: "web", deviceName: "Users E2E Client", appVersion: "1.0.0" }
    }
  });
  assert(clientLogin.status === 200, `client login failed: ${clientLogin.status}`);
  const clientAccess = clientLogin.json.accessToken;
  report.push(`client_login=${clientLogin.status}`);

  const clientMe = await request("/users/me", { token: clientAccess });
  assert(clientMe.status === 200, `client /users/me failed: ${clientMe.status}`);
  report.push(`client_me=${clientMe.status}`);

  const clientCreate = await request("/users", {
    method: "POST",
    token: clientAccess,
    body: { email: `forbidden-${suffix}@example.com`, password: "Passw0rd123", role: "client" }
  });
  assert(clientCreate.status === 403, `client create should be 403, got ${clientCreate.status}`);
  report.push(`client_create_forbidden=${clientCreate.status}`);

  const clientList = await request("/users", { token: clientAccess });
  assert(clientList.status === 200, `client list should return self only, got ${clientList.status}`);
  assert(clientList.json.length === 1, `client list expected 1 self record, got ${clientList.json.length}`);
  report.push(`client_list_self_only=${clientList.status}`);

  const clientGetOther = await request(`/users/${adminBySuper.json.id}`, { token: clientAccess });
  assert(clientGetOther.status === 403, `client get other should be 403, got ${clientGetOther.status}`);
  report.push(`client_get_other_forbidden=${clientGetOther.status}`);

  const clientPatchSelf = await request(`/users/${clientBySuper.json.id}`, {
    method: "PATCH",
    token: clientAccess,
    body: { fullName: "Client Self Updated", notes: "self-edit" }
  });
  assert(clientPatchSelf.status === 200, `client self patch failed: ${clientPatchSelf.status}`);
  report.push(`client_patch_self=${clientPatchSelf.status}`);

  const clientPatchRole = await request(`/users/${clientBySuper.json.id}`, {
    method: "PATCH",
    token: clientAccess,
    body: { role: "admin" }
  });
  assert(clientPatchRole.status === 403, `client role patch should be 403, got ${clientPatchRole.status}`);
  report.push(`client_patch_role_forbidden=${clientPatchRole.status}`);

  const auditCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: `audit-check-${suffix}@example.com`,
      password: "Passw0rd123",
      role: "client",
      notes: "audit candidate"
    }
  });
  assert(auditCreate.status === 201, `audit create baseline failed: ${auditCreate.status}`);
  report.push(`audit_candidate_user_id=${auditCreate.json.id}`);

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
