const SESSION_KEY = "autoservice_web_session";
const REFRESH_AHEAD_SECONDS = 90;
const RENDER_BACKEND_API_BASE = "https://autoservice-backend-atyj.onrender.com/api/v1";
let refreshInFlight = null;

function normalizeApiBase(base) {
  if (!base || typeof base !== "string") return null;
  let value = base.trim();
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    value = `https://${value}`;
  }
  if (!value.endsWith("/api/v1")) {
    value = `${value.replace(/\/+$/, "")}/api/v1`;
  }
  return value;
}

function isLoopbackTarget(base) {
  try {
    const url = new URL(base);
    const host = url.hostname;
    if (!host) return true;
    if (!host.includes(".")) return true;
    const octets = host.split(".");
    return octets.length === 4 && octets.every((part) => /^\d+$/.test(part)) && Number(octets[0]) === 127;
  } catch {
    return false;
  }
}

function isLocalBrowserHost(hostname) {
  if (!hostname) return true;
  if (!hostname.includes(".")) return true;
  const octets = hostname.split(".");
  return octets.length === 4 && octets.every((part) => /^\d+$/.test(part)) && Number(octets[0]) === 127;
}

function deriveRenderApiBase() {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (!host || isLocalBrowserHost(host) || !host.endsWith(".onrender.com")) return null;

  if (host === "autoservice-web.onrender.com") {
    return RENDER_BACKEND_API_BASE;
  }

  if (host.includes("-web.")) {
    return RENDER_BACKEND_API_BASE;
  }

  return null;
}

function resolveApiBase() {
  const configured = normalizeApiBase(globalThis.__AUTOSERVICE_API_BASE__);
  if (configured) {
    const browserHost = typeof window === "undefined" ? "" : window.location.hostname;
    if (!isLoopbackTarget(configured) || isLocalBrowserHost(browserHost)) {
      return configured;
    }
  }

  if (typeof window !== "undefined") {
    return deriveRenderApiBase() || `${window.location.origin.replace(/\/+$/, "")}/api/v1`;
  }

  return "/api/v1";
}

const DEFAULT_API_BASE = resolveApiBase();

export const featureFlags = {
  filesEnabled: Boolean(globalThis.__AUTOSERVICE_FILES_ENABLED__),
  pushEnabled: Boolean(globalThis.__AUTOSERVICE_PUSH_ENABLED__),
  smtpEnabled: Boolean(globalThis.__AUTOSERVICE_SMTP_ENABLED__)
};

export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getApiBase() {
  return DEFAULT_API_BASE;
}

async function parseJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function apiLogin({ email, password }) {
  const response = await fetch(`${getApiBase()}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      device: { platform: "web", deviceName: "web-shell" }
    })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(
      data.message
      || data.error
      || "Не удалось выполнить вход. Проверьте данные и попробуйте ещё раз."
    );
  }
  return data;
}

export async function apiMe(accessToken) {
  return authFetchJson("/users/me", { accessToken });
}

function decodeJwtExp(accessToken) {
  if (!accessToken) return null;
  const parts = accessToken.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

function shouldRefreshSoon(accessToken) {
  const exp = decodeJwtExp(accessToken);
  if (!exp) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  return exp - nowSec <= REFRESH_AHEAD_SECONDS;
}

async function apiRefreshToken(refreshToken) {
  const response = await fetch(`${getApiBase()}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken })
  });
  const data = await parseJson(response);
  if (!response.ok) {
    throw new Error(data.message || "Сессия завершилась. Войдите снова.");
  }
  return data;
}

async function refreshSessionIfNeeded({ force = false } = {}) {
  const current = readSession();
  if (!current?.refreshToken) return null;
  if (!force && !shouldRefreshSoon(current.accessToken)) return current;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshed = await apiRefreshToken(current.refreshToken);
        const next = {
          ...current,
          accessToken: refreshed.accessToken,
          refreshToken: refreshed.refreshToken
        };
        writeSession(next);
        return next;
      } catch (error) {
        clearSession();
        throw error;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

export async function authFetchJson(path, { method = "GET", body, accessToken } = {}) {
  let token = accessToken || readSession()?.accessToken || "";
  const initialResponse = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (initialResponse.status !== 401) {
    const initialData = await parseJson(initialResponse);
    if (!initialResponse.ok) {
      throw new Error(
        initialData.message
        || initialData.error
        || "Не удалось выполнить действие. Попробуйте ещё раз."
      );
    }
    return initialData;
  }

  const refreshedSession = await refreshSessionIfNeeded({ force: true });
  token = refreshedSession?.accessToken || "";
  if (!token) throw new Error("Сессия завершилась. Войдите снова.");

  const retryResponse = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const retryData = await parseJson(retryResponse);
  if (!retryResponse.ok) {
    throw new Error(
      retryData.message
      || retryData.error
      || "Не удалось выполнить действие. Попробуйте ещё раз."
    );
  }
  return retryData;
}

export function startSessionAutoRefresh() {
  const run = async () => {
    const current = readSession();
    if (!current?.refreshToken) return;
    try {
      await refreshSessionIfNeeded();
    } catch {
      clearSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login/";
      }
    }
  };

  void run();
  const intervalId = window.setInterval(() => {
    void run();
  }, 60_000);
  const onVisible = () => {
    if (document.visibilityState === "visible") void run();
  };
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export async function apiLogout({ accessToken, refreshToken }) {
  await authFetchJson("/auth/logout", {
    method: "POST",
    body: { refreshToken },
    accessToken
  });
}

export function guard(roles) {
  const session = readSession();
  if (!session) {
    window.location.href = "/login/";
    return null;
  }
  if (roles && roles.length && !roles.includes(session.role)) {
    window.location.href = session.role === "client" ? "/home/" : "/admin/dashboard/";
    return null;
  }
  return session;
}

export function bindLogout(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const session = readSession();
    try {
      if (session?.accessToken) {
        await apiLogout({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken
        });
      }
    } catch {
      // Best effort logout on backend; local session must always be cleared.
    } finally {
      clearSession();
      window.location.href = "/login/";
    }
  });
}
