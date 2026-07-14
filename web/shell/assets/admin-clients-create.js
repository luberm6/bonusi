import { initAdminCreateForm } from "/assets/admin-form-page.js";

const phoneInput = document.getElementById("phone");
if (phoneInput) {
  phoneInput.addEventListener('input', function(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) { e.target.value = ''; return; }
    if (val[0] === '8' || val[0] === '7') val = '7' + val.substring(1);
    else if (val[0] === '9') val = '7' + val;
    else val = '7' + val;
    
    let res = '+7';
    if (val.length > 1) res += ' (' + val.substring(1, 4);
    if (val.length >= 5) res += ') ' + val.substring(4, 7);
    if (val.length >= 8) res += '-' + val.substring(7, 9);
    if (val.length >= 10) res += '-' + val.substring(9, 11);
    e.target.value = res;
  });
}

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
