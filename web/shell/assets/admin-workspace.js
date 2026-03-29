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
  if (error instanceof Error && error.message) return error.message;
  return fallbackText;
}
