# Users Module Foundation (Phase 4)

## What is implemented

- Full users API:
  - `POST /api/v1/users`
  - `GET /api/v1/users`
  - `GET /api/v1/users/:id`
  - `PATCH /api/v1/users/:id`
  - `PATCH /api/v1/users/:id/deactivate`
  - `GET /api/v1/users/me`
- Layer split:
  - DTO + validation: `users.dto.ts`
  - service layer + RBAC logic: `users.service.ts`
  - routes/controller layer: `users.routes.ts`
- Added user profile fields:
  - `full_name`, `phone`, `notes` (migration `005_users_profile_fields.sql`)
- Audit integration:
  - `user.create`
  - `user.update`
  - `user.deactivate`

## RBAC behavior

- `super_admin` can create `admin` and `client`, can see all users.
- `admin` can create `admin` and `client`, cannot manage `super_admin`.
- `client` cannot create users, can read only self, can patch only own profile fields (`fullName`, `phone`, `notes`).

## Validation

- email format and normalization (`lowercase`).
- password length (8..128).
- role whitelist for create/update (`admin|client`).
- UUID validation for `:id`.
- duplicate email protection (`409`).
- phone format + optional nullable text fields.
