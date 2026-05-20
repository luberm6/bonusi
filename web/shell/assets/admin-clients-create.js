import { initAdminCreateForm } from "/assets/admin-form-page.js";

initAdminCreateForm({
  formElementId: "client-form",
  submitPath: "/users",
  buildBody: () => {
    const carYear = document.getElementById("car-year").value.trim();
    const odometerKm = document.getElementById("odometer-km").value.trim();
    return {
      email: document.getElementById("email").value.trim(),
      password: document.getElementById("password").value,
      role: "client",
      fullName: document.getElementById("full-name").value.trim() || null,
      phone: document.getElementById("phone").value.trim() || null,
      notes: document.getElementById("notes").value.trim() || null,
      isActive: true,
      carBrand: document.getElementById("car-brand").value.trim() || null,
      carModel: document.getElementById("car-model").value.trim() || null,
      carPlate: document.getElementById("car-plate").value.trim() || null,
      carYear: carYear ? Number(carYear) : null,
      odometerKm: odometerKm ? Number(odometerKm) : null,
    };
  },
  successMessage: (created) =>
    `Клиент создан. ID: ${created.id}. <a class="link" href="/admin/clients/">Открыть список</a>`
});
