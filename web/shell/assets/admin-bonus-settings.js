import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const pageState = document.getElementById("page-state");
  const currentBadge = document.getElementById("current-badge");
  const summaryMode = document.getElementById("summary-mode");
  const summaryValue = document.getElementById("summary-value");
  const percentageField = document.getElementById("field-percentage");
  const fixedField = document.getElementById("field-fixed");
  const percentageInput = document.getElementById("percentage-value");
  const fixedInput = document.getElementById("fixed-value");
  const saveButton = document.getElementById("save-btn");
  const errorMessage = document.getElementById("error-msg");
  const successMessage = document.getElementById("success-msg");
  const percentageModeCard = document.getElementById("mode-percentage");
  const fixedModeCard = document.getElementById("mode-fixed");
  const previewText = document.getElementById("preview-text");
  const form = document.getElementById("bonus-settings-form");

  let currentMode = "percentage";

  const modeLabel = (mode) => (mode === "fixed" ? "Фикс за визит" : "Процент от визита");

  const previewLabel = (mode) => {
    if (mode === "fixed") {
      const value = Number(fixedInput.value || 0);
      if (!Number.isFinite(value) || value <= 0) {
        return "Укажите количество бонусов, чтобы увидеть пример начисления.";
      }
      return `Если сумма визита 1 000 ₽ → будет начислено ${Math.floor(value)} бонусов`;
    }

    const value = Number(percentageInput.value || 0);
    if (!Number.isFinite(value) || value <= 0) {
      return "Укажите процент, чтобы увидеть пример начисления.";
    }
    return `Если сумма визита 1 000 ₽ → будет начислено ${Math.floor((1000 * value) / 100)} бонусов`;
  };

  const valueLabel = (mode) => {
    if (mode === "fixed") {
      const value = Number(fixedInput.value || 0);
      return value > 0 ? `${value} бонусов` : "Укажите значение";
    }
    const value = Number(percentageInput.value || 0);
    return value > 0 ? `${value.toFixed(2)} %` : "Укажите значение";
  };

  const isFormValid = () => {
    if (currentMode === "percentage") {
      const percentageValue = Number(percentageInput.value);
      return Number.isFinite(percentageValue) && percentageValue > 0;
    }
    const fixedValue = Number(fixedInput.value);
    return Number.isFinite(fixedValue) && fixedValue > 0;
  };

  const syncModeUi = () => {
    percentageModeCard.classList.toggle("is-active", currentMode === "percentage");
    fixedModeCard.classList.toggle("is-active", currentMode === "fixed");
    percentageField.style.display = currentMode === "percentage" ? "" : "none";
    fixedField.style.display = currentMode === "fixed" ? "" : "none";
    currentBadge.textContent = modeLabel(currentMode);
    summaryMode.textContent = modeLabel(currentMode);
    summaryValue.textContent = valueLabel(currentMode);
    previewText.innerHTML = previewLabel(currentMode).replace(
      /(\d+\sбонусов)/,
      "<strong>$1</strong>"
    );
    saveButton.disabled = !isFormValid();
  };

  const applySettings = (settings) => {
    currentMode = settings.accrualMode;
    percentageInput.value = settings.percentageValue ?? "";
    fixedInput.value = settings.fixedValue ?? "";
    syncModeUi();
  };

  const validateForm = () => {
    if (currentMode === "percentage") {
      const percentageValue = Number(percentageInput.value);
      if (!Number.isFinite(percentageValue) || percentageValue <= 0) {
        throw new Error("Укажите процент начисления больше нуля.");
      }
      return;
    }

    const fixedValue = Number(fixedInput.value);
    if (!Number.isFinite(fixedValue) || fixedValue <= 0) {
      throw new Error("Укажите фиксированное количество бонусов больше нуля.");
    }
  };

  const loadSettings = async () => {
    renderWorkspaceState(
      pageState,
      "default",
      "Загружаем активную схему",
      "Проверяем текущий режим начисления бонусов.",
      "Бонусы"
    );

    try {
      const settings = await authFetchJson("/bonus-settings");
      applySettings(settings);
      renderWorkspaceState(
        pageState,
        "success",
        "Настройки актуальны",
        "Текущая схема начисления загружена и готова к редактированию.",
        "Готово"
      );
    } catch (error) {
      const message = formatWorkspaceError(error, "Попробуйте ещё раз чуть позже.");
      renderWorkspaceState(
        pageState,
        "error",
        "Не удалось загрузить настройки",
        message,
        "Ошибка"
      );
      errorMessage.textContent = message;
    }
  };

  percentageModeCard.addEventListener("click", () => {
    currentMode = "percentage";
    syncModeUi();
  });

  fixedModeCard.addEventListener("click", () => {
    currentMode = "fixed";
    syncModeUi();
  });

  percentageInput.addEventListener("input", syncModeUi);
  fixedInput.addEventListener("input", syncModeUi);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    successMessage.textContent = "";

    try {
      validateForm();
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Проверьте введённые значения.");
      return;
    }

    saveButton.disabled = true;
    try {
      const payload = await authFetchJson("/bonus-settings", {
        method: "PUT",
        body: {
          accrualMode: currentMode,
          percentageValue: currentMode === "percentage" ? Number(percentageInput.value) : null,
          fixedValue: currentMode === "fixed" ? Number(fixedInput.value) : null
        }
      });
      applySettings(payload);
      successMessage.textContent = "Настройки успешно сохранены.";
      renderWorkspaceState(
        pageState,
        "success",
        "Схема обновлена",
        "Новые правила будут применяться ко всем следующим визитам.",
        "Сохранено"
      );
    } catch (error) {
      errorMessage.textContent = formatWorkspaceError(error, "Не удалось сохранить настройки.");
      renderWorkspaceState(
        pageState,
        "error",
        "Сохранение не выполнено",
        "Проверьте введённые значения и попробуйте ещё раз.",
        "Ошибка"
      );
    } finally {
      saveButton.disabled = !isFormValid();
    }
  });

  syncModeUi();
  void loadSettings();
}
