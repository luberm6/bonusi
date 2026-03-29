export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

export function money(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2)} ₽`
    : "Сумма появится после подтверждения";
}

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Дата уточняется" : date.toLocaleDateString("ru-RU");
}

export function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("ru-RU");
}

export function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

export function randomId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function friendlyErrorMessage(error, fallback) {
  if (!(error instanceof Error)) return fallback;
  const message = String(error.message || "").trim();
  if (!message) return fallback;
  if (/request failed/i.test(message) || /network request failed/i.test(message)) return fallback;
  if (/fetch/i.test(message) || /network/i.test(message)) {
    return "Похоже, соединение нестабильно. Попробуйте ещё раз через пару секунд.";
  }
  return message;
}

export function workHoursText(value) {
  if (!value || typeof value !== "object") return "";
  return typeof value.text === "string" ? value.text : "";
}
