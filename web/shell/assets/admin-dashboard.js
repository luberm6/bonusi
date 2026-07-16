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
    setTimeout(() => {
      const btn = document.getElementById("run-selftest-btn");
      if (btn) {
        btn.addEventListener("click", async (e) => {
          e.preventDefault();
          if (!confirm("Запустить 3000 тестов СУБД и отправить тестовые SMS и Email алерты?")) return;
          
          btn.style.opacity = "0.5";
          btn.style.pointerEvents = "none";
          const titleSpan = btn.querySelector(".workspace-action-title");
          const originalTitle = titleSpan ? titleSpan.textContent : "Диагностика системы";
          if (titleSpan) titleSpan.textContent = "Выполняется диагностика...";

          try {
            const testResult = await authFetchJson("/healthz/selftest");
            const alertResult = await authFetchJson("/healthz/trigger-failure-alert", { method: "POST" });
            
            alert(`Успех!\n\nВыполнено проверок: ${testResult.total}\nУспешно: ${testResult.passed}\nОшибок: ${testResult.failed}\n\nТестовые SMS и Email уведомления успешно отправлены!`);
          } catch (err) {
            alert(`Ошибка: ${err.message}`);
          } finally {
            btn.style.opacity = "1";
            btn.style.pointerEvents = "auto";
            if (titleSpan) titleSpan.textContent = originalTitle;
          }
        });
      }
    }, 100);
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
          "Требует внимания"
        );
        return;
      }

      renderWorkspaceState(
        statePanel,
        "success",
        "Сводка актуальна",
        "Ключевые показатели и операционные данные успешно обновлены.",
        "Данные актуальны"
      );

      // Проверка непрочитанных чатов для мигания кнопки
      const unreadChats = Array.isArray(chatsData) ? chatsData.filter((c) => c.unreadCount > 0).length : 0;
      const dialogsAction = document.getElementById("action-dialogs");
      if (dialogsAction) {
        if (unreadChats > 0) {
          dialogsAction.classList.add("pulse-alert");
        } else {
          dialogsAction.classList.remove("pulse-alert");
        }
      }
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

  setInterval(async () => {
    try {
      const chats = await authFetchJson("/chat/conversations");
      setKpi("chats", Array.isArray(chats) ? chats.length : "—");
      
      const unreadChats = Array.isArray(chats) ? chats.filter((c) => c.unreadCount > 0).length : 0;
      const dialogsAction = document.getElementById("action-dialogs");
      if (dialogsAction) {
        if (unreadChats > 0) {
          dialogsAction.classList.add("pulse-alert");
        } else {
          dialogsAction.classList.remove("pulse-alert");
        }
      }
    } catch (_) {}
  }, 10000);
}
