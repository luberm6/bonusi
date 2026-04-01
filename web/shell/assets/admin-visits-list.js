import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace({
  roles: ["admin", "super_admin"],
  logoutButtonId: "logout-btn",
  identityElementId: "who"
});

if (session) {
  const stateElement = document.getElementById("page-state");
  const loadingElement = document.getElementById("loading");
  const tableElement = document.getElementById("table");
  const tableBodyElement = document.getElementById("tbody");
  const listMetaElement = document.getElementById("list-meta");
  const listBadgeElement = document.getElementById("list-badge");

  const filtersForm = document.getElementById("filters-form");
  const resetFiltersButton = document.getElementById("reset-filters");
  const clientFilterElement = document.getElementById("filter-client");
  const branchFilterElement = document.getElementById("filter-branch");
  const adminFilterElement = document.getElementById("filter-admin");
  const dateFromElement = document.getElementById("filter-date-from");
  const dateToElement = document.getElementById("filter-date-to");

  const modalElement = document.getElementById("visit-modal");
  const closeModalButton = document.getElementById("visit-modal-close");
  const detailTitleElement = document.getElementById("detail-title");
  const detailSubtitleElement = document.getElementById("detail-subtitle");
  const detailDateElement = document.getElementById("detail-date");
  const detailClientElement = document.getElementById("detail-client");
  const detailBranchElement = document.getElementById("detail-branch");
  const detailAdminElement = document.getElementById("detail-admin");
  const detailStatusElement = document.getElementById("detail-status");
  const detailCommentElement = document.getElementById("detail-comment");
  const detailTotalElement = document.getElementById("detail-total");
  const detailDiscountElement = document.getElementById("detail-discount");
  const detailFinalElement = document.getElementById("detail-final");
  const detailBonusElement = document.getElementById("detail-bonus");
  const detailServicesBodyElement = document.getElementById("detail-services-body");
  const detailBonusesBodyElement = document.getElementById("detail-bonuses-body");

  let clients = [];
  let admins = [];
  let branches = [];

  const money = (value) =>
    `${Number(value || 0).toLocaleString("ru-RU", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })} ₽`;

  const dateTime = (value) => {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("ru-RU");
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const formatVisitCount = (count) => {
    const value = Math.abs(Number(count) || 0);
    const mod10 = value % 10;
    const mod100 = value % 100;
    if (mod10 === 1 && mod100 !== 11) return `${value} визит`;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} визита`;
    return `${value} визитов`;
  };

  const toUserErrorMessage = (error, fallbackText) => {
    const rawMessage = formatWorkspaceError(error, fallbackText);
    if (!rawMessage) return fallbackText;
    const message = rawMessage.trim();
    const lowered = message.toLowerCase();

    if (
      lowered === "failed to fetch"
      || lowered === "networkerror when attempting to fetch resource."
      || lowered.includes("load failed")
      || lowered.includes("networkerror")
      || lowered.includes("network error")
    ) {
      return "Не удалось подключиться к серверу. Проверьте соединение и попробуйте ещё раз.";
    }

    if (lowered.includes("forbidden") || lowered.includes("unauthorized")) {
      return "Недостаточно прав для просмотра раздела визитов.";
    }

    return fallbackText;
  };

  const populateSelect = (element, placeholder, items, getLabel) => {
    element.innerHTML = `<option value="">${placeholder}</option>`;
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = getLabel(item);
      element.appendChild(option);
    }
  };

  const renderEmpty = (title, text) => {
    loadingElement.style.display = "none";
    tableElement.style.display = "";
    tableBodyElement.innerHTML =
      '<tr><td colspan="9"><p class="workspace-empty">Визитов по текущим условиям пока нет.</p></td></tr>';
    listBadgeElement.textContent = formatVisitCount(0);
    listMetaElement.textContent = text;
    renderWorkspaceState(stateElement, "default", title, text, "Пусто");
  };

  const readFilters = () => {
    const params = new URLSearchParams();
    if (clientFilterElement.value) params.set("client_id", clientFilterElement.value);
    if (branchFilterElement.value) params.set("branch_id", branchFilterElement.value);
    if (adminFilterElement.value) params.set("admin_id", adminFilterElement.value);
    if (dateFromElement.value) params.set("date_from", `${dateFromElement.value}T00:00:00.000Z`);
    if (dateToElement.value) params.set("date_to", `${dateToElement.value}T23:59:59.999Z`);
    const query = params.toString();
    return query ? `?${query}` : "";
  };

  const describeFilters = () => {
    const parts = [];
    const client = clients.find((item) => item.id === clientFilterElement.value);
    const branch = branches.find((item) => item.id === branchFilterElement.value);
    const admin = admins.find((item) => item.id === adminFilterElement.value);
    if (client) parts.push(`клиент: ${client.fullName || client.email}`);
    if (branch) parts.push(`филиал: ${branch.name}`);
    if (admin) parts.push(`администратор: ${admin.fullName || admin.email}`);
    if (dateFromElement.value) parts.push(`от: ${dateFromElement.value}`);
    if (dateToElement.value) parts.push(`до: ${dateToElement.value}`);
    return parts.length ? parts.join(" · ") : "Показываем все визиты от новых к старым.";
  };

  const resetDetailModal = () => {
    detailTitleElement.textContent = "Загружаем визит";
    detailSubtitleElement.textContent = "Подготавливаем состав услуг и финансовые показатели.";
    detailDateElement.textContent = "—";
    detailClientElement.textContent = "—";
    detailBranchElement.textContent = "—";
    detailAdminElement.textContent = "—";
    detailStatusElement.textContent = "—";
    detailCommentElement.textContent = "—";
    detailTotalElement.textContent = "—";
    detailDiscountElement.textContent = "—";
    detailFinalElement.textContent = "—";
    detailBonusElement.textContent = "—";
    detailServicesBodyElement.innerHTML =
      '<tr><td colspan="4"><p class="workspace-empty">Загружаем услуги визита...</p></td></tr>';
    detailBonusesBodyElement.innerHTML =
      '<tr><td colspan="4"><p class="workspace-empty">Загружаем начисления...</p></td></tr>';
  };

  const closeModal = () => {
    modalElement.dataset.open = "false";
    modalElement.setAttribute("aria-hidden", "true");
    resetDetailModal();
  };

  const openModal = () => {
    modalElement.dataset.open = "true";
    modalElement.setAttribute("aria-hidden", "false");
  };

  const renderVisitDetails = (visit) => {
    detailTitleElement.textContent = `Визит от ${dateTime(visit.visit_date)}`;
    detailSubtitleElement.textContent = `Клиент: ${visit.client_name || visit.clientName || "—"} · Визит № ${visit.id}`;
    detailDateElement.textContent = dateTime(visit.visit_date);
    detailClientElement.textContent = visit.client_name || visit.clientName || "—";
    detailBranchElement.textContent = visit.branch_name || visit.branchName || "—";
    detailAdminElement.textContent = visit.admin_name || visit.adminName || "—";
    detailStatusElement.textContent = visit.status || "—";
    detailCommentElement.textContent = visit.comment || "Без комментария";
    detailTotalElement.textContent = money(visit.total_amount ?? visit.totalAmount);
    detailDiscountElement.textContent = money(visit.discount_amount ?? visit.discountAmount);
    detailFinalElement.textContent = money(visit.final_amount ?? visit.finalAmount);
    detailBonusElement.textContent = money(visit.bonus_accrual_amount ?? visit.bonusAccrualAmount);

    const services = visit.visit_services || visit.visitServices || visit.services || [];
    if (!services.length) {
      detailServicesBodyElement.innerHTML =
        '<tr><td colspan="4"><p class="workspace-empty">Для этого визита не найдено услуг.</p></td></tr>';
    } else {
      detailServicesBodyElement.innerHTML = services
        .map(
          (service) => `
            <tr>
              <td><strong>${escapeHtml(service.service_name_snapshot || service.serviceNameSnapshot || "Услуга")}</strong></td>
              <td class="workspace-amount">${money(service.price)}</td>
              <td>${escapeHtml(service.quantity)}</td>
              <td class="workspace-amount">${money(service.total)}</td>
            </tr>
          `
        )
        .join("");
    }

    const bonuses = visit.bonus_accruals || visit.bonusAccruals || [];
    if (!bonuses.length) {
      detailBonusesBodyElement.innerHTML =
        '<tr><td colspan="4"><p class="workspace-empty">Начислений бонусов по этому визиту нет.</p></td></tr>';
    } else {
      detailBonusesBodyElement.innerHTML = bonuses
        .map(
          (bonus) => `
            <tr>
              <td>${dateTime(bonus.created_at || bonus.createdAt)}</td>
              <td class="workspace-amount">${money(bonus.amount)}</td>
              <td>${escapeHtml(bonus.type === "accrual" ? "Начисление" : bonus.type || "—")}</td>
              <td>${escapeHtml(bonus.comment || "—")}</td>
            </tr>
          `
        )
        .join("");
    }
  };

  const openVisitDetails = async (visitId) => {
    openModal();
    resetDetailModal();
    try {
      const visit = await authFetchJson(`/visits/${encodeURIComponent(visitId)}`);
      renderVisitDetails(visit);
    } catch (error) {
      detailTitleElement.textContent = "Не удалось загрузить детали";
      detailSubtitleElement.textContent = toUserErrorMessage(error, "Не удалось получить данные визита.");
      detailServicesBodyElement.innerHTML =
        '<tr><td colspan="4"><p class="workspace-empty">Подробности временно недоступны.</p></td></tr>';
      detailBonusesBodyElement.innerHTML =
        '<tr><td colspan="4"><p class="workspace-empty">Данные по бонусам временно недоступны.</p></td></tr>';
    }
  };

  const renderRows = (items) => {
    tableBodyElement.innerHTML = "";
    for (const visit of items) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>
          <strong>${dateTime(visit.visit_date || visit.visitDate)}</strong>
          <div class="workspace-muted">${escapeHtml(visit.status || "—")}</div>
        </td>
        <td>${escapeHtml(visit.client_name || visit.clientName || "—")}</td>
        <td>${escapeHtml(visit.branch_name || visit.branchName || "—")}</td>
        <td>${escapeHtml(visit.admin_name || visit.adminName || "—")}</td>
        <td class="workspace-amount">${money(visit.total_amount ?? visit.totalAmount)}</td>
        <td class="workspace-amount">${money(visit.discount_amount ?? visit.discountAmount)}</td>
        <td class="workspace-amount"><strong>${money(visit.final_amount ?? visit.finalAmount)}</strong></td>
        <td class="workspace-amount">${money(visit.bonus_accrual_amount ?? visit.bonusAccrualAmount)}</td>
        <td>
          <div class="workspace-inline-actions">
            <button class="btn" type="button" data-open-detail="${visit.id}">Детали</button>
          </div>
        </td>
      `;
      tableBodyElement.appendChild(row);
      row.querySelector("[data-open-detail]")?.addEventListener("click", () => openVisitDetails(visit.id));
    }
  };

  const loadVisits = async () => {
    loadingElement.style.display = "";
    tableElement.style.display = "none";
    tableBodyElement.innerHTML = "";
    listBadgeElement.textContent = "Обновляем";
    listMetaElement.textContent = "Получаем историю визитов и применяем выбранные фильтры.";

    try {
      const items = await authFetchJson(`/visits${readFilters()}`);
      const visits = Array.isArray(items) ? items : [];

      loadingElement.style.display = "none";
      tableElement.style.display = "";

      if (!visits.length) {
        renderEmpty("Визиты не найдены", "По выбранным условиям визиты отсутствуют. Попробуйте изменить фильтры.");
        return;
      }

      listBadgeElement.textContent = formatVisitCount(visits.length);
      listMetaElement.textContent = describeFilters();
      renderWorkspaceState(
        stateElement,
        "success",
        "История визитов загружена",
        `Найдено визитов: ${visits.length}. ${describeFilters()}`,
        "Актуально"
      );
      renderRows(visits);
    } catch (error) {
      loadingElement.textContent = "Не удалось загрузить визиты";
      tableElement.style.display = "";
      tableBodyElement.innerHTML =
        '<tr><td colspan="9"><p class="workspace-empty">Не удалось открыть историю визитов. Попробуйте ещё раз.</p></td></tr>';
      listBadgeElement.textContent = "Ошибка";
      listMetaElement.textContent = "Временная ошибка загрузки данных.";
      renderWorkspaceState(
        stateElement,
        "error",
        "Не удалось загрузить историю визитов",
        toUserErrorMessage(error, "Не удалось загрузить историю визитов."),
        "Ошибка"
      );
    }
  };

  const loadLookups = async () => {
    const [usersResult, branchesResult] = await Promise.allSettled([
      authFetchJson("/users"),
      authFetchJson("/branches")
    ]);

    clients = usersResult.status === "fulfilled" ? usersResult.value.filter((item) => item.role === "client") : [];
    admins =
      usersResult.status === "fulfilled"
        ? usersResult.value.filter((item) => item.role === "admin" || item.role === "super_admin")
        : [];
    branches = branchesResult.status === "fulfilled" ? branchesResult.value : [];

    populateSelect(clientFilterElement, "Все клиенты", clients, (item) => item.fullName || item.email);
    populateSelect(branchFilterElement, "Все филиалы", branches, (item) => item.name);
    populateSelect(adminFilterElement, "Все администраторы", admins, (item) => item.fullName || item.email);
  };

  filtersForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void loadVisits();
  });

  resetFiltersButton.addEventListener("click", () => {
    clientFilterElement.value = "";
    branchFilterElement.value = "";
    adminFilterElement.value = "";
    dateFromElement.value = "";
    dateToElement.value = "";
    void loadVisits();
  });

  closeModalButton.addEventListener("click", closeModal);
  modalElement.addEventListener("click", (event) => {
    if (event.target === modalElement) {
      closeModal();
    }
  });

  const bootstrap = async () => {
    try {
      await loadLookups();
      await loadVisits();
    } catch (error) {
      renderWorkspaceState(
        stateElement,
        "error",
        "Не удалось подготовить раздел",
        toUserErrorMessage(error, "Не удалось открыть раздел визитов."),
        "Ошибка"
      );
      loadingElement.textContent = "Не удалось загрузить раздел визитов";
    }
  };

  void bootstrap();
}
