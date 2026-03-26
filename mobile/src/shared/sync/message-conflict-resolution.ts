import type { LocalMessageRecord } from "../types/offline";

export type ServerMessageSnapshot = {
  id: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string | null;
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
};

function ts(value: string | null | undefined): number {
  if (!value) return Number.NaN;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function isServerNewer(local: LocalMessageRecord, server: ServerMessageSnapshot): boolean {
  const localUpdated = ts(local.updatedAt);
  const serverUpdated = ts(server.updatedAt);
  if (Number.isFinite(localUpdated) && Number.isFinite(serverUpdated)) {
    return serverUpdated >= localUpdated;
  }
  return true;
}

export function resolveMessageConflict(
  local: LocalMessageRecord | null,
  server: ServerMessageSnapshot
): LocalMessageRecord {
  const base: LocalMessageRecord =
    local ?? {
      localId: `srv-${server.id}`,
      clientMessageId: server.clientMessageId,
      conversationId: server.conversationId,
      senderId: server.senderId,
      receiverId: server.receiverId,
      text: server.text ?? "",
      status: "sent",
      serverMessageId: server.id,
      editedAt: server.editedAt ?? null,
      deletedAt: server.deletedAt ?? null,
      createdAt: server.createdAt,
      updatedAt: server.updatedAt
    };

  const serverDeleted = Boolean(server.deletedAt);
  const localDeleted = Boolean(base.deletedAt);

  if (serverDeleted) {
    if (!localDeleted || isServerNewer(base, server)) {
      return {
        ...base,
        text: "",
        status: "sent",
        serverMessageId: server.id,
        deletedAt: server.deletedAt ?? server.updatedAt,
        editedAt: server.editedAt ?? null,
        updatedAt: server.updatedAt
      };
    }
    return base;
  }

  if (localDeleted) {
    // Local tombstone wins unless server clearly has newer deletion/edit timeline.
    return base;
  }

  if (isServerNewer(base, server)) {
    return {
      ...base,
      serverMessageId: server.id,
      text: server.text ?? "",
      editedAt: server.editedAt ?? null,
      deletedAt: null,
      status: "sent",
      updatedAt: server.updatedAt
    };
  }

  return base;
}
