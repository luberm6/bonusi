# Backend + Database Foundation (Phase 2)

## Implemented

- Base backend skeleton on Node.js + TypeScript (`backend/src`).
- Environment configuration and PostgreSQL connection bootstrap.
- Versioned SQL migrations with migration tracking table (`schema_migrations`).
- Full PostgreSQL schema for required entities:
  - users
  - devices
  - branches
  - services
  - visits
  - visit_services
  - bonus_transactions
  - conversations
  - messages
  - message_templates
  - attachments
  - audit_logs
  - geocode_cache
  - refresh_tokens

## Key Decisions

- Roles are strict enum (`super_admin`, `admin`, `client`) at DB level.
- Refresh token rotation supported with:
  - `family_id`
  - `rotated_from_token_id` (self-reference)
  - `token_hash` unique
  - active/revoked lifecycle fields
- Message deduplication by `(sender_id, client_message_id)` unique constraint.
- `audit_logs` is append-only by design and indexed for actor/entity/time queries.
- `visit_services.total` is generated column from `price * quantity`.
- `geocode_cache` dedupe via generated `query_hash` (sha256 over normalized query).

## Validation Performed

- Migrations applied successfully to local PostgreSQL.
- Smoke CRUD script executed successfully (transactional rollback).
- Verified:
  - FK integrity
  - check constraints
  - unique constraints
  - index presence
  - duplicate message protection
  - cascade deletion (`conversations -> messages -> attachments`)

## Files

- `backend/migrations/001_extensions.sql`
- `backend/migrations/002_core_schema.sql`
- `backend/migrations/003_indexes.sql`
- `backend/scripts/migrate.sh`
- `backend/test/smoke_crud.sql`

## Known Weak Points

- Role-to-entity semantic checks (e.g. `visits.client_id` must point to user with role `client`) are not enforced by pure FK and should also be validated at service layer.
- Monetary values use `numeric(12,2)`; if very high throughput/accounting complexity grows, consider dedicated money handling policies.
- `conversations` uses unique `(client_id, admin_id)` one-thread model; if business needs multi-thread contexts, add topic/context key.
