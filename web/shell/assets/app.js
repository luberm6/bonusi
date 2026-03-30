const SESSION_KEY = "autoservice_web_session";
const REFRESH_AHEAD_SECONDS = 90;
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
    return ["127.0.0.1", "localhost", "0.0.0.0"].includes(url.hostname);
  } catch {
    return false;
  }
}

function isLocalBrowserHost(hostname) {
  return ["127.0.0.1", "localhost", "0.0.0.0"].includes(hostname);
}

function deriveRenderApiBase() {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname;
  if (!host || isLocalBrowserHost(host) || !host.endsWith(".onrender.com")) return null;

  if (host.includes("-web.")) {
    return `https://${host.replace("-web.", "-backend.")}/api/v1`;
  }

  if (!host.includes("-backend.")) {
    const parts = host.split(".");
    if (parts.length > 2) {
      parts[0] = `${parts[0]}-backend`;
      return `https://${parts.join(".")}/api/v1`;
    }
  }

  return `https://${host}/api/v1`;
}

function resolveApiBase() {
  const configured = normalizeApiBase(globalThis.__AUTOSERVICE_API_BASE__);
  if (configured) {
    const browserHost = typeof window === "undefined" ? "localhost" : window.location.hostname;
    if (!isLoopbackTarget(configured) || isLocalBrowserHost(browserHost)) {
      return configured;
    }
  }

  return deriveRenderApiBase() || "http://127.0.0.1:4000/api/v1";
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
    throw new Error(data.message || data.error || `Login failed (${response.status})`);
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
    throw new Error(data.message || `Refresh failed (${response.status})`);
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
    if (!initialResponse.ok) throw new Error(initialData.message || initialData.error || `Request failed (${initialResponse.status})`);
    return initialData;
  }

  const refreshedSession = await refreshSessionIfNeeded({ force: true });
  token = refreshedSession?.accessToken || "";
  if (!token) throw new Error("Session expired. Please login again.");

  const retryResponse = await fetch(`${getApiBase()}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const retryData = await parseJson(retryResponse);
  if (!retryResponse.ok) throw new Error(retryData.message || retryData.error || `Request failed (${retryResponse.status})`);
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
