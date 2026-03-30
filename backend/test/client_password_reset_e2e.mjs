import { assert, createTestPool, login, request, withAdvisoryLock } from "./helpers/runtime.mjs";

async function run() {
  const suffix = Date.now().toString(36);
  const pool = createTestPool();
  const report = [];

  try {
    await withAdvisoryLock(pool, "client-password-reset-e2e", async () => {
      const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.90.0.1", "Reset Super");
      report.push("super_login=200");

      const adminEmail = `client-reset-admin-${suffix}@example.com`;
      const adminCreate = await request("/users", {
        method: "POST",
        token: superAccess,
        body: { email: adminEmail, password: "Passw0rd123", role: "admin", fullName: "Reset Admin" }
      });
      assert(adminCreate.status === 201, `admin create failed: ${adminCreate.status}`);
      report.push("admin_create=201");
      const adminId = adminCreate.json.id;

      const adminAccess = await login(adminEmail, "Passw0rd123", "10.90.0.2", "Reset Admin Login");
      report.push("admin_login=200");

      const clientAEmail = `client-reset-a-${suffix}@example.com`;
      const clientBEmail = `client-reset-b-${suffix}@example.com`;
      const adminTargetEmail = `client-reset-other-admin-${suffix}@example.com`;

      const clientA = await request("/users", {
        method: "POST",
        token: superAccess,
        body: { email: clientAEmail, password: "OldPass123", role: "client", fullName: "Client A" }
      });
      const clientB = await request("/users", {
        method: "POST",
        token: superAccess,
        body: { email: clientBEmail, password: "OldPass123", role: "client", fullName: "Client B" }
      });
      const adminTarget = await request("/users", {
        method: "POST",
        token: superAccess,
        body: { email: adminTargetEmail, password: "Passw0rd123", role: "admin", fullName: "Blocked Admin" }
      });
      assert(clientA.status === 201 && clientB.status === 201 && adminTarget.status === 201, "seed users failed");
      report.push("client_seed=201");

      const mismatch = await request(`/users/${clientA.json.id}/reset-password`, {
        method: "POST",
        token: adminAccess,
        body: { new_password: "NewPass123", confirm_password: "OtherPass123" }
      });
      assert(mismatch.status === 400, `mismatch should be 400, got ${mismatch.status}`);
      report.push("password_mismatch_guard=400");

      const adminResetClient = await request(`/users/${clientA.json.id}/reset-password`, {
        method: "POST",
        token: adminAccess,
        body: { new_password: "NewPass123", confirm_password: "NewPass123" }
      });
      assert(adminResetClient.status === 200, `admin reset client failed: ${adminResetClient.status}`);
      report.push("admin_reset_client=200");

      const oldLogin = await request("/auth/login", {
        method: "POST",
        body: {
          email: clientAEmail,
          password: "OldPass123",
          device: { platform: "ios", deviceName: "Old Password Check", appVersion: "1.0.0" }
        }
      });
      assert(oldLogin.status === 401, `old password should fail, got ${oldLogin.status}`);
      report.push("old_password_login=401");

      const newLogin = await request("/auth/login", {
        method: "POST",
        body: {
          email: clientAEmail,
          password: "NewPass123",
          device: { platform: "ios", deviceName: "New Password Check", appVersion: "1.0.0" }
        }
      });
      assert(newLogin.status === 200, `new password should work, got ${newLogin.status}`);
      report.push("new_password_login=200");

      const adminResetAdmin = await request(`/users/${adminTarget.json.id}/reset-password`, {
        method: "POST",
        token: adminAccess,
        body: { new_password: "Blocked123", confirm_password: "Blocked123" }
      });
      assert(adminResetAdmin.status === 403, `admin reset admin should be 403, got ${adminResetAdmin.status}`);
      report.push("admin_reset_admin_forbidden=403");

      const clientAccess = await login(clientAEmail, "NewPass123", "10.90.0.3", "Client Reset Check");
      const clientReset = await request(`/users/${clientB.json.id}/reset-password`, {
        method: "POST",
        token: clientAccess,
        body: { new_password: "ClientFail123", confirm_password: "ClientFail123" }
      });
      assert(clientReset.status === 403, `client reset should be 403, got ${clientReset.status}`);
      report.push("client_reset_forbidden=403");

      const superResetClient = await request(`/users/${clientB.json.id}/reset-password`, {
        method: "POST",
        token: superAccess,
        body: { new_password: "SuperNew123", confirm_password: "SuperNew123" }
      });
      assert(superResetClient.status === 200, `super reset client failed: ${superResetClient.status}`);
      report.push("super_reset_client=200");

      const clientBLogin = await request("/auth/login", {
        method: "POST",
        body: {
          email: clientBEmail,
          password: "SuperNew123",
          device: { platform: "ios", deviceName: "Super Reset Login", appVersion: "1.0.0" }
        }
      });
      assert(clientBLogin.status === 200, `super reset new password should work, got ${clientBLogin.status}`);
      report.push("super_reset_new_password_login=200");

      const auditRows = await pool.query(
        `select count(*)::int as cnt, max(payload::text) as payload_text
         from public.audit_logs
         where action = 'client.password.reset'
           and entity_id in ($1, $2)`,
        [clientA.json.id, clientB.json.id]
      );
      const auditCount = auditRows.rows[0]?.cnt ?? 0;
      assert(auditCount >= 2, `missing client.password.reset audit, got ${auditCount}`);
      const payloadText = String(auditRows.rows[0]?.payload_text ?? "");
      assert(!payloadText.includes("NewPass123") && !payloadText.includes("SuperNew123"), "password leaked into audit payload");
      report.push(`audit_client_password_reset=${auditCount}`);
    });

    console.log(report.join("\n"));
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
