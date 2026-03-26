export type MessageDeliveryStatus = "sending" | "sent" | "failed";

export type PendingActionType = "chat.send_message";

export type PendingActionStatus = "pending" | "processing" | "failed";

export type LocalMessageRecord = {
  localId: string;
  clientMessageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  status: MessageDeliveryStatus;
  serverMessageId: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PendingActionRecord<TPayload = unknown> = {
  id: string;
  type: PendingActionType;
  payload: TPayload;
  status: PendingActionStatus;
  attempts: number;
  nextRetryAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BranchCacheRecord = {
  branchId: string;
  payload: unknown;
  cachedAt: string;
};

export type VisitCacheRecord = {
  visitId: string;
  clientId: string;
  payload: unknown;
  visitDate: string;
  cachedAt: string;
};

export type BonusBalanceCacheRecord = {
  clientId: string;
  balance: number;
  cachedAt: string;
};

export type BonusHistoryCacheRecord = {
  operationId: string;
  clientId: string;
  payload: unknown;
  createdAt: string;
  cachedAt: string;
};
