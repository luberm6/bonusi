import type {
  BonusBalanceCacheRecord,
  BonusHistoryCacheRecord,
  BranchCacheRecord,
  LocalMessageRecord,
  PendingActionRecord,
  VisitCacheRecord
} from "../types/offline";

export type ChatSendPayload = {
  conversationId: string;
  clientMessageId: string;
  senderId: string;
  receiverId: string;
  text: string;
};

export interface OfflineStore {
  upsertLocalMessage(message: LocalMessageRecord): Promise<void>;
  getLocalMessageByClientMessageId(clientMessageId: string): Promise<LocalMessageRecord | null>;
  listMessagesByConversation(conversationId: string): Promise<LocalMessageRecord[]>;

  addPendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void>;
  listPendingActions(): Promise<Array<PendingActionRecord<ChatSendPayload>>>;
  getDuePendingActions(nowIso: string): Promise<Array<PendingActionRecord<ChatSendPayload>>>;
  updatePendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void>;
  deletePendingAction(actionId: string): Promise<void>;
  prunePendingActions(params: { maxCount: number; expireBeforeIso: string }): Promise<number>;

  replaceBranchesCache(rows: BranchCacheRecord[]): Promise<void>;
  replaceVisitsCache(clientId: string, rows: VisitCacheRecord[], maxRows: number): Promise<void>;
  upsertBonusBalance(row: BonusBalanceCacheRecord): Promise<void>;
  replaceBonusHistory(clientId: string, rows: BonusHistoryCacheRecord[], maxRows: number): Promise<void>;

  getBranchesCache(): Promise<BranchCacheRecord[]>;
  getVisitsCache(clientId: string): Promise<VisitCacheRecord[]>;
  getBonusBalanceCache(clientId: string): Promise<BonusBalanceCacheRecord | null>;
  getBonusHistoryCache(clientId: string): Promise<BonusHistoryCacheRecord[]>;
}

export class MemoryOfflineStore implements OfflineStore {
  private messages = new Map<string, LocalMessageRecord>();
  private pending = new Map<string, PendingActionRecord<ChatSendPayload>>();
  private branches = new Map<string, BranchCacheRecord>();
  private visits = new Map<string, VisitCacheRecord>();
  private bonusBalance = new Map<string, BonusBalanceCacheRecord>();
  private bonusHistory = new Map<string, BonusHistoryCacheRecord>();

  async upsertLocalMessage(message: LocalMessageRecord): Promise<void> {
    this.messages.set(message.clientMessageId, message);
  }

  async getLocalMessageByClientMessageId(clientMessageId: string): Promise<LocalMessageRecord | null> {
    return this.messages.get(clientMessageId) ?? null;
  }

  async listMessagesByConversation(conversationId: string): Promise<LocalMessageRecord[]> {
    return [...this.messages.values()]
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async addPendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void> {
    this.pending.set(action.id, action);
  }

  async listPendingActions(): Promise<Array<PendingActionRecord<ChatSendPayload>>> {
    return [...this.pending.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getDuePendingActions(nowIso: string): Promise<Array<PendingActionRecord<ChatSendPayload>>> {
    return [...this.pending.values()]
      .filter((a) => a.status !== "processing" && (!a.nextRetryAt || a.nextRetryAt <= nowIso))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async updatePendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void> {
    this.pending.set(action.id, action);
  }

  async deletePendingAction(actionId: string): Promise<void> {
    this.pending.delete(actionId);
  }

  async prunePendingActions(params: { maxCount: number; expireBeforeIso: string }): Promise<number> {
    let removed = 0;
    for (const [id, row] of this.pending.entries()) {
      if (row.createdAt < params.expireBeforeIso) {
        this.pending.delete(id);
        removed += 1;
      }
    }

    const rows = [...this.pending.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    if (rows.length > params.maxCount) {
      const overflow = rows.length - params.maxCount;
      for (let i = 0; i < overflow; i += 1) {
        const oldest = rows[i];
        if (oldest) {
          this.pending.delete(oldest.id);
          removed += 1;
        }
      }
    }
    return removed;
  }

  async replaceBranchesCache(rows: BranchCacheRecord[]): Promise<void> {
    this.branches.clear();
    for (const row of rows) this.branches.set(row.branchId, row);
  }

  async replaceVisitsCache(clientId: string, rows: VisitCacheRecord[], maxRows: number): Promise<void> {
    for (const [id, row] of this.visits.entries()) {
      if (row.clientId === clientId) this.visits.delete(id);
    }
    const limited = rows.sort((a, b) => b.visitDate.localeCompare(a.visitDate)).slice(0, maxRows);
    for (const row of limited) this.visits.set(row.visitId, row);
  }

  async upsertBonusBalance(row: BonusBalanceCacheRecord): Promise<void> {
    this.bonusBalance.set(row.clientId, row);
  }

  async replaceBonusHistory(clientId: string, rows: BonusHistoryCacheRecord[], maxRows: number): Promise<void> {
    for (const [id, row] of this.bonusHistory.entries()) {
      if (row.clientId === clientId) this.bonusHistory.delete(id);
    }
    const limited = rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, maxRows);
    for (const row of limited) this.bonusHistory.set(row.operationId, row);
  }

  async getBranchesCache(): Promise<BranchCacheRecord[]> {
    return [...this.branches.values()].sort((a, b) => a.branchId.localeCompare(b.branchId));
  }

  async getVisitsCache(clientId: string): Promise<VisitCacheRecord[]> {
    return [...this.visits.values()]
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate));
  }

  async getBonusBalanceCache(clientId: string): Promise<BonusBalanceCacheRecord | null> {
    return this.bonusBalance.get(clientId) ?? null;
  }

  async getBonusHistoryCache(clientId: string): Promise<BonusHistoryCacheRecord[]> {
    return [...this.bonusHistory.values()]
      .filter((r) => r.clientId === clientId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
