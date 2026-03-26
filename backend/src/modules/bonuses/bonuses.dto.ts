import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type BonusOperationDto = {
  clientId: string;
  visitId?: string;
  amount: number;
  comment?: string | null;
};

export type BonusQueryDto = {
  clientId?: string;
};

function parseUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID_RE.test(value)) {
    throw new HttpError(400, `${field} must be valid uuid`);
  }
  return value;
}

function parseMoney(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) throw new HttpError(400, `${field} must be number`);
  if (n <= 0) throw new HttpError(400, `${field} must be > 0`);
  return Number(n.toFixed(2));
}

export function parseBonusOperationDto(body: unknown): BonusOperationDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const comment =
    input.comment === undefined || input.comment === null
      ? null
      : (() => {
          if (typeof input.comment !== "string") throw new HttpError(400, "comment must be string");
          const trimmed = input.comment.trim();
          return trimmed ? trimmed.slice(0, 1000) : null;
        })();

  return {
    clientId: parseUuid(input.clientId, "clientId"),
    visitId: input.visitId === undefined || input.visitId === null ? undefined : parseUuid(input.visitId, "visitId"),
    amount: parseMoney(input.amount, "amount"),
    comment
  };
}

export function parseBonusQuery(query: Record<string, unknown>): BonusQueryDto {
  const pick = (v: unknown): string | undefined => {
    if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : undefined;
    return typeof v === "string" ? v : undefined;
  };
  const clientId = pick(query.client_id) ?? pick(query.clientId);
  if (clientId && !UUID_RE.test(clientId)) throw new HttpError(400, "client_id is invalid");
  return { clientId };
}
