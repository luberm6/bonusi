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

  const loadBranches = async () => {
    try {
      const branches = await authFetchJson("/branches");
      loading.style.display = "none";
      table.style.display = "";
      tableBody.innerHTML = "";

      if (!Array.isArray(branches) || !branches.length) {
        tableBody.innerHTML =
          '<tr><td colspan="5"><p class="workspace-empty">Филиалов пока нет. Создайте первую точку обслуживания.</p></td></tr>';
        renderWorkspaceState(
          pageState,
          "default",
          "Сеть филиалов пока пустая",
          "Добавьте первый филиал, чтобы запись и карта начали показывать точки сервиса.",
          "Филиалы"
        );
        return;
      }

      renderWorkspaceState(
        pageState,
        "success",
        "Филиалы синхронизированы",
        `Найдено филиалов: ${branches.length}.`,
        "Актуально"
      );

      for (const branch of branches) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td><strong>${branch.name}</strong></td>
          <td>${branch.address}</td>
          <td>${branch.phone || "—"}</td>
          <td><span class="${branch.isActive ? "badge-on" : "badge-off"}">${branch.isActive ? "Активен" : "Отключен"}</span></td>
          <td>${Number(branch.lat).toFixed(6)}, ${Number(branch.lng).toFixed(6)}</td>
        `;
        tableBody.appendChild(row);
      }
    } catch (error) {
      loading.textContent = "Не удалось загрузить данные";
      renderWorkspaceState(
        pageState,
        "error",
        "Не удалось загрузить филиалы",
        formatWorkspaceError(error, "Не удалось загрузить список филиалов"),
        "Ошибка"
      );
    }
  };

  void loadBranches();
}
