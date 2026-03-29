import { initAdminCreateForm } from "/assets/admin-form-page.js";

initAdminCreateForm({
  formElementId: "client-form",
  submitPath: "/users",
  buildBody: () => ({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    role: "client",
    fullName: document.getElementById("full-name").value.trim() || null,
    phone: document.getElementById("phone").value.trim() || null,
    notes: document.getElementById("notes").value.trim() || null,
    isActive: true
  }),
  successMessage: (created) =>
    `Клиент создан. ID: ${created.id}. <a class="link" href="/admin/clients/">Открыть список</a>`
});
