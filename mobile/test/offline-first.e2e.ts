import { randomUUID } from "crypto";
import { MutableConnectivity } from "../src/shared/offline/connectivity";
import type { OfflineApi, SendMessageRequest, SendMessageResponse } from "../src/shared/offline/offline-api";
import { MemoryOfflineStore } from "../src/shared/offline/offline-store";
import { OfflineSyncService } from "../src/shared/sync/offline-sync-service";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

class FakeOfflineApi implements OfflineApi {
  private messagesByClientId = new Map<string, { messageId: string; text: string; createdAt: string }>();

  constructor(private readonly isOnlineRef: () => boolean) {}

  async sendMessage(input: SendMessageRequest): Promise<SendMessageResponse> {
    if (!this.isOnlineRef()) {
      throw new Error("Network is offline");
    }
    const existing = this.messagesByClientId.get(input.clientMessageId);
    if (existing) {
      return {
        messageId: existing.messageId,
        deduped: true,
        createdAt: existing.createdAt
      };
    }
    const created = {
      messageId: randomUUID(),
      text: input.text,
      createdAt: new Date().toISOString()
    };
    this.messagesByClientId.set(input.clientMessageId, created);
    return {
      messageId: created.messageId,
      deduped: false,
      createdAt: created.createdAt
    };
  }

  async fetchBranches(): Promise<Array<{ id: string; [k: string]: unknown }>> {
    if (!this.isOnlineRef()) throw new Error("Network is offline");
    return [
      { id: "b-1", name: "North" },
      { id: "b-2", name: "South" }
    ];
  }

  async fetchVisits(clientId: string): Promise<Array<{ id: string; visitDate: string; [k: string]: unknown }>> {
    if (!this.isOnlineRef()) throw new Error("Network is offline");
    const base = Date.now();
    return new Array(120).fill(null).map((_, idx) => ({
      id: `v-${idx + 1}`,
      clientId,
      visitDate: new Date(base - idx * 60_000).toISOString(),
      finalAmount: idx
    }));
  }

  async fetchBonusBalance(clientId: string): Promise<{ clientId: string; balance: number }> {
    if (!this.isOnlineRef()) throw new Error("Network is offline");
    return { clientId, balance: 42 };
  }

  async fetchBonusHistory(clientId: string): Promise<Array<{ id: string; createdAt: string; [k: string]: unknown }>> {
    if (!this.isOnlineRef()) throw new Error("Network is offline");
    const base = Date.now();
    return new Array(230).fill(null).map((_, idx) => ({
      id: `bh-${idx + 1}`,
      clientId,
      amount: idx,
      createdAt: new Date(base - idx * 120_000).toISOString()
    }));
  }

  serverMessageCount(): number {
    return this.messagesByClientId.size;
  }
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const connectivity = new MutableConnectivity();
  connectivity.setOnline(false);
  const store = new MemoryOfflineStore();
  const api = new FakeOfflineApi(() => connectivity.isOnline());
  const sync = new OfflineSyncService(store, api, connectivity, "client-1");
  sync.startReconnectHandler();

  const local = await sync.enqueueMessage({
    conversationId: "conv-1",
    senderId: "client-1",
    receiverId: "admin-1",
    text: "hello offline"
  });
  assert(local.status === "failed", "offline message should be failed locally before retry");
  assert(api.serverMessageCount() === 0, "server should not get message while offline");

  const dueOffline = await store.getDuePendingActions("9999-12-31T00:00:00.000Z");
  assert(dueOffline.length === 1, "pending queue must contain offline message");

  connectivity.setOnline(true);
  await wait(50);

  const synced = await store.getLocalMessageByClientMessageId(local.clientMessageId);
  assert(synced?.status === "sent", "message should become sent after reconnect retry");
  assert(api.serverMessageCount() === 1, "server should contain exactly one message after retry");

  await sync.processPendingQueue();
  assert(api.serverMessageCount() === 1, "no duplicates should appear after repeated sync");

  const onlineMessage = await sync.enqueueMessage({
    conversationId: "conv-1",
    senderId: "client-1",
    receiverId: "admin-1",
    text: "hello online"
  });
  assert(onlineMessage.status === "sending", "online enqueue should mark message as sending first");
  await wait(50);
  const onlineSynced = await store.getLocalMessageByClientMessageId(onlineMessage.clientMessageId);
  assert(onlineSynced?.status === "sent", "online message should be delivered as sent");

  const branches = await store.getBranchesCache();
  assert(branches.length === 2, "branches cache should be refreshed on reconnect");

  const visits = await store.getVisitsCache("client-1");
  assert(visits.length === 100, "visits cache should be limited to reasonable window (100)");

  const bonusBalance = await store.getBonusBalanceCache("client-1");
  assert(bonusBalance?.balance === 42, "bonus balance cache should be refreshed");

  const bonusHistory = await store.getBonusHistoryCache("client-1");
  assert(bonusHistory.length === 200, "bonus history cache should be limited to reasonable window (200)");

  const oldTs = new Date(Date.now() - 80 * 3600 * 1000).toISOString();
  await store.addPendingAction({
    id: "old-pending",
    type: "chat.send_message",
    payload: {
      conversationId: "conv-ttl",
      clientMessageId: randomUUID(),
      senderId: "client-1",
      receiverId: "admin-1",
      text: "stale"
    },
    status: "failed",
    attempts: 3,
    nextRetryAt: null,
    lastError: "timeout",
    createdAt: oldTs,
    updatedAt: oldTs
  });

  connectivity.setOnline(false);
  for (let i = 0; i < 520; i += 1) {
    await sync.enqueueMessage({
      conversationId: "conv-overflow",
      senderId: "client-1",
      receiverId: "admin-1",
      text: `overflow-${i}`
    });
  }
  const pendingAfterPrune = await store.listPendingActions();
  assert(pendingAfterPrune.length <= 500, "pending queue should be capped");
  assert(!pendingAfterPrune.some((a) => a.id === "old-pending"), "expired pending action should be pruned by TTL");

  await store.replaceVisitsCache(
    "client-1",
    [
      {
        visitId: "v-conflict",
        clientId: "client-1",
        payload: {
          id: "v-conflict",
          visitDate: new Date(Date.now() + 60_000).toISOString(),
          updatedAt: new Date(Date.now() + 60_000).toISOString(),
          finalAmount: 999
        },
        visitDate: new Date(Date.now() + 60_000).toISOString(),
        cachedAt: new Date().toISOString()
      }
    ],
    100
  );
  connectivity.setOnline(true);
  await sync.refreshReadCaches();
  const visitsAfterConflictSync = await store.getVisitsCache("client-1");
  const conflictVisit = visitsAfterConflictSync.find((v) => v.visitId === "v-conflict");
  assert(conflictVisit, "conflict visit should stay in cache");
  assert(
    (conflictVisit?.payload as { finalAmount?: number }).finalAmount === 999,
    "newer local/server-known visit snapshot should win over older incoming payload"
  );

  console.log("offline_send=ok");
  console.log("reconnect_retry=ok");
  console.log("message_statuses_sending_sent_failed=ok");
  console.log("no_duplicate_after_sync=ok");
  console.log("branches_cache=ok");
  console.log("visits_cache_limit=ok");
  console.log("bonus_cache_limit=ok");
  console.log("pending_queue_prune_ttl_limit=ok");
  console.log("conflict_resolution_policy=ok");

  sync.stopReconnectHandler();
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
