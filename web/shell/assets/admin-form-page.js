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

  let isSubmitting = false;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting || (submitButton && submitButton.disabled)) return;
    isSubmitting = true;

    errorElement.textContent = "";
    successElement.textContent = "";

    if (beforeSubmit) {
      const message = beforeSubmit();
      if (message) {
        errorElement.textContent = message;
        isSubmitting = false;
        return;
      }
    }

    if (submitButton) submitButton.disabled = true;
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
      if (submitButton) submitButton.disabled = false;
      isSubmitting = false;
    }
  });

  return { session };
}
