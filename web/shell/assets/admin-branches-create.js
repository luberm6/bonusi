import { initAdminCreateForm } from "/assets/admin-form-page.js";

initAdminCreateForm({
  formElementId: "branch-form",
  submitPath: "/branches",
  buildBody: () => {
    const latValue = document.getElementById("lat").value.trim();
    const lngValue = document.getElementById("lng").value.trim();
    const workHoursValue = document.getElementById("work-hours").value.trim();

    const payload = {
      name: document.getElementById("name").value.trim(),
      address: document.getElementById("address").value.trim(),
      phone: document.getElementById("phone").value.trim() || null,
      description: document.getElementById("description").value.trim() || null,
      workHours: workHoursValue ? { text: workHoursValue } : {},
      isActive: true
    };

    if (latValue) payload.lat = Number(latValue);
    if (lngValue) payload.lng = Number(lngValue);
    return payload;
  },
  successMessage: (created) =>
    `Филиал создан. ID: ${created.id}. <a class="link" href="/admin/branches/">Открыть список</a>`
});
