import { HttpError } from "../../common/http/error.js";
import type { UserRole } from "../../common/types/auth.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-() ]{6,24}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type CreateUserDto = {
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  fullName: string | null;
  phone: string | null;
  notes: string | null;
};

export type UpdateUserDto = {
  email?: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
  fullName?: string | null;
  phone?: string | null;
  notes?: string | null;
};

const CREATABLE_ROLES: UserRole[] = ["admin", "client"];
const UPDATABLE_ROLES: UserRole[] = ["admin", "client"];

function asTrimmedString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new HttpError(400, `${field} cannot be empty`);
  }
  return trimmed;
}

function parseOptionalString(value: unknown, field: string, maxLen: number): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (trimmed.length > maxLen) {
    throw new HttpError(400, `${field} is too long (max ${maxLen})`);
  }
  return trimmed;
}

function validateRole(value: unknown, field: string, allowed: UserRole[]): UserRole {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} must be a string`);
  }
  if (!allowed.includes(value as UserRole)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as UserRole;
}

export function parseUserId(id: string): string {
  if (!UUID_RE.test(id)) {
    throw new HttpError(400, "Invalid user id");
  }
  return id;
}

export function parseCreateUserDto(body: unknown): CreateUserDto {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Request body is required");
  }
  const input = body as Record<string, unknown>;

  const email = asTrimmedString(input.email, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, "Invalid email");
  }

  const password = asTrimmedString(input.password, "password");
  if (password.length < 8 || password.length > 128) {
    throw new HttpError(400, "password length must be between 8 and 128");
  }

  const role = validateRole(input.role, "role", CREATABLE_ROLES);

  const isActive = input.isActive === undefined ? true : Boolean(input.isActive);
  const fullName = parseOptionalString(input.fullName, "fullName", 120) ?? null;
  const phone = parseOptionalString(input.phone, "phone", 24) ?? null;
  const notes = parseOptionalString(input.notes, "notes", 1000) ?? null;
  if (phone && !PHONE_RE.test(phone)) {
    throw new HttpError(400, "Invalid phone");
  }

  return { email, password, role, isActive, fullName, phone, notes };
}

export function parseUpdateUserDto(body: unknown): UpdateUserDto {
  if (!body || typeof body !== "object") {
    throw new HttpError(400, "Request body is required");
  }
  const input = body as Record<string, unknown>;
  const dto: UpdateUserDto = {};

  if (input.email !== undefined) {
    const email = asTrimmedString(input.email, "email").toLowerCase();
    if (!EMAIL_RE.test(email)) {
      throw new HttpError(400, "Invalid email");
    }
    dto.email = email;
  }

  if (input.password !== undefined) {
    const password = asTrimmedString(input.password, "password");
    if (password.length < 8 || password.length > 128) {
      throw new HttpError(400, "password length must be between 8 and 128");
    }
    dto.password = password;
  }

  if (input.role !== undefined) {
    dto.role = validateRole(input.role, "role", UPDATABLE_ROLES);
  }
  if (input.isActive !== undefined) {
    dto.isActive = Boolean(input.isActive);
  }
  if (input.fullName !== undefined) {
    dto.fullName = parseOptionalString(input.fullName, "fullName", 120) ?? null;
  }
  if (input.phone !== undefined) {
    const phone = parseOptionalString(input.phone, "phone", 24) ?? null;
    if (phone && !PHONE_RE.test(phone)) {
      throw new HttpError(400, "Invalid phone");
    }
    dto.phone = phone;
  }
  if (input.notes !== undefined) {
    dto.notes = parseOptionalString(input.notes, "notes", 1000) ?? null;
  }

  if (Object.keys(dto).length === 0) {
    throw new HttpError(400, "No fields to update");
  }
  return dto;
}
