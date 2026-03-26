import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateServiceDto = {
  name: string;
  description: string | null;
  basePrice: number;
  isActive: boolean;
};

export type UpdateServiceDto = {
  name?: string;
  description?: string | null;
  basePrice?: number;
  isActive?: boolean;
};

function parseRequiredString(value: unknown, field: string, maxLen: number): string {
  if (typeof value !== "string") throw new HttpError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) throw new HttpError(400, `${field} cannot be empty`);
  if (trimmed.length > maxLen) throw new HttpError(400, `${field} is too long (max ${maxLen})`);
  return trimmed;
}

function parseOptionalString(value: unknown, field: string, maxLen: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") throw new HttpError(400, `${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLen) throw new HttpError(400, `${field} is too long (max ${maxLen})`);
  return trimmed;
}

function parseMoney(value: unknown, field: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || Number.isNaN(n)) throw new HttpError(400, `${field} must be a number`);
  if (n < 0) throw new HttpError(400, `${field} cannot be negative`);
  return Number(n.toFixed(2));
}

export function parseServiceId(id: string): string {
  if (!UUID_RE.test(id)) throw new HttpError(400, "Invalid service id");
  return id;
}

export function parseCreateServiceDto(body: unknown): CreateServiceDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;

  return {
    name: parseRequiredString(input.name, "name", 140),
    description: parseOptionalString(input.description, "description", 2000) ?? null,
    basePrice: parseMoney(input.basePrice, "basePrice"),
    isActive: input.isActive === undefined ? true : Boolean(input.isActive)
  };
}

export function parseUpdateServiceDto(body: unknown): UpdateServiceDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const dto: UpdateServiceDto = {};

  if (input.name !== undefined) dto.name = parseRequiredString(input.name, "name", 140);
  if (input.description !== undefined) dto.description = parseOptionalString(input.description, "description", 2000) ?? null;
  if (input.basePrice !== undefined) dto.basePrice = parseMoney(input.basePrice, "basePrice");
  if (input.isActive !== undefined) dto.isActive = Boolean(input.isActive);

  if (Object.keys(dto).length === 0) throw new HttpError(400, "No fields to update");
  return dto;
}
