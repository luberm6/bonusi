import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, initAdminWorkspace } from "/assets/admin-workspace.js";

const session = initAdminWorkspace({ roles: ["super_admin"] });

if (session) {
  const form = document.getElementById("admin-form");
  const errorMessage = document.getElementById("error-msg");
  const successMessage = document.getElementById("success-msg");
  const submitButton = document.getElementById("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    successMessage.textContent = "";

    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    if (password !== passwordConfirm) {
      errorMessage.textContent = "Подтверждение пароля не совпадает";
      return;
    }

    submitButton.disabled = true;
    try {
      const created = await authFetchJson("/admins", {
        method: "POST",
        body: {
          email: document.getElementById("email").value.trim(),
          password,
          fullName: document.getElementById("full-name").value.trim() || null,
          isActive: true
        }
      });

      successMessage.innerHTML = `Администратор создан. ID: ${created.id}. <a class="link" href="/admin/admins/">Открыть список</a>`;
      form.reset();
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Не удалось создать администратора");
    } finally {
      submitButton.disabled = false;
    }
  });
}
