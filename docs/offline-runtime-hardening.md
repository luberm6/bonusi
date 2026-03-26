# Offline Runtime Hardening Notes

## What was improved

- Added real SQLite-backed store implementation:
  - `mobile/src/shared/offline/sqlite-offline-store.ts`
- Added RN SQLite executor adapter for runtime DB implementations:
  - `mobile/src/shared/storage/sqlite/rn-sqlite-executor.ts`
- Added runtime factory:
  - `mobile/src/shared/offline/runtime-offline-store.ts`

## Queue safety

- Pending queue now has guardrails in `OfflineSyncService`:
  - max pending actions: `500`
  - TTL for stale actions: `72h`
  - max retries per message: `20`
- Stale/overflow pending actions are pruned automatically on enqueue and queue processing.

## Conflict-resolution policy

- Added per-entity conflict policy module:
  - `mobile/src/shared/sync/entity-conflict-policy.ts`
- Cache sync now resolves by explicit entity type:
  - `branches`: latest backend state wins (supports admin-side coord fixes)
  - `visits`: latest backend snapshot wins (immutable financial source of truth)
  - `bonus_balance`: backend-derived balance wins (no local arithmetic merge)
  - `bonus_history`: backend snapshot wins when versions are ambiguous
- Legacy `conflict-resolution-policy.ts` remains as generic compatibility wrapper.

### Message domain rules (edit/delete)

- Added `mobile/src/shared/sync/message-conflict-resolution.ts`.
- Added `OfflineSyncService.reconcileConversationMessages(...)`.
- Rules:
  - newer server delete creates local tombstone (`deletedAt`, empty text)
  - newer local edit is preserved against older server snapshot
  - server snapshot is applied only when it is newer than local message state

## Runtime wiring sketch (React Native)

```ts
import * as SQLite from "expo-sqlite";
import { createRuntimeOfflineStore } from "@/shared/offline/runtime-offline-store";

const db = await SQLite.openDatabaseAsync("autoservice-offline.db");
const store = await createRuntimeOfflineStore(db);
```

This replaces `MemoryOfflineStore` in runtime while keeping tests and interfaces stable.

Implemented concrete runtime composition:

- `mobile/src/app/runtime/mobile-runtime.ts`
  - `createMobileRuntime(...)` with injected SQLite/NetInfo modules
  - `createMobileRuntimeWithExpo(...)` dynamic imports for `expo-sqlite` + `@react-native-community/netinfo`

Added app-level bootstrap orchestrator:

- `mobile/src/app/bootstrap/mobile-app-bootstrap.ts`
  - restores auth session
  - resolves role navigation
  - creates runtime via `createMobileRuntimeWithExpo(...)`
  - starts/stops reconnect lifecycle
- `mobile/src/app/entrypoint/start-mobile-app-shell.ts`
  - thin entrypoint wrapper for RN `App.tsx` integration

This is the integration point to call from a future `App.tsx` / RN entry shell.

Implemented concrete app shell files in this repo:

- `mobile/App.tsx`
  - calls `startMobileAppShell(...)` in `useEffect`
  - binds `onStateChange` to React state
  - stops reconnect lifecycle on unmount
- `mobile/index.ts`
  - registers RN root component (`main`)
- `mobile/src/app/entrypoint/session-bridge.ts`
  - temporary runtime bridge for session/token without hard dependency on storage SDK
