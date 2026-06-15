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
const profileDeleteElement = document.getElementById("client-profile-delete");
const profileTitleElement = document.getElementById("client-profile-title");
const profileSubtitleElement = document.getElementById("client-profile-subtitle");
const profileEmailElement = document.getElementById("client-profile-email");
const profilePhoneElement = document.getElementById("client-profile-phone");
const profileStatusElement = document.getElementById("client-profile-status");
const profileLastSeenElement = document.getElementById("client-profile-last-seen");
const clientVisitsBadgeElement = document.getElementById("client-visits-badge");
const clientVisitsLoadingElement = document.getElementById("client-visits-loading");
const clientVisitsListElement = document.getElementById("client-visits-list");

const profileCarBrandSpan = document.getElementById("client-profile-car-brand");
const profileCarModelSpan = document.getElementById("client-profile-car-model");
const profileCarPlateSpan = document.getElementById("client-profile-car-plate");
const profileCarYearSpan = document.getElementById("client-profile-car-year");
const profileOdometerSpan = document.getElementById("client-profile-odometer");
const profileCarVinSpan = document.getElementById("client-profile-car-vin");

const carFormElement = document.getElementById("client-car-form");
const carBrandInput = document.getElementById("profile-car-brand");
const carModelInput = document.getElementById("profile-car-model");
const carPlateInput = document.getElementById("profile-car-plate");
const carYearInput = document.getElementById("profile-car-year");
const odometerInput = document.getElementById("profile-odometer-km");
const carVinInput = document.getElementById("profile-car-vin");
const carErrorElement = document.getElementById("client-car-error");
const carSuccessElement = document.getElementById("client-car-success");
const carSubmitElement = document.getElementById("client-car-submit");

const basicFormElement = document.getElementById("client-basic-form");
const fullNameInput = document.getElementById("profile-full-name");
const emailInput = document.getElementById("profile-email");
const phoneInput = document.getElementById("profile-phone");
if (phoneInput) {
  phoneInput.addEventListener('input', function(e) {
    let val = e.target.value.replace(/\D/g, '');
    if (!val) { e.target.value = ''; return; }
    if (val[0] === '8' || val[0] === '7') val = '7' + val.substring(1);
    else if (val[0] === '9') val = '7' + val;
    else val = '7' + val;
    
    let res = '+7';
    if (val.length > 1) res += ' (' + val.substring(1, 4);
    if (val.length >= 5) res += ') ' + val.substring(4, 7);
    if (val.length >= 8) res += '-' + val.substring(7, 9);
    if (val.length >= 10) res += '-' + val.substring(9, 11);
    e.target.value = res;
  });
}
const basicErrorElement = document.getElementById("client-basic-error");
const basicSuccessElement = document.getElementById("client-basic-success");
const basicSubmitElement = document.getElementById("client-basic-submit");

const profileBonusesSpan = document.getElementById("client-profile-bonuses");
const bonusFormElement = document.getElementById("client-bonus-form");
const bonusTypeSelect = document.getElementById("profile-bonus-type");
const bonusAmountInput = document.getElementById("profile-bonus-amount");
const bonusCommentInput = document.getElementById("profile-bonus-comment");
const bonusErrorElement = document.getElementById("client-bonus-error");
const bonusSuccessElement = document.getElementById("client-bonus-success");
const bonusSubmitElement = document.getElementById("client-bonus-submit");

const searchPhoneInput = document.getElementById("search-phone");

let activeClient = null;
let activeProfileClient = null;
let allClients = [];
let activeTableBody = null;

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

async function loadClientBonusBalance(client) {
  if (profileBonusesSpan) profileBonusesSpan.textContent = "Загрузка...";
  try {
    const data = await authFetchJson(`/bonuses/balance?client_id=${encodeURIComponent(client.id)}`);
    if (activeProfileClient?.id !== client.id) return;
    if (profileBonusesSpan) {
      profileBonusesSpan.textContent = `${Number(data.balance || 0).toLocaleString("ru-RU", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })} Б`;
    }
  } catch (error) {
    if (activeProfileClient?.id !== client.id) return;
    if (profileBonusesSpan) profileBonusesSpan.textContent = "Ошибка";
  }
}

function resetClientProfile() {
  profileTitleElement.textContent = "Клиент";
  profileSubtitleElement.textContent = "Загружаем данные клиента и историю визитов.";
  profileEmailElement.textContent = "—";
  profilePhoneElement.textContent = "—";
  profileStatusElement.textContent = "—";
  profileLastSeenElement.textContent = "—";
  if (profileCarBrandSpan) profileCarBrandSpan.textContent = "—";
  if (profileCarModelSpan) profileCarModelSpan.textContent = "—";
  if (profileCarPlateSpan) profileCarPlateSpan.textContent = "—";
  if (profileCarYearSpan) profileCarYearSpan.textContent = "—";
  if (profileOdometerSpan) profileOdometerSpan.textContent = "—";
  if (profileCarVinSpan) profileCarVinSpan.textContent = "—";
  if (carBrandInput) carBrandInput.value = "";
  if (carModelInput) carModelInput.value = "";
  if (carPlateInput) carPlateInput.value = "";
  if (carYearInput) carYearInput.value = "";
  if (odometerInput) odometerInput.value = "";
  if (carVinInput) carVinInput.value = "";
  if (carErrorElement) carErrorElement.textContent = "";
  if (carSuccessElement) carSuccessElement.textContent = "";
  
  if (fullNameInput) fullNameInput.value = "";
  if (emailInput) emailInput.value = "";
  if (phoneInput) phoneInput.value = "";
  if (basicErrorElement) basicErrorElement.textContent = "";
  if (basicSuccessElement) basicSuccessElement.textContent = "";

  if (profileBonusesSpan) profileBonusesSpan.textContent = "—";
  if (bonusTypeSelect) bonusTypeSelect.value = "accrual";
  if (bonusAmountInput) bonusAmountInput.value = "";
  if (bonusCommentInput) bonusCommentInput.value = "";
  if (bonusErrorElement) bonusErrorElement.textContent = "";
  if (bonusSuccessElement) bonusSuccessElement.textContent = "";

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

  // Основная информация — inputs (prefill)
  if (fullNameInput) fullNameInput.value = client.fullName || "";
  if (emailInput) emailInput.value = client.email || "";
  if (phoneInput) phoneInput.value = client.phone || "";
  if (basicErrorElement) basicErrorElement.textContent = "";
  if (basicSuccessElement) basicSuccessElement.textContent = "";

  // Авто — spans
  if (profileCarBrandSpan) profileCarBrandSpan.textContent = client.carBrand || "—";
  if (profileCarModelSpan) profileCarModelSpan.textContent = client.carModel || "—";
  if (profileCarPlateSpan) profileCarPlateSpan.textContent = client.carPlate ? client.carPlate.toUpperCase() : "—";
  if (profileCarYearSpan) profileCarYearSpan.textContent = client.carYear ? String(client.carYear) : "—";
  if (profileOdometerSpan) profileOdometerSpan.textContent = client.odometerKm != null ? Number(client.odometerKm).toLocaleString("ru-RU") : "—";
  if (profileCarVinSpan) profileCarVinSpan.textContent = client.carVin || "—";

  // Авто — inputs (prefill)
  if (carBrandInput) carBrandInput.value = client.carBrand || "";
  if (carModelInput) carModelInput.value = client.carModel || "";
  if (carPlateInput) carPlateInput.value = client.carPlate || "";
  if (carYearInput) carYearInput.value = client.carYear != null ? String(client.carYear) : "";
  if (odometerInput) odometerInput.value = client.odometerKm != null ? String(client.odometerKm) : "";
  if (carVinInput) carVinInput.value = client.carVin || "";
  if (carErrorElement) carErrorElement.textContent = "";
  if (carSuccessElement) carSuccessElement.textContent = "";

  setVisitLoadingState("Загружаем историю визитов клиента...");
  void loadClientBonusBalance(client);
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
              <p class="workspace-visit-history-title">${escapeHtml(visit.order_number || visit.orderNumber || "Визит")} от ${escapeHtml(formatAdminDate(visit.visit_date || visit.visitDate))}</p>
              <p class="workspace-visit-history-meta">Администратор: ${escapeHtml(visit.admin_name || visit.adminName || "—")}</p>
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

profileDeleteElement?.addEventListener("click", async () => {
  if (!activeProfileClient) return;

  const confirmed = window.confirm(
    `Вы уверены, что хотите полностью удалить клиента ${
      activeProfileClient.fullName || activeProfileClient.email
    }? Это действие удалит все его визиты, сообщения в чате и транзакции. Отменить удаление невозможно!`
  );
  if (!confirmed) return;

  profileDeleteElement.disabled = true;
  profileDeleteElement.textContent = "Удаление...";

  try {
    await authFetchJson(`/users/${encodeURIComponent(activeProfileClient.id)}`, {
      method: "DELETE"
    });
    alert("Клиент успешно удален.");
    closeClientProfile();
    window.location.reload();
  } catch (error) {
    alert(error instanceof Error ? error.message : "Не удалось удалить клиента.");
    profileDeleteElement.disabled = false;
    profileDeleteElement.textContent = "Удалить клиента";
  }
});

carFormElement?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeProfileClient) return;

  if (carErrorElement) carErrorElement.textContent = "";
  if (carSuccessElement) carSuccessElement.textContent = "";
  if (carSubmitElement) carSubmitElement.disabled = true;

  const carYear = carYearInput?.value.trim();
  const odometerKm = odometerInput?.value.trim();

  const body = {
    carBrand: carBrandInput?.value.trim() || null,
    carModel: carModelInput?.value.trim() || null,
    carPlate: carPlateInput?.value.trim() || null,
    carYear: carYear ? Number(carYear) : null,
    odometerKm: odometerKm ? Number(odometerKm) : null,
    carVin: carVinInput?.value.trim() || null,
  };

  try {
    const updated = await authFetchJson(`/users/${encodeURIComponent(activeProfileClient.id)}`, {
      method: "PATCH",
      body
    });
    // Обновляем spans
    if (profileCarBrandSpan) profileCarBrandSpan.textContent = updated.carBrand || "—";
    if (profileCarModelSpan) profileCarModelSpan.textContent = updated.carModel || "—";
    if (profileCarPlateSpan) profileCarPlateSpan.textContent = updated.carPlate ? updated.carPlate.toUpperCase() : "—";
    if (profileCarYearSpan) profileCarYearSpan.textContent = updated.carYear ? String(updated.carYear) : "—";
    if (profileOdometerSpan) profileOdometerSpan.textContent = updated.odometerKm != null ? Number(updated.odometerKm).toLocaleString("ru-RU") : "—";
    if (profileCarVinSpan) profileCarVinSpan.textContent = updated.carVin || "—";
    // Обновляем локальный объект клиента
    Object.assign(activeProfileClient, {
      carBrand: updated.carBrand,
      carModel: updated.carModel,
      carPlate: updated.carPlate,
      carYear: updated.carYear,
      odometerKm: updated.odometerKm,
      carVin: updated.carVin
    });
    if (carSuccessElement) carSuccessElement.textContent = "Данные автомобиля сохранены.";
  } catch (error) {
    if (carErrorElement) carErrorElement.textContent = error instanceof Error ? error.message : "Не удалось сохранить данные автомобиля.";
  } finally {
    if (carSubmitElement) carSubmitElement.disabled = false;
  }
});

basicFormElement?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeProfileClient) return;

  if (basicErrorElement) basicErrorElement.textContent = "";
  if (basicSuccessElement) basicSuccessElement.textContent = "";
  if (basicSubmitElement) basicSubmitElement.disabled = true;

  const email = emailInput?.value.trim();
  const phone = phoneInput?.value.trim() || null;
  const fullName = fullNameInput?.value.trim() || null;

  if (!email) {
    if (basicErrorElement) basicErrorElement.textContent = "Email обязателен.";
    if (basicSubmitElement) basicSubmitElement.disabled = false;
    return;
  }

  const body = {
    email,
    phone,
    fullName
  };

  try {
    const updated = await authFetchJson(`/users/${encodeURIComponent(activeProfileClient.id)}`, {
      method: "PATCH",
      body
    });
    // Обновляем spans/titles
    profileTitleElement.textContent = updated.fullName || "Без имени";
    profileEmailElement.textContent = updated.email || "—";
    profilePhoneElement.textContent = updated.phone || "Не указан";
    // Обновляем локальный объект клиента
    Object.assign(activeProfileClient, {
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone
    });
    if (typeof renderFilteredClients === "function") {
      renderFilteredClients();
    }
    if (basicSuccessElement) basicSuccessElement.textContent = "Данные профиля сохранены.";
  } catch (error) {
    if (basicErrorElement) basicErrorElement.textContent = error instanceof Error ? error.message : "Не удалось сохранить данные профиля.";
  } finally {
    if (basicSubmitElement) basicSubmitElement.disabled = false;
  }
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

bonusFormElement?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!activeProfileClient) return;

  if (bonusErrorElement) bonusErrorElement.textContent = "";
  if (bonusSuccessElement) bonusSuccessElement.textContent = "";
  if (bonusSubmitElement) bonusSubmitElement.disabled = true;

  const type = bonusTypeSelect?.value;
  const amountStr = bonusAmountInput?.value.trim();
  const comment = bonusCommentInput?.value.trim() || null;

  if (!amountStr) {
    if (bonusErrorElement) bonusErrorElement.textContent = "Укажите сумму бонусов.";
    if (bonusSubmitElement) bonusSubmitElement.disabled = false;
    return;
  }

  const amount = Number(amountStr);
  if (isNaN(amount) || amount <= 0) {
    if (bonusErrorElement) bonusErrorElement.textContent = "Сумма бонусов должна быть больше 0.";
    if (bonusSubmitElement) bonusSubmitElement.disabled = false;
    return;
  }

  const path = type === "writeoff" ? "/bonuses/writeoff" : "/bonuses/accrual";

  try {
    await authFetchJson(path, {
      method: "POST",
      body: {
        clientId: activeProfileClient.id,
        amount,
        comment
      }
    });

    if (bonusSuccessElement) {
      bonusSuccessElement.textContent = type === "writeoff" 
        ? "Бонусы успешно списаны." 
        : "Бонусы успешно начислены.";
    }

    if (bonusAmountInput) bonusAmountInput.value = "";
    if (bonusCommentInput) bonusCommentInput.value = "";

    void loadClientBonusBalance(activeProfileClient);
    void loadClientVisits(activeProfileClient);
  } catch (error) {
    if (bonusErrorElement) {
      bonusErrorElement.textContent = error instanceof Error 
        ? error.message 
        : "Не удалось провести операцию с бонусами.";
    }
  } finally {
    if (bonusSubmitElement) bonusSubmitElement.disabled = false;
  }
});

function renderFilteredClients() {
  if (!activeTableBody) return;
  activeTableBody.innerHTML = "";

  const query = (searchPhoneInput?.value || "").trim();
  const cleanQuery = query.replace(/\D/g, "");

  const filtered = allClients.filter((client) => {
    if (!query) return true;
    const cleanPhone = (client.phone || "").replace(/\D/g, "");
    if (cleanQuery) {
      return cleanPhone.includes(cleanQuery);
    }
    return (client.phone || "").toLowerCase().includes(query.toLowerCase());
  });

  if (filtered.length === 0) {
    activeTableBody.innerHTML = '<tr><td colspan="6"><p class="workspace-empty">Клиентов с таким номером телефона не найдено.</p></td></tr>';
    return;
  }

  for (const client of filtered) {
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
    activeTableBody.appendChild(row);
    row.querySelector("[data-reset-password]")?.addEventListener("click", () => openResetModal(client));
    row.querySelector("[data-open-profile]")?.addEventListener("click", () => {
      void loadClientVisits(client);
    });
  }
}

searchPhoneInput?.addEventListener("input", renderFilteredClients);

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
    allClients = items;
    activeTableBody = tableBodyElement;
    renderFilteredClients();
  }
});
