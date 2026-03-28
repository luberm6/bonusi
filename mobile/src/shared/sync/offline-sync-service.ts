import type { OfflineApi } from "../offline/offline-api";
import type { Connectivity } from "../offline/connectivity";
import type { ChatSendPayload, OfflineStore } from "../offline/offline-store";
import type { LocalMessageRecord, PendingActionRecord } from "../types/offline";
import { resolveCacheEntityConflict } from "./entity-conflict-policy";
import { resolveMessageConflict, type ServerMessageSnapshot } from "./message-conflict-resolution";

function randomUUID(): string {
  return globalThis.crypto.randomUUID();
}

const VISITS_CACHE_LIMIT = 100;
const BONUS_HISTORY_LIMIT = 200;
const RETRY_BASE_MS = 1500;
const PENDING_ACTIONS_LIMIT = 500;
const PENDING_ACTION_TTL_HOURS = 72;
const MAX_CHAT_SEND_ATTEMPTS = 20;

function nowIso() {
  return new Date().toISOString();
}

function nextRetryIso(attempts: number): string {
  const delay = Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), 60_000);
  return new Date(Date.now() + delay).toISOString();
}

function ttlCutoffIso(hours: number): string {
  return new Date(Date.now() - hours * 3600 * 1000).toISOString();
}

export class OfflineSyncService {
  private syncRunning = false;
  private unsubscribeConnectivity: (() => void) | null = null;

  constructor(
    private readonly store: OfflineStore,
    private readonly api: OfflineApi,
    private readonly connectivity: Connectivity,
    private readonly currentUserId: string
  ) {}

  startReconnectHandler(): void {
    this.unsubscribeConnectivity = this.connectivity.subscribe((online) => {
      if (online) {
        void this.syncAfterReconnect();
      }
    });
  }

  stopReconnectHandler(): void {
    this.unsubscribeConnectivity?.();
    this.unsubscribeConnectivity = null;
  }

  async enqueueMessage(input: {
    conversationId: string;
    senderId: string;
    receiverId: string;
    text: string;
  }): Promise<LocalMessageRecord> {
    const ts = nowIso();
    const clientMessageId = randomUUID();
    const local: LocalMessageRecord = {
      localId: randomUUID(),
      clientMessageId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      receiverId: input.receiverId,
      text: input.text,
      status: this.connectivity.isOnline() ? "sending" : "failed",
      serverMessageId: null,
      editedAt: null,
      deletedAt: null,
      createdAt: ts,
      updatedAt: ts
    };
    await this.store.upsertLocalMessage(local);

    const action: PendingActionRecord<ChatSendPayload> = {
      id: randomUUID(),
      type: "chat.send_message",
      payload: {
        conversationId: input.conversationId,
        clientMessageId,
        senderId: input.senderId,
        receiverId: input.receiverId,
        text: input.text
      },
      status: "pending",
      attempts: 0,
      nextRetryAt: null,
      lastError: null,
      createdAt: ts,
      updatedAt: ts
    };
    await this.store.addPendingAction(action);
    await this.pruneQueueIfNeeded();

    if (this.connectivity.isOnline()) {
      void this.processPendingQueue();
    }
    return local;
  }

  async syncAfterReconnect(): Promise<void> {
    if (this.syncRunning) return;
    this.syncRunning = true;
    try {
      await this.processPendingQueue();
      await this.refreshReadCaches();
    } finally {
      this.syncRunning = false;
    }
  }

  async refreshReadCaches(): Promise<void> {
    if (!this.connectivity.isOnline()) return;
    const ts = nowIso();
    const [branches, visits, bonusBalance, bonusHistory] = await Promise.all([
      this.api.fetchBranches(),
      this.api.fetchVisits(this.currentUserId),
      this.api.fetchBonusBalance(this.currentUserId),
      this.api.fetchBonusHistory(this.currentUserId)
    ]);

    const existingBranches = await this.store.getBranchesCache();
    const branchById = new Map(existingBranches.map((r) => [r.branchId, r]));
    for (const branch of branches) {
      const branchId = String(branch.id);
      const existing = branchById.get(branchId);
      const mergedPayload = resolveCacheEntityConflict(
        "branches",
        (existing?.payload as Record<string, unknown> | undefined) ?? null,
        branch as Record<string, unknown>
      );
      branchById.set(branchId, {
        branchId,
        payload: mergedPayload,
        cachedAt: ts
      });
    }
    await this.store.replaceBranchesCache([...branchById.values()]);

    const existingVisits = await this.store.getVisitsCache(this.currentUserId);
    const visitsById = new Map(existingVisits.map((r) => [r.visitId, r]));
    for (const visit of visits) {
      const visitId = String(visit.id);
      const existing = visitsById.get(visitId);
      const mergedPayload = resolveCacheEntityConflict(
        "visits",
        (existing?.payload as Record<string, unknown> | undefined) ?? null,
        visit as Record<string, unknown>
      );
      visitsById.set(visitId, {
        visitId,
        clientId: this.currentUserId,
        payload: mergedPayload,
        visitDate: String(visit.visitDate),
        cachedAt: ts
      });
    }
    await this.store.replaceVisitsCache(this.currentUserId, [...visitsById.values()], VISITS_CACHE_LIMIT);
    const existingBonusBalance = await this.store.getBonusBalanceCache(this.currentUserId);
    const mergedBonusBalance = resolveCacheEntityConflict(
      "bonus_balance",
      (existingBonusBalance as unknown as Record<string, unknown> | null) ?? null,
      bonusBalance as unknown as Record<string, unknown>
    );
    await this.store.upsertBonusBalance({
      clientId: bonusBalance.clientId,
      balance: typeof mergedBonusBalance.balance === "number" ? mergedBonusBalance.balance : bonusBalance.balance,
      cachedAt: ts
    });

    const existingBonusHistory = await this.store.getBonusHistoryCache(this.currentUserId);
    const historyByOperationId = new Map(existingBonusHistory.map((row) => [row.operationId, row]));
    await this.store.replaceBonusHistory(
      this.currentUserId,
      bonusHistory.map((h) => {
        const existing = historyByOperationId.get(String(h.id));
        return {
          operationId: String(h.id),
          clientId: this.currentUserId,
          payload: resolveCacheEntityConflict(
            "bonus_history",
            (existing?.payload as Record<string, unknown> | undefined) ?? null,
            h as unknown as Record<string, unknown>
          ),
          createdAt: String(h.createdAt),
          cachedAt: ts
        };
      }),
      BONUS_HISTORY_LIMIT
    );
  }

  async processPendingQueue(): Promise<void> {
    if (!this.connectivity.isOnline()) return;
    await this.pruneQueueIfNeeded();
    const due = await this.store.getDuePendingActions(nowIso());
    for (const action of due) {
      if (action.type !== "chat.send_message") continue;
      await this.processChatSend(action);
    }
  }

  async reconcileConversationMessages(conversationId: string, serverMessages: ServerMessageSnapshot[]): Promise<void> {
    const localMessages = await this.store.listMessagesByConversation(conversationId);
    const localByClientId = new Map(localMessages.map((m) => [m.clientMessageId, m]));
    for (const server of serverMessages) {
      if (server.conversationId !== conversationId) continue;
      const local = localByClientId.get(server.clientMessageId) ?? null;
      const merged = resolveMessageConflict(local, server);
      await this.store.upsertLocalMessage(merged);
    }
  }

  private async processChatSend(action: PendingActionRecord<ChatSendPayload>): Promise<void> {
    const ts = nowIso();
    const local = await this.store.getLocalMessageByClientMessageId(action.payload.clientMessageId);
    if (!local) {
      await this.store.deletePendingAction(action.id);
      return;
    }

    try {
      const processing: PendingActionRecord<ChatSendPayload> = {
        ...action,
        status: "processing",
        updatedAt: ts
      };
      await this.store.updatePendingAction(processing);

      const response = await this.api.sendMessage({
        conversationId: action.payload.conversationId,
        clientMessageId: action.payload.clientMessageId,
        text: action.payload.text
      });

      await this.store.upsertLocalMessage({
        ...local,
        status: "sent",
        serverMessageId: response.messageId,
        updatedAt: nowIso()
      });
      await this.store.deletePendingAction(action.id);
    } catch (error) {
      const attempts = action.attempts + 1;
      if (attempts >= MAX_CHAT_SEND_ATTEMPTS) {
        await this.store.deletePendingAction(action.id);
        await this.store.upsertLocalMessage({
          ...local,
          status: "failed",
          updatedAt: nowIso()
        });
        return;
      }
      const failed: PendingActionRecord<ChatSendPayload> = {
        ...action,
        status: "failed",
        attempts,
        nextRetryAt: nextRetryIso(attempts),
        lastError: error instanceof Error ? error.message : "Unknown sync error",
        updatedAt: nowIso()
      };
      await this.store.updatePendingAction(failed);
      await this.store.upsertLocalMessage({
        ...local,
        status: "failed",
        updatedAt: nowIso()
      });
    }
  }

  private async pruneQueueIfNeeded(): Promise<void> {
    await this.store.prunePendingActions({
      maxCount: PENDING_ACTIONS_LIMIT,
      expireBeforeIso: ttlCutoffIso(PENDING_ACTION_TTL_HOURS)
    });
  }
}
