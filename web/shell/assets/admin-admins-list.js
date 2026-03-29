import { authFetchJson } from "/assets/app.js";
import { formatWorkspaceError, renderWorkspaceState } from "/assets/admin-workspace.js";
import { formatAdminDate, initAdminListPage } from "/assets/admin-list-page.js";

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
      const disableButton =
        admin.id === session.userId
          ? '<button class="btn btn-secondary" type="button" disabled>Ваш аккаунт</button>'
          : '<button class="btn btn-secondary" type="button">Отключить</button>';
      row.innerHTML = `
        <td><strong>${admin.fullName || "Без имени"}</strong></td>
        <td>${admin.email}</td>
        <td>${admin.role}</td>
        <td><span class="${admin.isActive ? "badge-on" : "badge-off"}">${admin.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${formatAdminDate(admin.lastSeen)}</td>
        <td><div class="admin-actions">${disableButton}</div></td>
      `;

      if (admin.id !== session.userId) {
        const button = row.querySelector("button");
        button.addEventListener("click", async () => {
          button.disabled = true;
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
            button.disabled = false;
          }
        });
      }

      tableBodyElement.appendChild(row);
    }
  }
});
