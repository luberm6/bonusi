import { initAdminCreateForm } from "/assets/admin-form-page.js";

initAdminCreateForm({
  roles: ["super_admin"],
  formElementId: "admin-form",
  submitPath: "/admins",
  beforeSubmit: () => {
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    return password === passwordConfirm ? "" : "Подтверждение пароля не совпадает";
  },
  buildBody: () => ({
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    fullName: document.getElementById("full-name").value.trim() || null,
    isActive: true
  }),
  successMessage: (created) =>
    `Администратор создан. ID: ${created.id}. <a class="link" href="/admin/admins/">Открыть список</a>`
});
