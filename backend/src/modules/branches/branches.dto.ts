import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHONE_RE = /^[0-9+\-() ]{6,24}$/;

export type CreateBranchDto = {
  name: string;
  address: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  workHours?: Record<string, unknown>;
  description?: string | null;
  isActive: boolean;
};

export type UpdateBranchDto = {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string | null;
  workHours?: Record<string, unknown>;
  description?: string | null;
  isActive?: boolean;
};

function asNonEmptyString(value: unknown, field: string, maxLen: number): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} cannot be empty`);
  }
  if (trimmed.length > maxLen) {
    throw new HttpError(400, `${field} is too long (max ${maxLen})`);
  }
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

function parseCoordinate(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new HttpError(400, `${field} must be a valid number`);
  }
  if (value < min || value > max) {
    throw new HttpError(400, `${field} must be between ${min} and ${max}`);
  }
  return Number(value.toFixed(6));
}

function parseWorkHours(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(400, "workHours must be an object");
  }
  return value as Record<string, unknown>;
}

export function parseBranchId(id: string): string {
  if (!UUID_RE.test(id)) throw new HttpError(400, "Invalid branch id");
  return id;
}

export function parseCreateBranchDto(body: unknown): CreateBranchDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;

  const name = asNonEmptyString(input.name, "name", 140);
  const address = asNonEmptyString(input.address, "address", 300);
  const phone = parseOptionalString(input.phone, "phone", 24) ?? null;
  if (phone && !PHONE_RE.test(phone)) throw new HttpError(400, "Invalid phone");
  const description = parseOptionalString(input.description, "description", 2000) ?? null;
  const workHours = parseWorkHours(input.workHours) ?? {};
  const isActive = input.isActive === undefined ? true : Boolean(input.isActive);

  const dto: CreateBranchDto = { name, address, phone, description, workHours, isActive };
  if (input.lat !== undefined) dto.lat = parseCoordinate(input.lat, "lat", -90, 90);
  if (input.lng !== undefined) dto.lng = parseCoordinate(input.lng, "lng", -180, 180);
  return dto;
}

export function parseUpdateBranchDto(body: unknown): UpdateBranchDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const dto: UpdateBranchDto = {};

  if (input.name !== undefined) dto.name = asNonEmptyString(input.name, "name", 140);
  if (input.address !== undefined) dto.address = asNonEmptyString(input.address, "address", 300);
  if (input.lat !== undefined) dto.lat = parseCoordinate(input.lat, "lat", -90, 90);
  if (input.lng !== undefined) dto.lng = parseCoordinate(input.lng, "lng", -180, 180);
  if (input.phone !== undefined) {
    const phone = parseOptionalString(input.phone, "phone", 24) ?? null;
    if (phone && !PHONE_RE.test(phone)) throw new HttpError(400, "Invalid phone");
    dto.phone = phone;
  }
  if (input.description !== undefined) dto.description = parseOptionalString(input.description, "description", 2000) ?? null;
  if (input.workHours !== undefined) dto.workHours = parseWorkHours(input.workHours) ?? {};
  if (input.isActive !== undefined) dto.isActive = Boolean(input.isActive);

  if (Object.keys(dto).length === 0) throw new HttpError(400, "No fields to update");
  return dto;
}
