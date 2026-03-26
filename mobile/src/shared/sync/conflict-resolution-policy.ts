import { resolveGenericConflict } from "./entity-conflict-policy";

type EntityPayload = Record<string, unknown>;

// Backward-compatible default resolver for callers that still use generic API.
export function resolveServerConflict(
  existingPayload: EntityPayload | null,
  incomingPayload: EntityPayload
): EntityPayload {
  return resolveGenericConflict(existingPayload, incomingPayload);
}
