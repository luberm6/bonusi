import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

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

  const loadClients = async () => {
    try {
      const users = await authFetchJson("/users");
      const clients = Array.isArray(users)
        ? users.filter((user) => user.role === "client")
        : [];
      loading.style.display = "none";
      table.style.display = "";
      tableBody.innerHTML = "";

      if (!clients.length) {
        tableBody.innerHTML =
          '<tr><td colspan="5"><p class="workspace-empty">Клиентов пока нет. Создайте первую запись, чтобы начать работу.</p></td></tr>';
        renderWorkspaceState(
          pageState,
          "default",
          "Клиентская база пока пустая",
          "Создайте первого клиента, чтобы открыть запись, визиты и бонусный контур.",
          "Клиенты"
        );
        return;
      }

      renderWorkspaceState(
        pageState,
        "success",
        "Клиентская база актуальна",
        `Найдено клиентов: ${clients.length}.`,
        "Актуально"
      );

      for (const client of clients) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${client.fullName || "Без имени"}</strong></td>
          <td>${client.email}</td>
          <td>${client.phone || "—"}</td>
          <td><span class="${client.isActive ? "badge-on" : "badge-off"}">${client.isActive ? "Активен" : "Отключен"}</span></td>
          <td>${formatDate(client.lastSeen)}</td>
        `;
        tableBody.appendChild(row);
      }
    } catch (error) {
      loading.textContent = "Не удалось загрузить данные";
      renderWorkspaceState(
        pageState,
        "error",
        "Не удалось загрузить список клиентов",
        formatWorkspaceError(error, "Не удалось загрузить список клиентов"),
        "Ошибка"
      );
    }
  };

  void loadClients();
}
