import { MemoryOfflineStore } from "../src/shared/offline/offline-store";
import { MutableConnectivity } from "../src/shared/offline/connectivity";
import type { OfflineApi } from "../src/shared/offline/offline-api";
import { OfflineSyncService } from "../src/shared/sync/offline-sync-service";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

class NoopApi implements OfflineApi {
  async sendMessage() {
    return { messageId: "m-1", deduped: false, createdAt: new Date().toISOString() };
  }
  async fetchBranches() {
    return [];
  }
  async fetchVisits() {
    return [];
  }
  async fetchBonusBalance(clientId: string) {
    return { clientId, balance: 0 };
  }
  async fetchBonusHistory() {
    return [];
  }
}

async function run() {
  const store = new MemoryOfflineStore();
  const sync = new OfflineSyncService(store, new NoopApi(), new MutableConnectivity(), "client-1");

  await store.upsertLocalMessage({
    localId: "l1",
    clientMessageId: "c1",
    conversationId: "conv-1",
    senderId: "client-1",
    receiverId: "admin-1",
    text: "local edited text",
    status: "sent",
    serverMessageId: "m1",
    editedAt: new Date(Date.now() + 120_000).toISOString(),
    deletedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date(Date.now() + 120_000).toISOString()
  });

  await sync.reconcileConversationMessages("conv-1", [
    {
      id: "m1",
      clientMessageId: "c1",
      conversationId: "conv-1",
      senderId: "client-1",
      receiverId: "admin-1",
      text: "older server text",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editedAt: null,
      deletedAt: null
    }
  ]);

  const afterOlderEdit = await store.getLocalMessageByClientMessageId("c1");
  assert(afterOlderEdit?.text === "local edited text", "newer local edit should win over older server snapshot");
  console.log("message_edit_conflict_local_newer=ok");

  await sync.reconcileConversationMessages("conv-1", [
    {
      id: "m1",
      clientMessageId: "c1",
      conversationId: "conv-1",
      senderId: "client-1",
      receiverId: "admin-1",
      text: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date(Date.now() + 300_000).toISOString(),
      editedAt: null,
      deletedAt: new Date(Date.now() + 300_000).toISOString()
    }
  ]);

  const afterDelete = await store.getLocalMessageByClientMessageId("c1");
  assert(Boolean(afterDelete?.deletedAt), "server deletion should create tombstone");
  assert(afterDelete?.text === "", "deleted message should not keep visible text");
  console.log("message_delete_conflict_server_newer=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
