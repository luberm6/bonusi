import { authFetchJson } from "/assets/app.js";
import { formatAdminDate, initAdminListPage } from "/assets/admin-list-page.js";

const resetModalElement = document.getElementById("reset-password-modal");
const copyElement = document.getElementById("reset-password-copy");
const errorElement = document.getElementById("reset-password-error");
const successElement = document.getElementById("reset-password-success");
const newPasswordElement = document.getElementById("reset-password-new");
const confirmPasswordElement = document.getElementById("reset-password-confirm");
const submitElement = document.getElementById("reset-password-submit");
const cancelElement = document.getElementById("reset-password-cancel");

const profileModalElement = document.getElementById("client-profile-modal");
const profileCloseElement = document.getElementById("client-profile-close");
const profileTitleElement = document.getElementById("client-profile-title");
const profileSubtitleElement = document.getElementById("client-profile-subtitle");
const profileEmailElement = document.getElementById("client-profile-email");
const profilePhoneElement = document.getElementById("client-profile-phone");
const profileStatusElement = document.getElementById("client-profile-status");
const profileLastSeenElement = document.getElementById("client-profile-last-seen");
const clientVisitsBadgeElement = document.getElementById("client-visits-badge");
const clientVisitsLoadingElement = document.getElementById("client-visits-loading");
const clientVisitsListElement = document.getElementById("client-visits-list");

let activeClient = null;
let activeProfileClient = null;

const money = (value) =>
  `${Number(value || 0).toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ₽`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function formatVisitCount(count) {
  const value = Math.abs(Number(count) || 0);
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return `${value} визит`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${value} визита`;
  return `${value} визитов`;
}

function formatUserError(error, fallbackText) {
  if (!(error instanceof Error) || !error.message) return fallbackText;
  const lowered = error.message.trim().toLowerCase();
  if (
    lowered === "failed to fetch"
    || lowered.includes("networkerror")
    || lowered.includes("network error")
    || lowered.includes("load failed")
  ) {
    return "Не удалось подключиться к серверу. Проверьте соединение и попробуйте ещё раз.";
  }
  return fallbackText;
}

function setVisitLoadingState(text, badgeText = "Загрузка") {
  clientVisitsLoadingElement.textContent = text;
  clientVisitsLoadingElement.style.display = "";
  clientVisitsBadgeElement.textContent = badgeText;
  clientVisitsListElement.innerHTML = "";
}

function closeResetModal() {
  activeClient = null;
  resetModalElement.dataset.open = "false";
  resetModalElement.setAttribute("aria-hidden", "true");
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
  resetModalElement.dataset.open = "true";
  resetModalElement.setAttribute("aria-hidden", "false");
  newPasswordElement.focus();
}

function resetClientProfile() {
  profileTitleElement.textContent = "Клиент";
  profileSubtitleElement.textContent = "Загружаем данные клиента и историю визитов.";
  profileEmailElement.textContent = "—";
  profilePhoneElement.textContent = "—";
  profileStatusElement.textContent = "—";
  profileLastSeenElement.textContent = "—";
  setVisitLoadingState("Загружаем историю визитов клиента...");
}

function closeClientProfile() {
  activeProfileClient = null;
  profileModalElement.dataset.open = "false";
  profileModalElement.setAttribute("aria-hidden", "true");
  resetClientProfile();
}

function openClientProfile(client) {
  activeProfileClient = client;
  profileTitleElement.textContent = client.fullName || "Без имени";
  profileSubtitleElement.textContent = `Карточка клиента ${client.email}. Ниже показываем историю визитов от новых к старым.`;
  profileEmailElement.textContent = client.email || "—";
  profilePhoneElement.textContent = client.phone || "Не указан";
  profileStatusElement.textContent = client.isActive ? "Активен" : "Отключен";
  profileLastSeenElement.textContent = formatAdminDate(client.lastSeen);
  setVisitLoadingState("Загружаем историю визитов клиента...");
  profileModalElement.dataset.open = "true";
  profileModalElement.setAttribute("aria-hidden", "false");
}

function renderNoVisits() {
  clientVisitsLoadingElement.style.display = "none";
  clientVisitsBadgeElement.textContent = formatVisitCount(0);
  clientVisitsListElement.innerHTML = `
    <article class="workspace-visit-history-card">
      <p class="workspace-empty">У клиента пока нет визитов</p>
      <p class="workspace-helper">Как только администратор оформит первый визит, здесь появится история обслуживания.</p>
    </article>
  `;
}

function renderVisitDetails(targetElement, visit) {
  const services = visit.visit_services || visit.visitServices || [];
  const comment = visit.comment || "Без комментария";

  const servicesRows = services.length
    ? services
        .map(
          (service) => `
            <tr>
              <td><strong>${escapeHtml(service.service_name_snapshot || service.serviceNameSnapshot || "Услуга")}</strong></td>
              <td>${money(service.price)}</td>
              <td>${escapeHtml(service.quantity)}</td>
              <td>${money(service.total)}</td>
            </tr>
          `
        )
        .join("")
    : '<tr><td colspan="4"><p class="workspace-empty">Для этого визита не найдено услуг.</p></td></tr>';

  targetElement.innerHTML = `
    <p class="workspace-visit-history-details-copy">Комментарий: ${escapeHtml(comment)}</p>
    <div class="workspace-table-wrap">
      <table class="workspace-table">
        <thead>
          <tr>
            <th>Услуга</th>
            <th>Цена</th>
            <th>Количество</th>
            <th>Итог</th>
          </tr>
        </thead>
        <tbody>${servicesRows}</tbody>
      </table>
    </div>
  `;
}

async function toggleVisitDetails(buttonElement, detailsElement, visitId) {
  const isOpen = buttonElement.dataset.open === "true";
  if (isOpen) {
    buttonElement.dataset.open = "false";
    buttonElement.textContent = "Подробнее";
    detailsElement.hidden = true;
    detailsElement.innerHTML = "";
    return;
  }

  buttonElement.disabled = true;
  detailsElement.hidden = false;
  detailsElement.innerHTML = '<p class="workspace-helper">Загружаем подробности визита...</p>';

  try {
    const visit = await authFetchJson(`/visits/${encodeURIComponent(visitId)}`);
    renderVisitDetails(detailsElement, visit);
    buttonElement.dataset.open = "true";
    buttonElement.textContent = "Скрыть детали";
  } catch (error) {
    detailsElement.innerHTML = `<p class="workspace-empty">${escapeHtml(
      formatUserError(error, "Не удалось загрузить детали визита.")
    )}</p>`;
    buttonElement.dataset.open = "false";
    buttonElement.textContent = "Подробнее";
  } finally {
    buttonElement.disabled = false;
  }
}

function renderVisits(visits) {
  clientVisitsLoadingElement.style.display = "none";
  clientVisitsBadgeElement.textContent = formatVisitCount(visits.length);

  clientVisitsListElement.innerHTML = visits
    .map((visit) => {
      const serviceNames = visit.service_names || visit.serviceNames || [];
      const serviceChips = serviceNames.length
        ? serviceNames.map((serviceName) => `<span class="workspace-visit-history-chip">${escapeHtml(serviceName)}</span>`).join("")
        : '<span class="workspace-visit-history-chip">Услуги не указаны</span>';

      return `
        <article class="workspace-visit-history-card" data-visit-card="${visit.id}">
          <div class="workspace-visit-history-top">
            <div>
              <p class="workspace-visit-history-title">${escapeHtml(formatAdminDate(visit.visit_date || visit.visitDate))}</p>
              <p class="workspace-visit-history-meta">Филиал: ${escapeHtml(visit.branch_name || visit.branchName || "—")} · Администратор: ${escapeHtml(visit.admin_name || visit.adminName || "—")}</p>
            </div>
            <button class="btn" type="button" data-visit-details="${visit.id}" data-open="false">Подробнее</button>
          </div>

          <div class="workspace-visit-history-grid">
            <article class="workspace-client-summary-card"><strong>Итоговая сумма</strong><span>${money(visit.final_amount ?? visit.finalAmount)}</span></article>
            <article class="workspace-client-summary-card"><strong>Скидка</strong><span>${money(visit.discount_amount ?? visit.discountAmount)}</span></article>
            <article class="workspace-client-summary-card"><strong>Начисленные бонусы</strong><span>${money(visit.bonus_accrual_amount ?? visit.bonusAccrualAmount)}</span></article>
            <article class="workspace-client-summary-card"><strong>Статус визита</strong><span>${escapeHtml(visit.status || "—")}</span></article>
          </div>

          <div class="workspace-visit-history-services">
            ${serviceChips}
          </div>

          <section class="workspace-visit-history-details" data-visit-details-panel="${visit.id}" hidden></section>
        </article>
      `;
    })
    .join("");

  for (const visit of visits) {
    const buttonElement = clientVisitsListElement.querySelector(`[data-visit-details="${visit.id}"]`);
    const detailsElement = clientVisitsListElement.querySelector(`[data-visit-details-panel="${visit.id}"]`);
    buttonElement?.addEventListener("click", () => {
      void toggleVisitDetails(buttonElement, detailsElement, visit.id);
    });
  }
}

async function loadClientVisits(client) {
  openClientProfile(client);
  try {
    const visits = await authFetchJson(`/clients/${encodeURIComponent(client.id)}/visits`);
    if (activeProfileClient?.id !== client.id) return;
    if (!Array.isArray(visits) || !visits.length) {
      renderNoVisits();
      return;
    }
    renderVisits(visits);
  } catch (error) {
    if (activeProfileClient?.id !== client.id) return;
    clientVisitsLoadingElement.style.display = "none";
    clientVisitsBadgeElement.textContent = "Ошибка";
    clientVisitsListElement.innerHTML = `<article class="workspace-visit-history-card"><p class="workspace-empty">${escapeHtml(
      formatUserError(error, "Не удалось загрузить историю визитов клиента.")
    )}</p></article>`;
  }
}

cancelElement?.addEventListener("click", closeResetModal);
resetModalElement?.addEventListener("click", (event) => {
  if (event.target === resetModalElement) closeResetModal();
});

profileCloseElement?.addEventListener("click", closeClientProfile);
profileModalElement?.addEventListener("click", (event) => {
  if (event.target === profileModalElement) closeClientProfile();
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
        <td><strong>${escapeHtml(client.fullName || "Без имени")}</strong></td>
        <td>${escapeHtml(client.email)}</td>
        <td>${escapeHtml(client.phone || "—")}</td>
        <td><span class="${client.isActive ? "badge-on" : "badge-off"}">${client.isActive ? "Активен" : "Отключен"}</span></td>
        <td>${escapeHtml(formatAdminDate(client.lastSeen))}</td>
        <td>
          <div class="workspace-inline-actions">
            <button class="btn" type="button" data-open-profile="${client.id}">Карточка</button>
            <button class="btn" type="button" data-reset-password="${client.id}">Сменить пароль</button>
          </div>
        </td>
      `;
      tableBodyElement.appendChild(row);
      row.querySelector("[data-reset-password]")?.addEventListener("click", () => openResetModal(client));
      row.querySelector("[data-open-profile]")?.addEventListener("click", () => {
        void loadClientVisits(client);
      });
    }
  }
});
