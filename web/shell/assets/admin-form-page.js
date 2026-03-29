import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, initAdminWorkspace } from "/assets/admin-workspace.js";

export function initAdminCreateForm({
  roles,
  formElementId,
  errorElementId = "error-msg",
  successElementId = "success-msg",
  submitButtonId = "submit-btn",
  beforeSubmit,
  buildBody,
  submitPath,
  successMessage
}) {
  const session = initAdminWorkspace({ roles });
  if (!session) return null;

  const form = document.getElementById(formElementId);
  const errorElement = document.getElementById(errorElementId);
  const successElement = document.getElementById(successElementId);
  const submitButton = document.getElementById(submitButtonId);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorElement.textContent = "";
    successElement.textContent = "";

    if (beforeSubmit) {
      const message = beforeSubmit();
      if (message) {
        errorElement.textContent = message;
        return;
      }
    }

    submitButton.disabled = true;
    try {
      const created = await authFetchJson(submitPath, {
        method: "POST",
        body: buildBody()
      });
      successElement.innerHTML = successMessage(created);
      form.reset();
    } catch (error) {
      errorElement.textContent = formatWorkspaceError(error, "Не удалось сохранить запись");
    } finally {
      submitButton.disabled = false;
    }
  });

  return { session };
}
