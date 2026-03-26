type EntityPayload = Record<string, unknown>;

export type CacheEntityType = "branches" | "visits" | "bonus_balance" | "bonus_history" | "messages";

function parseTimestamp(value: unknown): number {
  if (typeof value !== "string") return Number.NaN;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : Number.NaN;
}

function firstFinite(values: unknown[]): number {
  for (const value of values) {
    const parsed = parseTimestamp(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
}

function compareVersion(existingPayload: EntityPayload, incomingPayload: EntityPayload): number {
  const existingVersion = firstFinite([
    existingPayload.updatedAt,
    existingPayload.updated_at,
    existingPayload.editedAt,
    existingPayload.edited_at,
    existingPayload.deletedAt,
    existingPayload.deleted_at,
    existingPayload.createdAt,
    existingPayload.created_at,
    existingPayload.visitDate,
    existingPayload.visit_date
  ]);
  const incomingVersion = firstFinite([
    incomingPayload.updatedAt,
    incomingPayload.updated_at,
    incomingPayload.editedAt,
    incomingPayload.edited_at,
    incomingPayload.deletedAt,
    incomingPayload.deleted_at,
    incomingPayload.createdAt,
    incomingPayload.created_at,
    incomingPayload.visitDate,
    incomingPayload.visit_date
  ]);

  if (!Number.isFinite(existingVersion) || !Number.isFinite(incomingVersion)) return 0;
  if (incomingVersion > existingVersion) return 1;
  if (incomingVersion < existingVersion) return -1;
  return 0;
}

function resolveByVersion(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  if (!existingPayload) return incomingPayload;
  const cmp = compareVersion(existingPayload, incomingPayload);
  if (cmp === 1) return incomingPayload;
  if (cmp === -1) return existingPayload;
  return incomingPayload;
}

export function resolveGenericConflict(
  existingPayload: EntityPayload | null,
  incomingPayload: EntityPayload
): EntityPayload {
  return resolveByVersion(existingPayload, incomingPayload);
}

function resolveVisitConflict(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  // Visits are immutable from mobile offline cache perspective. Prefer the freshest backend snapshot.
  return resolveByVersion(existingPayload, incomingPayload);
}

function resolveBranchConflict(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  // Branch coordinates may be manually corrected in admin tools; latest backend state wins.
  return resolveByVersion(existingPayload, incomingPayload);
}

function resolveBonusBalanceConflict(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  // Balance is a derived value on backend; do not try to locally merge numbers.
  return resolveByVersion(existingPayload, incomingPayload);
}

function resolveBonusHistoryConflict(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  // Bonus operations are append-only; if versions are unavailable fallback to backend payload.
  return resolveByVersion(existingPayload, incomingPayload);
}

function resolveMessagePayloadConflict(existingPayload: EntityPayload | null, incomingPayload: EntityPayload): EntityPayload {
  if (!existingPayload) {
    if (incomingPayload.deletedAt || incomingPayload.deleted_at) {
      return { ...incomingPayload, text: "" };
    }
    return incomingPayload;
  }

  const cmp = compareVersion(existingPayload, incomingPayload);
  const incomingIsDeleted = Boolean(incomingPayload.deletedAt || incomingPayload.deleted_at);
  const existingIsDeleted = Boolean(existingPayload.deletedAt || existingPayload.deleted_at);

  if (incomingIsDeleted && cmp >= 0) {
    return { ...incomingPayload, text: "" };
  }
  if (existingIsDeleted && cmp < 0) {
    return existingPayload;
  }
  return resolveByVersion(existingPayload, incomingPayload);
}

export function resolveCacheEntityConflict(
  entityType: CacheEntityType,
  existingPayload: EntityPayload | null,
  incomingPayload: EntityPayload
): EntityPayload {
  switch (entityType) {
    case "branches":
      return resolveBranchConflict(existingPayload, incomingPayload);
    case "visits":
      return resolveVisitConflict(existingPayload, incomingPayload);
    case "bonus_balance":
      return resolveBonusBalanceConflict(existingPayload, incomingPayload);
    case "bonus_history":
      return resolveBonusHistoryConflict(existingPayload, incomingPayload);
    case "messages":
      return resolveMessagePayloadConflict(existingPayload, incomingPayload);
    default:
      return resolveByVersion(existingPayload, incomingPayload);
  }
}
