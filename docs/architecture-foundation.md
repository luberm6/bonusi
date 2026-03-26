# Architecture Foundation: Internal Auto Service System

## 1) Project Scope and Principles

- One company, one internal system, no multi-tenant logic.
- Modular monolith: single backend, single PostgreSQL, clear module boundaries.
- Backend is source of truth for business rules, access checks, and audit.
- Web and mobile are clients with thin orchestration logic.
- Practical over over-engineered: no microservices, no unnecessary infra.

## 2) High-Level Architecture

```text
[Web (Next.js)] ----\
                     \
                      > [Backend API (Node.js + TypeScript, NestJS)] <-> [PostgreSQL]
                     /                 |         |          |
[Mobile (React Native)] -- REST/WS ---/         |          +--> [S3-compatible object storage]
                                               [Socket.IO]
                                                  |
                                           [FCM Push Gateway]

External integrations:
- Nominatim (geocoding)
- OpenStreetMap + MapLibre (map rendering in clients)
```

## 3) Backend Modules and Responsibility Boundaries

Recommended framework: **NestJS** (built-in modules, guards, DI, testability).

- `auth`: login/refresh/logout, session/device tokens, password policy.
- `roles`: RBAC matrix for `super_admin`, `admin`, `client`.
- `users`: profiles, lifecycle, status, contact data.
- `branches`: branch metadata, schedules, geo-coordinates, assignment.
- `map`: branch/service points payload for map views (read models).
- `geocoding`: Nominatim adapter + normalization + rate limiting + caching.
- `services`: service catalog, duration, pricing, availability flags.
- `visits`: visit creation/status flow, assignment to branch/service, history.
- `bonuses`: earn/spend rules, balance, ledger entries, anti-double-spend control.
- `chat`: threads/messages, permissions by visit/client/admin context.
- `notifications`: push templates, dispatch orchestration (FCM), delivery state.
- `files`: pre-signed upload/download, metadata, ownership checks.
- `audit`: immutable audit events for sensitive actions.
- `security`: centralized guards, policy checks, suspicious activity hooks.
- `health`: readiness/liveness, dependency probes.
- `realtime` (cross-cutting): Socket.IO gateway, auth handshake, room routing.
- `workers` (in-process/background): retries, deferred notifications, cleanup jobs.

### Rule of interactions

- Module can call another module only through exported service interfaces.
- `auth/roles/security` are shared enforcement layers, not bypassed by feature modules.
- `audit` is append-only and called by modules on critical mutations.
- External APIs (Nominatim/FCM/S3) are isolated behind adapters.

## 4) Frontend Domains

### Web (Next.js)

- Goal: operational console for `super_admin` and `admin`, plus optional client cabinet.
- Domain slices:
  - `auth`
  - `dashboard`
  - `clients`
  - `branches`
  - `services`
  - `visits`
  - `bonuses`
  - `chat`
  - `map`
  - `settings`
  - `audit` (read-only for privileged users)

### Mobile (React Native)

- Goal: client-centric UX + selected admin mobile workflows.
- Domain slices:
  - `auth`
  - `profile`
  - `branches`
  - `services`
  - `visits`
  - `bonuses`
  - `chat`
  - `map`
  - `notifications`
- Offline-first:
  - local SQLite cache
  - operation queue for offline mutations
  - sync engine with conflict policy from backend versioning

## 5) Recommended Folder Structure

```text
backend/
  src/
    modules/
      auth/
      users/
      roles/
      branches/
      map/
      geocoding/
      services/
      visits/
      bonuses/
      chat/
      notifications/
      files/
      audit/
      security/
      health/
    common/
      config/
      db/
      guards/
      decorators/
      interceptors/
      filters/
      dto/
      types/
      utils/
    realtime/
    workers/
  prisma/
  migrations/
  test/

web/
  src/
    app/
    modules/
      auth/
      dashboard/
      clients/
      branches/
      services/
      visits/
      bonuses/
      chat/
      map/
      settings/
      audit/
    widgets/
    middleware/
    shared/
      api/
      ui/
      hooks/
      lib/
      types/
      config/

mobile/
  src/
    app/
    modules/
      auth/
      profile/
      branches/
      services/
      visits/
      bonuses/
      chat/
      map/
      notifications/
    features/
    push/
    shared/
      api/
      storage/
      offline/
      sync/
      ui/
      hooks/
      types/
      config/
```

## 6) Core Domain Entities (MVP + Growth-Ready)

- `User`: id, role, status, phone/email, password_hash, last_login_at.
- `Role`: code (`super_admin|admin|client`), permission set.
- `Branch`: id, name, address, lat/lon, schedule, active flag.
- `Service`: id, name, category, duration_min, base_price, active flag.
- `Visit`: id, client_id, branch_id, service_id, start_at, status, notes.
- `BonusAccount`: user_id, current_balance, updated_at.
- `BonusLedgerEntry`: id, user_id, delta, reason, visit_id?, created_by.
- `ChatThread`: id, visit_id?, client_id, branch_id, state.
- `ChatMessage`: id, thread_id, sender_id, body, attachments, created_at.
- `PushToken`: id, user_id, platform, token, device_meta, is_active.
- `Notification`: id, user_id, type, payload, status, sent_at.
- `FileObject`: id, owner_type, owner_id, bucket, object_key, mime, size.
- `AuditEvent`: id, actor_id, action, entity_type, entity_id, diff, created_at.
- `GeocodeCache`: query_hash, normalized_address, lat/lon, source, ttl.
- `AuthSession`: id, user_id, refresh_token_hash, device_id, expires_at.

## 7) Key Technologies and Libraries

- Backend:
  - `@nestjs/core`, `@nestjs/common`, `@nestjs/config`
  - `@nestjs/websockets` + `socket.io`
  - `prisma` + `@prisma/client` (or TypeORM, but Prisma preferred for speed/clarity)
  - `class-validator`, `class-transformer`
  - `passport`, `passport-jwt`, `argon2`
  - `ioredis` (optional for cache/rate-limit; can be postponed)
  - `pino` / `nestjs-pino` for structured logs
  - `bullmq` (optional if background jobs grow; otherwise simple cron/in-process queue)
- Web:
  - `next`, `react`, `typescript`
  - `@tanstack/react-query`
  - `zod` for schema-safe forms
  - `maplibre-gl`
- Mobile:
  - `react-native`, `typescript`
  - `@tanstack/react-query`
  - `react-native-sqlite-storage` or `expo-sqlite`
  - `@react-native-firebase/messaging` (FCM)
  - `maplibre-react-native` (or RN-compatible MapLibre wrapper)
- Infra:
  - PostgreSQL
  - S3-compatible storage (MinIO/AWS S3/etc.)
  - Nominatim API integration

## 8) Why This Architecture

- Fits one-company internal scope: no tenant abstraction overhead.
- Modular monolith keeps deployment/ops simple while preserving clean boundaries.
- NestJS module system naturally maps to business domains.
- Shared RBAC + audit + security on backend enforces correctness and compliance.
- Offline-first mobile is solved by local SQLite + sync queue, not by split backend.
- External dependencies are adapter-isolated, reducing vendor lock-in and fragility.

## 9) Integrity Check (Self-Review Checklist)

- [x] No multi-tenant assumptions in entities or module contracts.
- [x] No microservice decomposition or distributed transaction dependence.
- [x] RBAC centralized on backend; frontend has no authority for permissions.
- [x] Role boundaries are consistent:
  - `super_admin`: full system governance, role/user policies, audit access.
  - `admin`: branch/service/visit operations, client communication, limited config.
  - `client`: own profile, own visits, own bonuses, own chats.
- [x] Modules do not overlap ownership of critical state.
- [x] Chosen stack matches constraints: OSM/MapLibre/Nominatim, no Google Maps stack.
- [x] Folder structure is practical for single team support and long-term maintenance.

## 10) Known Risks and Mitigations

- Risk: bonus double-spend under retries/concurrency.
  - Mitigation: DB transaction + ledger idempotency key + row-level lock.
- Risk: offline mobile conflicts (stale edits).
  - Mitigation: server-side version field, deterministic conflict policy, user-visible resolution for edge cases.
- Risk: Nominatim rate limits/instability.
  - Mitigation: geocode cache + retry/backoff + async enrichment path.
- Risk: chat/push growth may stress single process.
  - Mitigation: keep module boundary clean; introduce queue/redis only when metrics justify.
- Risk: audit volume growth.
  - Mitigation: partition/retention policy and indexed query model from day one.
