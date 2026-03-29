import { authFetchJson } from "/assets/app.js";
import {
  formatWorkspaceError,
  initAdminWorkspace,
  renderWorkspaceState
} from "/assets/admin-workspace.js";

const session = initAdminWorkspace();

if (session) {
  const pageState = document.getElementById("page-state");
  const form = document.getElementById("add-form");
  const formTitle = document.getElementById("form-title");
  const formSubmit = document.getElementById("form-submit");
  const formCancel = document.getElementById("form-cancel");
  const editId = document.getElementById("edit-id");
  const formModeBadge = document.getElementById("form-mode-badge");
  const formNote = document.getElementById("form-note");
  const table = document.getElementById("table");
  const tableBody = document.getElementById("tbody");
  const loading = document.getElementById("loading");
  const errorMessage = document.getElementById("add-error");
  const toast = document.getElementById("toast");

  let toastTimer = null;

  const showToast = (text, tone = "success") => {
    toast.textContent = text;
    toast.className = `workspace-toast ${tone} show`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.className = "workspace-toast";
    }, 2200);
  };

  const resetFormMode = () => {
    editId.value = "";
    formTitle.textContent = "Добавить услугу";
    formSubmit.textContent = "Добавить";
    formCancel.style.display = "none";
    formModeBadge.textContent = "Создание";
    formModeBadge.className = "badge badge-soft";
    formNote.textContent = "Новая услуга сразу станет доступна в рабочем каталоге.";
    form.reset();
  };

  const renderServices = (services) => {
    tableBody.innerHTML = "";
    if (!services.length) {
      tableBody.innerHTML =
        '<tr><td colspan="5"><p class="workspace-empty">Каталог пока пуст. Добавьте первую услугу, чтобы начать работу.</p></td></tr>';
      renderWorkspaceState(
        pageState,
        "default",
        "Каталог пока пуст",
        "Добавьте первую услугу, чтобы начать работу с визитами и расчетами.",
        "Каталог"
      );
      return;
    }

    renderWorkspaceState(
      pageState,
      "success",
      "Каталог синхронизирован",
      `В системе доступно ${services.length} услуг.`,
      "Актуально"
    );

    for (const service of services) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${service.name}</strong></td>
        <td style="color:#475569">${service.description || "—"}</td>
        <td>${Number(service.basePrice).toFixed(2)} ₽</td>
        <td><span class="${service.isActive ? "badge-on" : "badge-off"}">${service.isActive ? "Активна" : "Отключена"}</span></td>
        <td>
          <div class="workspace-inline-actions">
            <button class="btn btn-secondary" data-action="edit" data-id="${service.id}">Редактировать</button>
            <button class="btn btn-secondary" data-action="toggle" data-id="${service.id}" data-active="${service.isActive}">${service.isActive ? "Отключить" : "Включить"}</button>
          </div>
        </td>
      `;
      tableBody.appendChild(row);
    }

    tableBody.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", async () => {
        const action = button.dataset.action;
        const current = services.find((item) => item.id === button.dataset.id);
        if (!current) return;

        if (action === "edit") {
          editId.value = current.id;
          formTitle.textContent = "Редактировать услугу";
          formSubmit.textContent = "Сохранить";
          formCancel.style.display = "";
          formModeBadge.textContent = "Редактирование";
          formModeBadge.className = "badge badge-neutral";
          formNote.textContent = "Изменения сохранятся сразу после подтверждения.";
          document.getElementById("svc-name").value = current.name;
          document.getElementById("svc-desc").value = current.description || "";
          document.getElementById("svc-price").value = String(current.basePrice);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }

        button.disabled = true;
        try {
          await authFetchJson(`/services/${current.id}`, {
            method: "PATCH",
            body: { isActive: !current.isActive }
          });
          showToast(current.isActive ? "Услуга отключена" : "Услуга снова активна");
          await loadServices();
        } catch (error) {
          const message = formatWorkspaceError(error, "Не удалось изменить статус услуги");
          renderWorkspaceState(
            pageState,
            "error",
            "Не удалось обновить статус",
            message,
            "Ошибка"
          );
          showToast(message, "error");
        }
      });
    });
  };

  const loadServices = async () => {
    renderWorkspaceState(
      pageState,
      "default",
      "Загружаем каталог услуг",
      "Обновляем список услуг и их статусы.",
      "Каталог"
    );
    try {
      const services = await authFetchJson("/services");
      loading.style.display = "none";
      table.style.display = "";
      renderServices(services);
    } catch (error) {
      const message = formatWorkspaceError(error, "Не удалось загрузить каталог услуг");
      renderWorkspaceState(
        pageState,
        "error",
        "Не удалось загрузить каталог",
        message,
        "Ошибка"
      );
      loading.textContent = "Не удалось загрузить данные";
      showToast(message, "error");
    }
  };

  formCancel.addEventListener("click", resetFormMode);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";

    const payload = {
      name: document.getElementById("svc-name").value.trim(),
      description: document.getElementById("svc-desc").value.trim() || null,
      basePrice: parseFloat(document.getElementById("svc-price").value)
    };

    try {
      if (editId.value) {
        await authFetchJson(`/services/${editId.value}`, { method: "PATCH", body: payload });
        showToast("Изменения услуги сохранены");
      } else {
        await authFetchJson("/services", { method: "POST", body: payload });
        showToast("Новая услуга добавлена");
      }
      resetFormMode();
      await loadServices();
    } catch (error) {
      const message = formatWorkspaceError(error, "Не удалось сохранить услугу");
      errorMessage.textContent = message;
      showToast(message, "error");
    }
  });

  resetFormMode();
  void loadServices();
}
