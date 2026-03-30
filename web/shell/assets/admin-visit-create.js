import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const pageState = document.getElementById("page-state");
  const form = document.getElementById("visit-form");
  const errorMessage = document.getElementById("error-msg");
  const successMessage = document.getElementById("success-msg");
  const submitButton = document.getElementById("submit-btn");
  const servicesTable = document.getElementById("svc-table");
  const servicesTableBody = document.getElementById("svc-tbody");
  const noServices = document.getElementById("no-services");
  const serviceSelect = document.getElementById("add-svc-id");
  const quantityInput = document.getElementById("add-svc-qty");
  const discountInput = document.getElementById("visit-discount");
  const clientSelect = document.getElementById("sel-client");
  const branchSelect = document.getElementById("sel-branch");
  const commentInput = document.getElementById("visit-comment");
  const dateInput = document.getElementById("visit-date");
  const bonusModeLabel = document.getElementById("bonus-mode-label");
  const bonusPreviewValue = document.getElementById("bonus-preview-value");
  const bonusPreviewText = document.getElementById("bonus-preview-text");
  const visitAmountsText = document.getElementById("visit-amounts-text");

  const selectedServices = [];
  const servicesCatalog = new Map();
  let bonusSettings = null;
  let servicesLoaded = false;

  const formatMoney = (value) => `${Number(value).toFixed(2)} ₽`;
  const modeLabel = (mode) => (mode === "fixed" ? "Фикс за визит" : "Процент от визита");

  const calculateBonusPreview = (finalAmount) => {
    if (!bonusSettings || finalAmount <= 0) return 0;
    if (bonusSettings.accrualMode === "fixed") {
      return Math.max(0, Math.floor(Number(bonusSettings.fixedValue || 0)));
    }
    return Math.max(
      0,
      Math.floor((finalAmount * Number(bonusSettings.percentageValue || 0)) / 100)
    );
  };

  const refreshBonusPreview = () => {
    const rawTotal = selectedServices.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
    const discountRaw = Number(discountInput.value || 0);
    const discount = Number.isFinite(discountRaw) ? Math.max(0, discountRaw) : 0;
    const totalAmount = Number(rawTotal.toFixed(2));
    const finalAmount = Math.max(0, Number((totalAmount - discount).toFixed(2)));
    const previewBonus = calculateBonusPreview(finalAmount);

    if (!bonusSettings) {
      bonusModeLabel.textContent = "Настройки загружаются";
      bonusPreviewValue.textContent = "0 бонусов";
      bonusPreviewText.textContent =
        "Как только схема начисления загрузится, здесь появится итоговый предпросмотр.";
      visitAmountsText.textContent = "Итог визита появится после выбора услуг.";
      return;
    }

    bonusModeLabel.textContent = modeLabel(bonusSettings.accrualMode);
    bonusPreviewValue.textContent = `${previewBonus} бонусов`;
    bonusPreviewText.textContent =
      bonusSettings.accrualMode === "fixed"
        ? `За визит будет начислено фиксированное количество: ${Number(bonusSettings.fixedValue)} бонусов.`
        : `За визит будет начислено ${Number(bonusSettings.percentageValue).toFixed(2)} % от итоговой суммы после скидки.`;
    visitAmountsText.textContent = `Сумма услуг: ${formatMoney(totalAmount)} · Скидка: ${formatMoney(discount)} · Итог после скидки: ${formatMoney(finalAmount)}`;
  };

  const renderServicesTable = () => {
    servicesTableBody.innerHTML = "";
    if (!selectedServices.length) {
      servicesTable.style.display = "none";
      noServices.style.display = "";
      refreshBonusPreview();
      return;
    }

    servicesTable.style.display = "";
    noServices.style.display = "none";

    for (const [index, service] of selectedServices.entries()) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${service.name}</td>
        <td>${service.quantity}</td>
        <td><div class="workspace-inline-actions"><button type="button" class="btn btn-secondary" data-idx="${index}">Удалить</button></div></td>
      `;
      servicesTableBody.appendChild(row);
    }

    servicesTableBody.querySelectorAll("button[data-idx]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedServices.splice(Number(button.dataset.idx), 1);
        renderServicesTable();
      });
    });

    refreshBonusPreview();
  };

  const populateSelect = (select, placeholder, items, getLabel) => {
    select.innerHTML = `<option value="">${placeholder}</option>`;
    for (const item of items) {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = getLabel(item);
      select.appendChild(option);
    }
  };

  const loadData = async () => {
    renderWorkspaceState(
      pageState,
      "default",
      "Загружаем справочники",
      "Подтягиваем клиентов, филиалы и список активных услуг.",
      "Визиты"
    );

    const [usersResult, branchesResult, servicesResult, bonusSettingsResult] =
      await Promise.allSettled([
        authFetchJson("/users"),
        authFetchJson("/branches"),
        authFetchJson("/services"),
        authFetchJson("/bonus-settings")
      ]);

    if (
      usersResult.status === "rejected" ||
      branchesResult.status === "rejected" ||
      servicesResult.status === "rejected" ||
      bonusSettingsResult.status === "rejected"
    ) {
      renderWorkspaceState(
        pageState,
        "error",
        "Справочники загружены частично",
        "Часть данных сейчас недоступна. Проверьте backend и права доступа.",
        "Требует внимания"
      );
    } else {
      renderWorkspaceState(
        pageState,
        "success",
        "Справочники готовы",
        "Можно оформлять визит и добавлять услуги в состав.",
        "Готово"
      );
    }

    const users = usersResult.status === "fulfilled" ? usersResult.value : [];
    const branches = branchesResult.status === "fulfilled" ? branchesResult.value : [];
    const services = servicesResult.status === "fulfilled" ? servicesResult.value : [];
    bonusSettings = bonusSettingsResult.status === "fulfilled" ? bonusSettingsResult.value : null;

    populateSelect(
      clientSelect,
      "— Выберите клиента —",
      users.filter((user) => user.role === "client"),
      (user) => user.fullName || user.email
    );

    populateSelect(
      branchSelect,
      "— Выберите филиал —",
      branches.filter((branch) => branch.isActive),
      (branch) => branch.name
    );

    serviceSelect.innerHTML = '<option value="">— Выберите услугу —</option>';
    for (const service of services.filter((item) => item.isActive)) {
      servicesCatalog.set(service.id, service);
      const option = document.createElement("option");
      option.value = service.id;
      option.dataset.name = service.name;
      option.dataset.basePrice = String(service.basePrice);
      option.textContent = `${service.name} — ${Number(service.basePrice).toFixed(2)} ₽`;
      serviceSelect.appendChild(option);
    }

    servicesLoaded = true;
    document.getElementById("add-svc-btn").disabled = !services.length;
    refreshBonusPreview();
  };

  document.getElementById("add-svc-btn").addEventListener("click", () => {
    if (!servicesLoaded) return;
    const quantity = parseInt(quantityInput.value, 10);
    if (!serviceSelect.value || !quantity || quantity < 1) return;

    const existing = selectedServices.find((service) => service.serviceId === serviceSelect.value);
    if (existing) {
      existing.quantity += quantity;
    } else {
      const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
      selectedServices.push({
        serviceId: serviceSelect.value,
        name: selectedOption.dataset.name,
        quantity,
        price: Number(selectedOption.dataset.basePrice || 0)
      });
    }

    quantityInput.value = "1";
    renderServicesTable();
  });

  discountInput.addEventListener("input", refreshBonusPreview);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    successMessage.textContent = "";

    if (!clientSelect.value) {
      errorMessage.textContent = "Сначала выберите клиента";
      return;
    }
    if (!branchSelect.value) {
      errorMessage.textContent = "Сначала выберите филиал";
      return;
    }
    if (!selectedServices.length) {
      errorMessage.textContent = "Добавьте хотя бы одну услугу";
      return;
    }

    const discountRaw = Number(discountInput.value || 0);
    const discountAmount = Number.isFinite(discountRaw) ? Math.max(0, discountRaw) : 0;
    submitButton.disabled = true;

    try {
      const body = {
        clientId: clientSelect.value,
        branchId: branchSelect.value,
        discountAmount,
        services: selectedServices.map((service) => ({
          serviceId: service.serviceId,
          quantity: service.quantity
        }))
      };
      if (dateInput.value) body.visitDate = dateInput.value;
      if (commentInput.value.trim()) body.comment = commentInput.value.trim();

      const result = await authFetchJson("/visits", { method: "POST", body });
      const bonusText =
        typeof result.bonusAccrualAmount === "number"
          ? ` Клиенту автоматически начислено ${result.bonusAccrualAmount} бонусов.`
          : "";
      successMessage.textContent = `Визит успешно создан. Номер визита: ${result.id}.${bonusText}`;

      selectedServices.length = 0;
      form.reset();
      discountInput.value = "0";
      renderServicesTable();
      refreshBonusPreview();
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Не удалось создать визит");
    } finally {
      submitButton.disabled = false;
    }
  });

  renderServicesTable();
  void loadData().catch((error) => {
    renderWorkspaceState(
      pageState,
      "error",
      "Не удалось подготовить создание визита",
      formatWorkspaceError(error, "Попробуйте обновить страницу чуть позже."),
      "Ошибка"
    );
  });
}
