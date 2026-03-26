import type {
  BonusBalanceCacheRecord,
  BonusHistoryCacheRecord,
  BranchCacheRecord,
  LocalMessageRecord,
  PendingActionRecord,
  VisitCacheRecord
} from "../types/offline";
import type { SqliteExecutor } from "../storage/sqlite/database";
import type { ChatSendPayload, OfflineStore } from "./offline-store";

type Row = Record<string, unknown>;

function parseJson<T>(raw: unknown): T {
  if (typeof raw !== "string") return raw as T;
  return JSON.parse(raw) as T;
}

function stringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export class SqliteOfflineStore implements OfflineStore {
  constructor(private readonly db: SqliteExecutor) {}

  async upsertLocalMessage(message: LocalMessageRecord): Promise<void> {
    await this.db.run(
      `insert into local_messages
       (local_id, client_message_id, conversation_id, sender_id, receiver_id, text, status, server_message_id, edited_at, deleted_at, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(client_message_id) do update set
         local_id=excluded.local_id,
         conversation_id=excluded.conversation_id,
         sender_id=excluded.sender_id,
         receiver_id=excluded.receiver_id,
         text=excluded.text,
         status=excluded.status,
         server_message_id=excluded.server_message_id,
         edited_at=excluded.edited_at,
         deleted_at=excluded.deleted_at,
         created_at=excluded.created_at,
         updated_at=excluded.updated_at`,
      [
        message.localId,
        message.clientMessageId,
        message.conversationId,
        message.senderId,
        message.receiverId,
        message.text,
        message.status,
        message.serverMessageId,
        message.editedAt ?? null,
        message.deletedAt ?? null,
        message.createdAt,
        message.updatedAt
      ]
    );
  }

  async getLocalMessageByClientMessageId(clientMessageId: string): Promise<LocalMessageRecord | null> {
    const rows = await this.db.all<Row>(
      `select local_id, client_message_id, conversation_id, sender_id, receiver_id, text, status, server_message_id, edited_at, deleted_at, created_at, updated_at
       from local_messages
       where client_message_id = ?
       limit 1`,
      [clientMessageId]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      localId: String(row.local_id),
      clientMessageId: String(row.client_message_id),
      conversationId: String(row.conversation_id),
      senderId: String(row.sender_id),
      receiverId: String(row.receiver_id),
      text: String(row.text),
      status: String(row.status) as LocalMessageRecord["status"],
      serverMessageId: row.server_message_id ? String(row.server_message_id) : null,
      editedAt: row.edited_at ? String(row.edited_at) : null,
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    };
  }

  async listMessagesByConversation(conversationId: string): Promise<LocalMessageRecord[]> {
    const rows = await this.db.all<Row>(
      `select local_id, client_message_id, conversation_id, sender_id, receiver_id, text, status, server_message_id, edited_at, deleted_at, created_at, updated_at
       from local_messages
       where conversation_id = ?
       order by created_at asc`,
      [conversationId]
    );
    return rows.map((row) => ({
      localId: String(row.local_id),
      clientMessageId: String(row.client_message_id),
      conversationId: String(row.conversation_id),
      senderId: String(row.sender_id),
      receiverId: String(row.receiver_id),
      text: String(row.text),
      status: String(row.status) as LocalMessageRecord["status"],
      serverMessageId: row.server_message_id ? String(row.server_message_id) : null,
      editedAt: row.edited_at ? String(row.edited_at) : null,
      deletedAt: row.deleted_at ? String(row.deleted_at) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async addPendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void> {
    await this.db.run(
      `insert into pending_actions
       (id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        action.id,
        action.type,
        stringify(action.payload),
        action.status,
        action.attempts,
        action.nextRetryAt,
        action.lastError,
        action.createdAt,
        action.updatedAt
      ]
    );
  }

  async listPendingActions(): Promise<Array<PendingActionRecord<ChatSendPayload>>> {
    const rows = await this.db.all<Row>(
      `select id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at
       from pending_actions
       order by created_at asc`
    );
    return rows.map((row) => ({
      id: String(row.id),
      type: String(row.type) as PendingActionRecord<ChatSendPayload>["type"],
      payload: parseJson<ChatSendPayload>(row.payload_json),
      status: String(row.status) as PendingActionRecord<ChatSendPayload>["status"],
      attempts: toNumber(row.attempts),
      nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : null,
      lastError: row.last_error ? String(row.last_error) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async getDuePendingActions(nowIso: string): Promise<Array<PendingActionRecord<ChatSendPayload>>> {
    const rows = await this.db.all<Row>(
      `select id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at
       from pending_actions
       where status != 'processing' and (next_retry_at is null or next_retry_at <= ?)
       order by created_at asc`,
      [nowIso]
    );
    return rows.map((row) => ({
      id: String(row.id),
      type: String(row.type) as PendingActionRecord<ChatSendPayload>["type"],
      payload: parseJson<ChatSendPayload>(row.payload_json),
      status: String(row.status) as PendingActionRecord<ChatSendPayload>["status"],
      attempts: toNumber(row.attempts),
      nextRetryAt: row.next_retry_at ? String(row.next_retry_at) : null,
      lastError: row.last_error ? String(row.last_error) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  async updatePendingAction(action: PendingActionRecord<ChatSendPayload>): Promise<void> {
    await this.db.run(
      `update pending_actions
       set type = ?, payload_json = ?, status = ?, attempts = ?, next_retry_at = ?, last_error = ?, created_at = ?, updated_at = ?
       where id = ?`,
      [
        action.type,
        stringify(action.payload),
        action.status,
        action.attempts,
        action.nextRetryAt,
        action.lastError,
        action.createdAt,
        action.updatedAt,
        action.id
      ]
    );
  }

  async deletePendingAction(actionId: string): Promise<void> {
    await this.db.run(`delete from pending_actions where id = ?`, [actionId]);
  }

  async prunePendingActions(params: { maxCount: number; expireBeforeIso: string }): Promise<number> {
    const before = await this.db.all<Row>(`select count(*) as cnt from pending_actions`);
    const beforeCount = toNumber(before[0]?.cnt);

    await this.db.run(`delete from pending_actions where created_at < ?`, [params.expireBeforeIso]);

    const rows = await this.db.all<Row>(
      `select id
       from pending_actions
       order by created_at desc`
    );
    if (rows.length > params.maxCount) {
      const toRemove = rows.slice(params.maxCount);
      for (const row of toRemove) {
        await this.db.run(`delete from pending_actions where id = ?`, [String(row.id)]);
      }
    }

    const after = await this.db.all<Row>(`select count(*) as cnt from pending_actions`);
    const afterCount = toNumber(after[0]?.cnt);
    return Math.max(0, beforeCount - afterCount);
  }

  async replaceBranchesCache(rows: BranchCacheRecord[]): Promise<void> {
    await this.db.run(`delete from branches_cache`);
    for (const row of rows) {
      await this.db.run(
        `insert into branches_cache (branch_id, payload_json, cached_at)
         values (?, ?, ?)`,
        [row.branchId, stringify(row.payload), row.cachedAt]
      );
    }
  }

  async replaceVisitsCache(clientId: string, rows: VisitCacheRecord[], maxRows: number): Promise<void> {
    await this.db.run(`delete from visits_cache where client_id = ?`, [clientId]);
    const limited = [...rows].sort((a, b) => b.visitDate.localeCompare(a.visitDate)).slice(0, maxRows);
    for (const row of limited) {
      await this.db.run(
        `insert into visits_cache (visit_id, client_id, payload_json, visit_date, cached_at)
         values (?, ?, ?, ?, ?)`,
        [row.visitId, row.clientId, stringify(row.payload), row.visitDate, row.cachedAt]
      );
    }
  }

  async upsertBonusBalance(row: BonusBalanceCacheRecord): Promise<void> {
    await this.db.run(
      `insert into bonus_balance_cache (client_id, balance, cached_at)
       values (?, ?, ?)
       on conflict(client_id) do update set
         balance = excluded.balance,
         cached_at = excluded.cached_at`,
      [row.clientId, row.balance, row.cachedAt]
    );
  }

  async replaceBonusHistory(clientId: string, rows: BonusHistoryCacheRecord[], maxRows: number): Promise<void> {
    await this.db.run(`delete from bonus_history_cache where client_id = ?`, [clientId]);
    const limited = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, maxRows);
    for (const row of limited) {
      await this.db.run(
        `insert into bonus_history_cache (operation_id, client_id, payload_json, created_at, cached_at)
         values (?, ?, ?, ?, ?)`,
        [row.operationId, row.clientId, stringify(row.payload), row.createdAt, row.cachedAt]
      );
    }
  }

  async getBranchesCache(): Promise<BranchCacheRecord[]> {
    const rows = await this.db.all<Row>(
      `select branch_id, payload_json, cached_at
       from branches_cache
       order by branch_id asc`
    );
    return rows.map((row) => ({
      branchId: String(row.branch_id),
      payload: parseJson(row.payload_json),
      cachedAt: String(row.cached_at)
    }));
  }

  async getVisitsCache(clientId: string): Promise<VisitCacheRecord[]> {
    const rows = await this.db.all<Row>(
      `select visit_id, client_id, payload_json, visit_date, cached_at
       from visits_cache
       where client_id = ?
       order by visit_date desc`,
      [clientId]
    );
    return rows.map((row) => ({
      visitId: String(row.visit_id),
      clientId: String(row.client_id),
      payload: parseJson(row.payload_json),
      visitDate: String(row.visit_date),
      cachedAt: String(row.cached_at)
    }));
  }

  async getBonusBalanceCache(clientId: string): Promise<BonusBalanceCacheRecord | null> {
    const rows = await this.db.all<Row>(
      `select client_id, balance, cached_at
       from bonus_balance_cache
       where client_id = ?
       limit 1`,
      [clientId]
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      clientId: String(row.client_id),
      balance: toNumber(row.balance),
      cachedAt: String(row.cached_at)
    };
  }

  async getBonusHistoryCache(clientId: string): Promise<BonusHistoryCacheRecord[]> {
    const rows = await this.db.all<Row>(
      `select operation_id, client_id, payload_json, created_at, cached_at
       from bonus_history_cache
       where client_id = ?
       order by created_at desc`,
      [clientId]
    );
    return rows.map((row) => ({
      operationId: String(row.operation_id),
      clientId: String(row.client_id),
      payload: parseJson(row.payload_json),
      createdAt: String(row.created_at),
      cachedAt: String(row.cached_at)
    }));
  }
}
