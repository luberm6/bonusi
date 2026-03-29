import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace({ roles: ["super_admin"] });

if (session) {
  const pageState = document.getElementById("page-state");
  const loading = document.getElementById("loading");
  const table = document.getElementById("table");
  const tableBody = document.getElementById("tbody");

  const formatDate = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
  };

  const loadAdmins = async () => {
    try {
      const admins = await authFetchJson("/admins");
      loading.style.display = "none";
      table.style.display = "";
      tableBody.innerHTML = "";

      if (!Array.isArray(admins) || admins.length === 0) {
        tableBody.innerHTML =
          '<tr><td colspan="6"><p class="workspace-empty">Пока нет дополнительных администраторов. Добавьте первую учетную запись, чтобы делегировать работу.</p></td></tr>';
        renderWorkspaceState(
          pageState,
          "default",
          "Администраторы пока не добавлены",
          "Создайте первого администратора для операционной команды.",
          "Доступ"
        );
        return;
      }

      renderWorkspaceState(
        pageState,
        "success",
        "Контур администраторов актуален",
        `Найдено администраторов: ${admins.length}.`,
        "Актуально"
      );

      for (const admin of admins) {
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
          <td>${formatDate(admin.lastSeen)}</td>
          <td><div class="admin-actions">${disableButton}</div></td>
        `;

        if (admin.id !== session.userId) {
          const button = row.querySelector("button");
          button.addEventListener("click", async () => {
            button.disabled = true;
            try {
              await authFetchJson(`/admins/${admin.id}`, { method: "DELETE" });
              await loadAdmins();
            } catch (error) {
              renderWorkspaceState(
                pageState,
                "error",
                "Не удалось отключить администратора",
                formatWorkspaceError(error, "Не удалось отключить администратора"),
                "Ошибка"
              );
              button.disabled = false;
            }
          });
        }

        tableBody.appendChild(row);
      }
    } catch (error) {
      loading.textContent = "Не удалось загрузить данные";
      renderWorkspaceState(
        pageState,
        "error",
        "Не удалось загрузить список администраторов",
        formatWorkspaceError(error, "Не удалось загрузить список администраторов"),
        "Ошибка"
      );
    }
  };

  void loadAdmins();
}
