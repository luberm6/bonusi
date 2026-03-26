# Mobile Offline-First Foundation (Phase 10)

## Implemented components

- SQLite schema definition for local cache + queue:
  - `local_messages`
  - `pending_actions`
  - `branches_cache`
  - `visits_cache`
  - `bonus_balance_cache`
  - `bonus_history_cache`
- Offline store abstraction + in-memory implementation for tests.
- Sync engine with:
  - queue processing
  - retry with exponential backoff
  - reconnect-triggered sync
  - cache refresh (branches/visits/bonuses)
- NetInfo connectivity bridge and reconnect handler.

## Message flow

1. Message is saved locally with `client_message_id`.
2. Pending action is enqueued (`chat.send_message`).
3. If offline: local status is `failed`, action remains in queue.
4. On reconnect: queue processor retries send.
5. On success: local message becomes `sent`, pending action removed.
6. Dedupe is guaranteed by `client_message_id` on backend, preventing duplicates after retries.

## Status model

- `sending`: message queued while online before ack.
- `sent`: server ack received.
- `failed`: offline or retry error; action remains retryable.

## Cache policy

- Branches: full replace on sync.
- Visits: per-client capped window (100 latest).
- Bonus history: per-client capped window (200 latest).
- Bonus balance: upsert latest.
