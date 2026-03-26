import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VisitItemDto = {
  serviceId: string;
  price?: number;
  quantity: number;
};

export type CreateVisitDto = {
  clientId: string;
  branchId: string;
  visitDate: string;
  comment?: string | null;
  discountAmount: number;
  services: VisitItemDto[];
};

export type VisitsFilterDto = {
  clientId?: string;
  adminId?: string;
  branchId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw new HttpError(400, `${field} must be a valid uuid`);
  return value;
}

function parseMoney(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) throw new HttpError(400, `${field} must be a number`);
  if (n < 0) throw new HttpError(400, `${field} cannot be negative`);
  return Number(n.toFixed(2));
}

function parseQty(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) throw new HttpError(400, "quantity must be a number");
  if (n <= 0) throw new HttpError(400, "quantity must be > 0");
  return Number(n.toFixed(2));
}

function parseOptionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new HttpError(400, `${field} must be ISO date string`);
  const t = Date.parse(value);
  if (Number.isNaN(t)) throw new HttpError(400, `${field} is invalid date`);
  return new Date(t).toISOString();
}

export function parseVisitId(id: string): string {
  if (!UUID_RE.test(id)) throw new HttpError(400, "Invalid visit id");
  return id;
}

export function parseCreateVisitDto(body: unknown): CreateVisitDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  if (!Array.isArray(input.services) || input.services.length === 0) {
    throw new HttpError(400, "services must be non-empty array");
  }

  const services = input.services.map((item, idx) => {
    if (!item || typeof item !== "object") throw new HttpError(400, `services[${idx}] must be object`);
    const row = item as Record<string, unknown>;
    return {
      serviceId: parseUuid(row.serviceId, `services[${idx}].serviceId`),
      price: row.price === undefined ? undefined : parseMoney(row.price, `services[${idx}].price`),
      quantity: parseQty(row.quantity)
    };
  });
  const serviceIds = services.map((s) => s.serviceId);
  if (new Set(serviceIds).size !== serviceIds.length) {
    throw new HttpError(400, "services must not contain duplicate serviceId");
  }

  const discountAmount = input.discountAmount === undefined ? 0 : parseMoney(input.discountAmount, "discountAmount");
  const comment =
    input.comment === undefined || input.comment === null
      ? null
      : (() => {
          if (typeof input.comment !== "string") throw new HttpError(400, "comment must be a string");
          const trimmed = input.comment.trim();
          return trimmed ? trimmed.slice(0, 2000) : null;
        })();

  return {
    clientId: parseUuid(input.clientId, "clientId"),
    branchId: parseUuid(input.branchId, "branchId"),
    visitDate: parseOptionalDate(input.visitDate, "visitDate") ?? new Date().toISOString(),
    discountAmount,
    comment,
    services
  };
}

export function parseVisitsFilter(query: Record<string, unknown>): VisitsFilterDto {
  const pick = (value: unknown): string | undefined => {
    if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
    return typeof value === "string" ? value : undefined;
  };
  const clientId = pick(query.clientId);
  const adminId = pick(query.adminId);
  const branchId = pick(query.branchId);
  const dateFrom = parseOptionalDate(pick(query.dateFrom), "dateFrom");
  const dateTo = parseOptionalDate(pick(query.dateTo), "dateTo");

  if (clientId && !UUID_RE.test(clientId)) throw new HttpError(400, "clientId filter is invalid");
  if (adminId && !UUID_RE.test(adminId)) throw new HttpError(400, "adminId filter is invalid");
  if (branchId && !UUID_RE.test(branchId)) throw new HttpError(400, "branchId filter is invalid");
  if (dateFrom && dateTo && Date.parse(dateFrom) > Date.parse(dateTo)) {
    throw new HttpError(400, "dateFrom cannot be after dateTo");
  }

  return { clientId, adminId, branchId, dateFrom, dateTo };
}
