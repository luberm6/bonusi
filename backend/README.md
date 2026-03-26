# Backend Foundation

## Stack

- Node.js + TypeScript + Express
- PostgreSQL
- SQL migrations (versioned files)

## Quick Start

1. Copy `.env.example` to `.env` and set `DATABASE_URL`.
2. Run migrations:
   - `npm run migrate`
   - (legacy alternative with `psql` installed): `npm run migrate:bash`
3. Run CRUD smoke test:
   - `npm run db:smoke`
4. Seed test auth users:
   - `npm run seed:auth`
5. (Optional) bootstrap super admin from env:
   - `npm run bootstrap:super-admin`
6. Start backend:
   - `npm run dev`

## Migration Strategy

- SQL migrations are in `migrations/*.sql` and are applied in lexical order.
- `scripts/migrate.sh` tracks applied migrations in `public.schema_migrations`.
- Schema targets one-company internal system (no tenant columns, no microservice assumptions).

## Auth Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `POST /api/v1/users`
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PATCH /api/v1/users/:id`
- `PATCH /api/v1/users/:id/deactivate`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/logout-current`
- `POST /api/v1/devices/logout-all-if-supported`
- `POST /api/v1/branches`
- `GET /api/v1/branches`
- `GET /api/v1/branches/:id`
- `PATCH /api/v1/branches/:id`
- `PATCH /api/v1/branches/:id/deactivate`
- `POST /api/v1/geocode`
- `POST /api/v1/services`
- `GET /api/v1/services`
- `PATCH /api/v1/services/:id`
- `POST /api/v1/visits`
- `GET /api/v1/visits`
- `GET /api/v1/visits/:id`
- `POST /api/v1/bonuses/accrual`
- `POST /api/v1/bonuses/writeoff`
- `GET /api/v1/bonuses/history?client_id=...`
- `GET /api/v1/bonuses/balance?client_id=...`
- `GET /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations/:id/messages`
- `POST /api/v1/chat/conversations/:id/messages`
- `POST /api/v1/chat/messages/:id/read`
- `POST /api/v1/chat/templates`
- `GET /api/v1/chat/templates`
- `PATCH /api/v1/chat/templates/:id`
- `GET /api/v1/chat/search?conversation_id=...&query=...`
- `POST /api/v1/chat/attachments/presign`
- `GET /api/v1/healthz`
- `GET /api/v1/readyz`
