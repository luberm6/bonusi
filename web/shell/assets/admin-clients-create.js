import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, initAdminWorkspace } from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const form = document.getElementById("client-form");
  const errorMessage = document.getElementById("error-msg");
  const successMessage = document.getElementById("success-msg");
  const submitButton = document.getElementById("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    successMessage.textContent = "";
    submitButton.disabled = true;

    try {
      const created = await authFetchJson("/users", {
        method: "POST",
        body: {
          email: document.getElementById("email").value.trim(),
          password: document.getElementById("password").value,
          role: "client",
          fullName: document.getElementById("full-name").value.trim() || null,
          phone: document.getElementById("phone").value.trim() || null,
          notes: document.getElementById("notes").value.trim() || null,
          isActive: true
        }
      });

      successMessage.innerHTML = `Клиент создан. ID: ${created.id}. <a class="link" href="/admin/clients/">Открыть список</a>`;
      form.reset();
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Не удалось создать клиента");
    } finally {
      submitButton.disabled = false;
    }
  });
}
