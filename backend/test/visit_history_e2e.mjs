import { assert, login, request } from "./helpers/runtime.mjs";

function isoShift(hours = 1) {
  return new Date(Date.now() + hours * 3600 * 1000).toISOString();
}

async function run() {
  const suffix = Date.now();
  const report = [];

  const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.91.0.1", "Visit History E2E");

  const branch = await request("/branches", {
    method: "POST",
    token: superAccess,
    body: {
      name: `Visit History Branch ${suffix}`,
      address: "200 Visit History Ave, New York, NY",
      lat: 40.7128,
      lng: -74.006,
      isActive: true
    }
  });
  assert(branch.status === 201, `branch create failed: ${branch.status}`);

  const client = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: `visit-history-client-${suffix}@example.com`,
      password: "Passw0rd123",
      role: "client",
      fullName: "Visit History Client"
    }
  });
  assert(client.status === 201, `client create failed: ${client.status}`);

  const admin = await request("/users", {
    method: "POST",
    token: superAccess,
    body: {
      email: `visit-history-admin-${suffix}@example.com`,
      password: "Passw0rd123",
      role: "admin",
      fullName: "Visit History Admin"
    }
  });
  assert(admin.status === 201, `admin create failed: ${admin.status}`);
  const adminAccess = await login(admin.json.email, "Passw0rd123", "10.91.0.2", "Visit History Admin");

  const serviceA = await request("/services", {
    method: "POST",
    token: superAccess,
    body: { name: `Visit History Wash ${suffix}`, basePrice: 120, isActive: true }
  });
  assert(serviceA.status === 201, `service A create failed: ${serviceA.status}`);

  const serviceB = await request("/services", {
    method: "POST",
    token: superAccess,
    body: { name: `Visit History Polish ${suffix}`, basePrice: 80, isActive: true }
  });
  assert(serviceB.status === 201, `service B create failed: ${serviceB.status}`);

  const olderVisit = await request("/visits", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId: client.json.id,
      branchId: branch.json.id,
      visitDate: isoShift(2),
      discountAmount: 10,
      comment: "Older visit",
      services: [{ serviceId: serviceA.json.id, quantity: 1 }]
    }
  });
  assert(olderVisit.status === 201, `older visit create failed: ${olderVisit.status}`);

  const newerVisit = await request("/visits", {
    method: "POST",
    token: adminAccess,
    body: {
      clientId: client.json.id,
      branchId: branch.json.id,
      visitDate: isoShift(4),
      discountAmount: 0,
      comment: "Newer visit",
      services: [
        { serviceId: serviceA.json.id, quantity: 1 },
        { serviceId: serviceB.json.id, quantity: 2 }
      ]
    }
  });
  assert(newerVisit.status === 201, `newer visit create failed: ${newerVisit.status}`);

  const listAll = await request("/visits", { token: superAccess });
  assert(listAll.status === 200, `visits list failed: ${listAll.status}`);
  assert(Array.isArray(listAll.json), "visits list must be array");
  const newerSummary = listAll.json.find((row) => row.id === newerVisit.json.id);
  assert(newerSummary, "newer visit missing in general list");
  assert(newerSummary.client_id === client.json.id, "client_id missing in summary");
  assert(newerSummary.client_name === client.json.email, "client_name mismatch in summary");
  assert(newerSummary.admin_id === admin.json.id, "admin_id mismatch in summary");
  assert(newerSummary.admin_name === admin.json.email, "admin_name mismatch in summary");
  assert(newerSummary.branch_id === branch.json.id, "branch_id mismatch in summary");
  assert(newerSummary.branch_name === branch.json.name, "branch_name mismatch in summary");
  assert(newerSummary.services_count === 2, `expected services_count 2, got ${newerSummary.services_count}`);
  assert(Array.isArray(newerSummary.service_names), "service_names must be array");
  assert(newerSummary.service_names.includes(`Visit History Wash ${suffix}`), "service_names missing wash");
  assert(newerSummary.bonus_accrual_amount > 0, "bonus_accrual_amount missing in summary");

  const filteredByClient = await request(`/visits?client_id=${client.json.id}`, { token: superAccess });
  assert(filteredByClient.status === 200, `client filter failed: ${filteredByClient.status}`);
  assert(filteredByClient.json.every((row) => row.client_id === client.json.id), "client filter returned foreign visit");

  const filteredByAdmin = await request(`/visits?admin_id=${admin.json.id}`, { token: superAccess });
  assert(filteredByAdmin.status === 200, `admin filter failed: ${filteredByAdmin.status}`);
  assert(filteredByAdmin.json.some((row) => row.id === newerVisit.json.id), "admin filter lost visit");

  const filteredByBranch = await request(`/visits?branch_id=${branch.json.id}`, { token: superAccess });
  assert(filteredByBranch.status === 200, `branch filter failed: ${filteredByBranch.status}`);
  assert(filteredByBranch.json.some((row) => row.id === olderVisit.json.id), "branch filter lost visit");

  const filteredByDate = await request(
    `/visits?date_from=${encodeURIComponent(isoShift(3))}&date_to=${encodeURIComponent(isoShift(6))}`,
    { token: superAccess }
  );
  assert(filteredByDate.status === 200, `date filter failed: ${filteredByDate.status}`);
  assert(filteredByDate.json.some((row) => row.id === newerVisit.json.id), "date filter should include newer visit");
  assert(!filteredByDate.json.some((row) => row.id === olderVisit.json.id), "date filter should exclude older visit");

  const clientHistory = await request(`/clients/${client.json.id}/visits`, { token: superAccess });
  assert(clientHistory.status === 200, `client visits failed: ${clientHistory.status}`);
  assert(clientHistory.json[0].id === newerVisit.json.id, "client visits must be newest first");
  assert(clientHistory.json[1].id === olderVisit.json.id, "client visits second item mismatch");

  const details = await request(`/visits/${newerVisit.json.id}`, { token: superAccess });
  assert(details.status === 200, `visit details failed: ${details.status}`);
  assert(details.json.client_name === client.json.email, "detail client_name mismatch");
  assert(details.json.admin_name === admin.json.email, "detail admin_name mismatch");
  assert(details.json.branch_name === branch.json.name, "detail branch_name mismatch");
  assert(Array.isArray(details.json.visit_services), "visit_services must be array");
  assert(details.json.visit_services.length === 2, "visit_services count mismatch");
  assert(
    details.json.visit_services.some((row) => row.service_name_snapshot === `Visit History Polish ${suffix}`),
    "detail service_name_snapshot missing"
  );
  assert(Array.isArray(details.json.bonus_accruals), "bonus_accruals must be array");
  assert(
    details.json.bonus_accruals.some(
      (row) => row.visit_id === newerVisit.json.id && row.type === "accrual" && Number(row.amount) > 0
    ),
    "detail bonus accrual relation missing"
  );

  report.push(`list_all=${listAll.status}`);
  report.push(`visit_details=${details.status}`);
  report.push(`client_visits=${clientHistory.status}`);
  report.push(`filters_ok=true`);
  report.push(`sorted_newest_first=true`);
  report.push(`bonus_link_ok=true`);

  console.log(report.join("\n"));
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
