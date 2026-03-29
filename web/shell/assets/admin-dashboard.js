import { authFetchJson } from "/assets/app.js";
import {
  appendSuperAdminActions,
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace({
  logoutButtonId: "logout-btn",
  identityElementId: "who"
});

if (session) {
  const statePanel = document.getElementById("dashboard-state");
  const actions = document.getElementById("workspace-actions");
  const todayIso = new Date().toISOString().slice(0, 10);

  if (session.role === "super_admin") {
    appendSuperAdminActions(actions);
  }

  const kpiElements = {
    visits: document.getElementById("kpi-visits"),
    clients: document.getElementById("kpi-clients"),
    chats: document.getElementById("kpi-chats"),
    branches: document.getElementById("kpi-branches")
  };

  const setKpi = (key, value) => {
    const element = kpiElements[key];
    if (element) {
      element.textContent = String(value);
    }
  };

  const loadDashboard = async () => {
    try {
      const [visits, users, chats, branches] = await Promise.allSettled([
        authFetchJson(`/visits?dateFrom=${todayIso}T00:00:00Z`),
        authFetchJson("/users"),
        authFetchJson("/chat/conversations"),
        authFetchJson("/branches")
      ]);

      const resolveValue = (result) => (result.status === "fulfilled" ? result.value : null);
      const visitsData = resolveValue(visits);
      const usersData = resolveValue(users);
      const chatsData = resolveValue(chats);
      const branchesData = resolveValue(branches);

      setKpi("visits", Array.isArray(visitsData) ? visitsData.length : "—");
      setKpi(
        "clients",
        Array.isArray(usersData)
          ? usersData.filter((user) => user.role === "client" && user.isActive).length
          : "—"
      );
      setKpi("chats", Array.isArray(chatsData) ? chatsData.length : "—");
      setKpi(
        "branches",
        Array.isArray(branchesData)
          ? branchesData.filter((branch) => branch.isActive).length
          : "—"
      );

      const failures = [visits, users, chats, branches].filter(
        (result) => result.status === "rejected"
      );
      if (failures.length) {
        renderWorkspaceState(
          statePanel,
          "error",
          "Сводка загружена частично",
          "Основные действия доступны, но часть KPI сейчас не ответила со стороны backend.",
          "Частичная ошибка"
        );
        return;
      }

      renderWorkspaceState(
        statePanel,
        "success",
        "Сводка актуальна",
        "Ключевые показатели и операционные данные успешно обновлены.",
        "Синхронизировано"
      );
    } catch (error) {
      renderWorkspaceState(
        statePanel,
        "error",
        "Не удалось загрузить дашборд",
        formatWorkspaceError(error, "Не удалось загрузить дашборд"),
        "Ошибка"
      );
    }
  };

  void loadDashboard();
}
