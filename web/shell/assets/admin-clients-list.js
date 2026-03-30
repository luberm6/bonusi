import { authFetchJson } from "/assets/app.js";
import { formatAdminDate, initAdminListPage } from "/assets/admin-list-page.js";

const modalElement = document.getElementById("reset-password-modal");
const copyElement = document.getElementById("reset-password-copy");
const errorElement = document.getElementById("reset-password-error");
const successElement = document.getElementById("reset-password-success");
const newPasswordElement = document.getElementById("reset-password-new");
const confirmPasswordElement = document.getElementById("reset-password-confirm");
const submitElement = document.getElementById("reset-password-submit");
const cancelElement = document.getElementById("reset-password-cancel");

let activeClient = null;

function closeResetModal() {
  activeClient = null;
  modalElement.dataset.open = "false";
  modalElement.setAttribute("aria-hidden", "true");
  errorElement.textContent = "";
  successElement.textContent = "";
  newPasswordElement.value = "";
  confirmPasswordElement.value = "";
}

function openResetModal(client) {
  activeClient = client;
  copyElement.textContent = `Обновите пароль для клиента ${client.fullName || client.email}. Старый пароль перестанет работать сразу после сохранения.`;
  errorElement.textContent = "";
  successElement.textContent = "";
  newPasswordElement.value = "";
  confirmPasswordElement.value = "";
  modalElement.dataset.open = "true";
  modalElement.setAttribute("aria-hidden", "false");
  newPasswordElement.focus();
}

cancelElement?.addEventListener("click", closeResetModal);
modalElement?.addEventListener("click", (event) => {
  if (event.target === modalElement) closeResetModal();
});

submitElement?.addEventListener("click", async () => {
  if (!activeClient) return;
  const newPassword = newPasswordElement.value;
  const confirmPassword = confirmPasswordElement.value;

  errorElement.textContent = "";
  successElement.textContent = "";

  if (!newPassword.trim() || !confirmPassword.trim()) {
    errorElement.textContent = "Заполните оба поля пароля.";
    return;
  }
  if (newPassword.length < 8) {
    errorElement.textContent = "Пароль должен содержать не меньше 8 символов.";
    return;
  }
  if (newPassword !== confirmPassword) {
    errorElement.textContent = "Пароли не совпадают.";
    return;
  }

  submitElement.disabled = true;
  try {
    await authFetchJson(`/users/${encodeURIComponent(activeClient.id)}/reset-password`, {
      method: "POST",
      body: {
        new_password: newPassword,
        confirm_password: confirmPassword
      }
    });
    successElement.textContent = "Пароль клиента успешно изменён.";
    window.setTimeout(closeResetModal, 900);
  } catch (error) {
    errorElement.textContent = error instanceof Error ? error.message : "Не удалось изменить пароль. Попробуйте ещё раз.";
  } finally {
    submitElement.disabled = false;
  }
});

initAdminListPage({
  fetchPath: "/users",
  normalizeItems: (items) => items.filter((user) => user.role === "client"),
  badgeLabel: "Клиенты",
  emptyTitle: "Клиентская база пока пустая",
  emptyText: "Создайте первого клиента, чтобы открыть запись, визиты и бонусный контур.",
  emptyRowHtml:
    '<tr><td colspan="6"><p class="workspace-empty">Клиентов пока нет. Создайте первую запись, чтобы начать работу.</p></td></tr>',
  successTitle: () => "Клиентская база актуальна",
  successText: (items) => `Найдено клиентов: ${items.length}.`,
  renderRows: ({ items, tableBodyElement }) => {
    for (const client of items) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${client.fullName || "Без имени"}</strong></td>
        <td>${client.email}</td>
        <td>${client.phone || "—"}</td>
        <td><span class="${client.isActive ? "badge-on" : "badge-off"}">${client.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${formatAdminDate(client.lastSeen)}</td>
        <td>
          <div class="workspace-inline-actions">
            <button class="btn" type="button" data-reset-password="${client.id}">Сменить пароль</button>
          </div>
        </td>
      `;
      tableBodyElement.appendChild(row);
      row.querySelector("[data-reset-password]")?.addEventListener("click", () => openResetModal(client));
    }
  }
});
