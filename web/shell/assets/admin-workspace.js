import { guard, bindLogout, startSessionAutoRefresh } from "/assets/app.js";

export function initAdminWorkspace({ roles = ["admin", "super_admin"], logoutButtonId, identityElementId } = {}) {
  const session = guard(roles);
  if (!session) return null;

  startSessionAutoRefresh();

  if (logoutButtonId) {
    bindLogout(logoutButtonId);
  }

  if (identityElementId) {
    const identity = document.getElementById(identityElementId);
    if (identity) {
      identity.textContent = `${session.email} (${session.role})`;
    }
  }

  return session;
}

export function renderWorkspaceState(container, tone, title, text, badge) {
  if (!container) return;
  const badgeClass =
    tone === "error" ? "badge-danger" : tone === "success" ? "" : "badge-soft";
  container.innerHTML = `
    <div class="workspace-state" data-tone="${tone}">
      <div class="workspace-state-copy">
        <p class="workspace-state-title">${title}</p>
        <p class="workspace-state-text">${text}</p>
      </div>
      <span class="badge ${badgeClass}">${badge}</span>
    </div>
  `;
}

export function appendSuperAdminActions(container) {
  if (!container) return;
  container.insertAdjacentHTML(
    "beforeend",
    `
      <a class="workspace-action-card" href="/admin/admins/">
        <span class="workspace-action-title">Администраторы</span>
        <span class="workspace-action-meta">Открыть список администраторов и проверить статус доступа.</span>
      </a>
      <a class="workspace-action-card" href="/admin/admins/create/">
        <span class="workspace-action-title">Создать администратора</span>
        <span class="workspace-action-meta">Добавить нового администратора и выдать доступ в систему.</span>
      </a>
    `
  );
}

export function formatWorkspaceError(error, fallbackText) {
  if (!(error instanceof Error)) return fallbackText;
  const message = String(error.message || "").trim();
  if (!message) return fallbackText;
  if (/request failed/i.test(message) || /network request failed/i.test(message)) return fallbackText;
  if (/fetch/i.test(message) || /network/i.test(message)) {
    return "Соединение нестабильно. Попробуйте ещё раз.";
  }
  if (/invalid credentials/i.test(message) || /wrong password/i.test(message)) {
    return "Неверный логин или пароль.";
  }
  if (/too many requests/i.test(message) || /too many.*sends/i.test(message) || /rate limit/i.test(message) || /please slow down/i.test(message) || /please retry/i.test(message)) {
    return "Слишком много попыток. Подождите немного и повторите.";
  }
  if (/validation failed/i.test(message) || /must be valid/i.test(message) || /is required/i.test(message) || /cannot be empty/i.test(message) || /too long/i.test(message)) {
    return "Некорректные данные. Проверьте форму.";
  }
  if (/bad request/i.test(message) || /invalid.*id/i.test(message)) {
    return "Ошибка запроса. Попробуйте ещё раз.";
  }
  if (/unauthorized/i.test(message) || /not authenticated/i.test(message)) {
    return "Требуется авторизация. Обновите страницу.";
  }
  if (/access denied/i.test(message) || /forbidden/i.test(message)) {
    return "Действие недоступно для вашей роли.";
  }
  if (/not found/i.test(message)) {
    return "Данные не найдены.";
  }
  if (/server error/i.test(message) || /internal server/i.test(message)) {
    return "Ошибка сервера. Попробуйте позже.";
  }
  if (!/[а-яёА-ЯЁ]/.test(message)) return fallbackText;
  return message;
}
