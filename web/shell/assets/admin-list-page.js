import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

export function formatAdminDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
}

export function initAdminListPage({
  roles,
  stateElementId = "page-state",
  loadingElementId = "loading",
  tableElementId = "table",
  tableBodyElementId = "tbody",
  fetchPath,
  normalizeItems = (items) => items,
  badgeLabel,
  emptyTitle,
  emptyText,
  emptyRowHtml,
  successTitle,
  successText,
  renderRows
}) {
  const session = initAdminWorkspace({ roles });
  if (!session) return null;

  const stateElement = document.getElementById(stateElementId);
  const loadingElement = document.getElementById(loadingElementId);
  const tableElement = document.getElementById(tableElementId);
  const tableBodyElement = document.getElementById(tableBodyElementId);

  const load = async () => {
    try {
      const rawItems = await authFetchJson(fetchPath);
      const items = Array.isArray(rawItems) ? normalizeItems(rawItems) : rawItems;
      loadingElement.style.display = "none";
      tableElement.style.display = "";
      tableBodyElement.innerHTML = "";

      if (!Array.isArray(items) || !items.length) {
        tableBodyElement.innerHTML = emptyRowHtml;
        renderWorkspaceState(stateElement, "default", emptyTitle, emptyText, badgeLabel);
        return;
      }

      renderWorkspaceState(
        stateElement,
        "success",
        successTitle(items),
        successText(items),
        "Актуально"
      );

      renderRows({ items, session, tableBodyElement, reload: load });
    } catch (error) {
      loadingElement.textContent = "Не удалось загрузить данные";
      renderWorkspaceState(
        stateElement,
        "error",
        `Не удалось загрузить ${badgeLabel.toLowerCase()}`,
        formatWorkspaceError(error, `Не удалось загрузить ${badgeLabel.toLowerCase()}`),
        "Ошибка"
      );
    }
  };

  void load();
  return { session, reload: load, stateElement, tableBodyElement };
}
