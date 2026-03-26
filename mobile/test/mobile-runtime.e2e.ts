import { createMobileRuntime } from "../src/app/runtime/mobile-runtime";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

class InMemorySqliteDb {
  private local = new Map<string, Record<string, unknown>>();
  private pending = new Map<string, Record<string, unknown>>();
  private branches = new Map<string, Record<string, unknown>>();
  private visits = new Map<string, Record<string, unknown>>();
  private bonusBalance = new Map<string, Record<string, unknown>>();
  private bonusHistory = new Map<string, Record<string, unknown>>();

  async runAsync(sql: string, params: unknown[] = []): Promise<void> {
    const s = sql.trim().toLowerCase();

    if (s.startsWith("create table") || s.startsWith("create index") || s.startsWith("alter table")) return;

    if (s.startsWith("insert into local_messages")) {
      const [
        local_id,
        client_message_id,
        conversation_id,
        sender_id,
        receiver_id,
        text,
        status,
        server_message_id,
        edited_at,
        deleted_at,
        created_at,
        updated_at
      ] = params;
      this.local.set(String(client_message_id), {
        local_id,
        client_message_id,
        conversation_id,
        sender_id,
        receiver_id,
        text,
        status,
        server_message_id,
        edited_at,
        deleted_at,
        created_at,
        updated_at
      });
      return;
    }

    if (s.startsWith("delete from pending_actions where id = ?")) {
      this.pending.delete(String(params[0]));
      return;
    }
    if (s.startsWith("delete from pending_actions where created_at < ?")) {
      const cutoff = String(params[0]);
      for (const [k, v] of this.pending.entries()) {
        if (String(v.created_at) < cutoff) this.pending.delete(k);
      }
      return;
    }
    if (s.startsWith("insert into pending_actions")) {
      const [id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at] = params;
      this.pending.set(String(id), { id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at });
      return;
    }
    if (s.startsWith("update pending_actions")) {
      const [type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at, id] = params;
      this.pending.set(String(id), { id, type, payload_json, status, attempts, next_retry_at, last_error, created_at, updated_at });
      return;
    }

    if (s.startsWith("delete from branches_cache")) {
      this.branches.clear();
      return;
    }
    if (s.startsWith("insert into branches_cache")) {
      const [branch_id, payload_json, cached_at] = params;
      this.branches.set(String(branch_id), { branch_id, payload_json, cached_at });
      return;
    }

    if (s.startsWith("delete from visits_cache where client_id = ?")) {
      const clientId = String(params[0]);
      for (const [k, v] of this.visits.entries()) {
        if (String(v.client_id) === clientId) this.visits.delete(k);
      }
      return;
    }
    if (s.startsWith("insert into visits_cache")) {
      const [visit_id, client_id, payload_json, visit_date, cached_at] = params;
      this.visits.set(String(visit_id), { visit_id, client_id, payload_json, visit_date, cached_at });
      return;
    }

    if (s.startsWith("insert into bonus_balance_cache")) {
      const [client_id, balance, cached_at] = params;
      this.bonusBalance.set(String(client_id), { client_id, balance, cached_at });
      return;
    }

    if (s.startsWith("delete from bonus_history_cache where client_id = ?")) {
      const clientId = String(params[0]);
      for (const [k, v] of this.bonusHistory.entries()) {
        if (String(v.client_id) === clientId) this.bonusHistory.delete(k);
      }
      return;
    }
    if (s.startsWith("insert into bonus_history_cache")) {
      const [operation_id, client_id, payload_json, created_at, cached_at] = params;
      this.bonusHistory.set(String(operation_id), { operation_id, client_id, payload_json, created_at, cached_at });
      return;
    }
  }

  async getAllAsync<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.trim().toLowerCase();
    if (s.startsWith("select count(*) as cnt from pending_actions")) return [{ cnt: this.pending.size } as T];
    if (s.startsWith("select id from pending_actions")) return [...this.pending.values()] as T[];
    if (s.includes("from pending_actions")) return [...this.pending.values()] as T[];
    if (s.includes("from local_messages")) return [...this.local.values()] as T[];
    if (s.includes("from branches_cache")) return [...this.branches.values()] as T[];
    if (s.includes("from visits_cache")) {
      const clientId = String(params[0] ?? "");
      return [...this.visits.values()].filter((r) => String(r.client_id) === clientId) as T[];
    }
    if (s.includes("from bonus_balance_cache")) {
      const clientId = String(params[0] ?? "");
      const row = this.bonusBalance.get(clientId);
      return row ? ([row] as T[]) : [];
    }
    if (s.includes("from bonus_history_cache")) {
      const clientId = String(params[0] ?? "");
      return [...this.bonusHistory.values()].filter((r) => String(r.client_id) === clientId) as T[];
    }
    return [];
  }
}

async function run() {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string) => {
    if (url.includes("/branches")) return new Response(JSON.stringify([]), { status: 200 });
    if (url.includes("/visits")) return new Response(JSON.stringify([]), { status: 200 });
    if (url.includes("/bonuses/balance")) return new Response(JSON.stringify({ clientId: "client-1", balance: 0 }), { status: 200 });
    if (url.includes("/bonuses/history")) return new Response(JSON.stringify([]), { status: 200 });
    return new Response(JSON.stringify({}), { status: 200 });
  }) as typeof fetch;

  const db = new InMemorySqliteDb();
  let listener: ((state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) | null = null;
  const netInfo = {
    addEventListener(cb: (state: { isConnected: boolean | null; isInternetReachable: boolean | null }) => void) {
      listener = cb;
      return () => {
        listener = null;
      };
    },
    async fetch() {
      return { isConnected: true, isInternetReachable: true };
    }
  };

  const runtime = await createMobileRuntime({
    currentUserId: "client-1",
    getAccessToken: () => "token",
    sqlite: { openDatabaseAsync: async () => db },
    netInfo
  });
  assert(runtime.store !== null, "store should be created");
  assert(runtime.sync !== null, "sync should be created");
  assert(runtime.reconnect !== null, "reconnect handler should be created");
  console.log("mobile_runtime_bootstrap=ok");

  try {
    await runtime.reconnect.start();
    listener?.({ isConnected: true, isInternetReachable: true });
    runtime.reconnect.stop();
    console.log("mobile_runtime_reconnect_lifecycle=ok");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
