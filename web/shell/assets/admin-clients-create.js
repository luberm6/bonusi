import { initAdminCreateForm } from "/assets/admin-form-page.js";

initAdminCreateForm({
  formElementId: "client-form",
  submitPath: "/users",
  buildBody: () => {
    const phone = document.getElementById("phone").value.trim();
    const cleanPhone = phone.replace(/\D/g, "");
    const email = cleanPhone ? `${cleanPhone}@noemail.placeholder` : `${Date.now()}@noemail.placeholder`;
    const password = "dummy-" + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const carYear = document.getElementById("car-year").value.trim();
    const odometerKm = document.getElementById("odometer-km").value.trim();
    return {
      email,
      password,
      role: "client",
      fullName: document.getElementById("full-name").value.trim() || null,
      phone: phone || null,
      notes: document.getElementById("notes").value.trim() || null,
      isActive: true,
      carBrand: document.getElementById("car-brand").value.trim() || null,
      carModel: document.getElementById("car-model").value.trim() || null,
      carPlate: document.getElementById("car-plate").value.trim() || null,
      carYear: carYear ? Number(carYear) : null,
      odometerKm: odometerKm ? Number(odometerKm) : null,
      carVin: document.getElementById("car-vin").value.trim() || null,
    };
  },
  successMessage: (created) =>
    `Клиент создан. ID: ${created.id}. <a class="link" href="/admin/clients/">Открыть список</a>`
});
