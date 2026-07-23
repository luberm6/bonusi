import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, renderWorkspaceState } from "/assets/admin-workspace.js";
import { formatAdminDate, initAdminListPage } from "/assets/admin-list-page.js";

const modalElement = document.getElementById("change-password-modal");
const copyElement = document.getElementById("change-password-copy");
const newPasswordInput = document.getElementById("change-password-new");
const confirmPasswordInput = document.getElementById("change-password-confirm");
const errorElement = document.getElementById("change-password-error");
const successElement = document.getElementById("change-password-success");
const submitButton = document.getElementById("change-password-submit");
const cancelButton = document.getElementById("change-password-cancel");

let targetAdmin = null;

function closeModal() {
  if (modalElement) modalElement.dataset.open = "false";
  targetAdmin = null;
  if (newPasswordInput) newPasswordInput.value = "";
  if (confirmPasswordInput) confirmPasswordInput.value = "";
  if (errorElement) errorElement.textContent = "";
  if (successElement) successElement.textContent = "";
}

if (cancelButton) {
  cancelButton.addEventListener("click", closeModal);
}

if (submitButton) {
  submitButton.addEventListener("click", async () => {
    if (!targetAdmin) return;
    const newPass = newPasswordInput.value.trim();
    const confirmPass = confirmPasswordInput.value.trim();

    errorElement.textContent = "";
    successElement.textContent = "";

    if (!newPass) {
      errorElement.textContent = "Введите новый пароль";
      return;
    }
    if (newPass.length < 6) {
      errorElement.textContent = "Пароль должен содержать не менее 6 символов";
      return;
    }
    if (newPass !== confirmPass) {
      errorElement.textContent = "Подтверждение пароля не совпадает";
      return;
    }

    submitButton.disabled = true;
    try {
      await authFetchJson(`/admins/${targetAdmin.id}`, {
        method: "PATCH",
        body: JSON.stringify({ password: newPass })
      });

      successElement.textContent = "Пароль администратора успешно изменен!";
      setTimeout(() => {
        closeModal();
        submitButton.disabled = false;
      }, 1200);
    } catch (err) {
      errorElement.textContent = formatWorkspaceError(err, "Не удалось изменить пароль");
      submitButton.disabled = false;
    }
  });
}

const context = initAdminListPage({
  roles: ["super_admin"],
  fetchPath: "/admins",
  badgeLabel: "Доступ",
  emptyTitle: "Администраторы пока не добавлены",
  emptyText: "Создайте первого администратора для операционной команды.",
  emptyRowHtml:
    '<tr><td colspan="6"><p class="workspace-empty">Пока нет дополнительных администраторов. Добавьте первую учетную запись, чтобы делегировать работу.</p></td></tr>',
  successTitle: () => "Контур администраторов актуален",
  successText: (items) => `Найдено администраторов: ${items.length}.`,
  renderRows: ({ items, session, tableBodyElement, reload }) => {
    for (const admin of items) {
      const row = document.createElement("tr");

      const disableButtonHtml =
        admin.id === session.userId
          ? '<button class="btn btn-secondary btn-disable" type="button" disabled>Ваш аккаунт</button>'
          : '<button class="btn btn-secondary btn-disable" type="button">Отключить</button>';

      const pwdButtonHtml = `<button class="btn btn-secondary btn-pwd" type="button">Сменить пароль</button>`;

      row.innerHTML = `
        <td><strong>${admin.fullName || "Без имени"}</strong></td>
        <td>${admin.email}</td>
        <td>${admin.role}</td>
        <td><span class="${admin.isActive ? "badge-on" : "badge-off"}">${admin.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${formatAdminDate(admin.lastSeen)}</td>
        <td><div class="admin-actions">${pwdButtonHtml}${disableButtonHtml}</div></td>
      `;

      const pwdBtn = row.querySelector(".btn-pwd");
      if (pwdBtn) {
        pwdBtn.addEventListener("click", () => {
          targetAdmin = admin;
          if (copyElement) {
            copyElement.textContent = `Смена пароля для администратора ${admin.email} (${admin.fullName || "Без имени"})`;
          }
          if (modalElement) modalElement.dataset.open = "true";
        });
      }

      if (admin.id !== session.userId) {
        const disableBtn = row.querySelector(".btn-disable");
        if (disableBtn) {
          disableBtn.addEventListener("click", async () => {
            disableBtn.disabled = true;
            try {
              await authFetchJson(`/admins/${admin.id}`, { method: "DELETE" });
              await reload();
            } catch (error) {
              renderWorkspaceState(
                context.stateElement,
                "error",
                "Не удалось отключить администратора",
                formatWorkspaceError(error, "Не удалось отключить администратора"),
                "Ошибка"
              );
              disableBtn.disabled = false;
            }
          });
        }
      }

      tableBodyElement.appendChild(row);
    }
  }
});
