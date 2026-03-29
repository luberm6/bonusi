import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, initAdminWorkspace } from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const form = document.getElementById("branch-form");
  const errorMessage = document.getElementById("error-msg");
  const successMessage = document.getElementById("success-msg");
  const submitButton = document.getElementById("submit-btn");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    successMessage.textContent = "";
    submitButton.disabled = true;

    try {
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

      const created = await authFetchJson("/branches", {
        method: "POST",
        body: payload
      });

      successMessage.innerHTML = `Филиал создан. ID: ${created.id}. <a class="link" href="/admin/branches/">Открыть список</a>`;
      form.reset();
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Не удалось создать филиал");
    } finally {
      submitButton.disabled = false;
    }
  });
}
