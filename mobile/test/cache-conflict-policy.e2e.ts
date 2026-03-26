import { resolveCacheEntityConflict } from "../src/shared/sync/entity-conflict-policy";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function run() {
  const newerVisit = resolveCacheEntityConflict(
    "visits",
    {
      id: "v1",
      finalAmount: 1200,
      updatedAt: "2026-03-20T10:00:00.000Z"
    },
    {
      id: "v1",
      finalAmount: 1500,
      updatedAt: "2026-03-21T10:00:00.000Z"
    }
  );
  assert(newerVisit.finalAmount === 1500, "visits resolver should keep newer visit snapshot");
  console.log("cache_conflict_visits_newer_wins=ok");

  const branchFallback = resolveCacheEntityConflict(
    "branches",
    {
      id: "b1",
      name: "Old",
      updatedAt: "invalid-date"
    },
    {
      id: "b1",
      name: "Backend",
      updatedAt: "invalid-date"
    }
  );
  assert(branchFallback.name === "Backend", "branches resolver should fallback to backend snapshot");
  console.log("cache_conflict_branches_backend_fallback=ok");

  const bonusBalance = resolveCacheEntityConflict(
    "bonus_balance",
    {
      clientId: "c1",
      balance: 300,
      updatedAt: "2026-03-24T10:00:00.000Z"
    },
    {
      clientId: "c1",
      balance: 150,
      updatedAt: "2026-03-25T10:00:00.000Z"
    }
  );
  assert(bonusBalance.balance === 150, "bonus balance should follow newer backend-derived value");
  console.log("cache_conflict_bonus_balance_server_authoritative=ok");

  const messageDelete = resolveCacheEntityConflict(
    "messages",
    {
      id: "m1",
      text: "keep me",
      updatedAt: "2026-03-24T10:00:00.000Z",
      deletedAt: null
    },
    {
      id: "m1",
      text: "stale text from server",
      updatedAt: "2026-03-25T10:00:00.000Z",
      deletedAt: "2026-03-25T10:00:00.000Z"
    }
  );
  assert(messageDelete.text === "", "deleted message payload should be normalized to empty text");
  console.log("cache_conflict_messages_delete_tombstone=ok");
}

run();
