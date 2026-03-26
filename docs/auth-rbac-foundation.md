# Auth + RBAC Foundation (Phase 3)

## Implemented Security Capabilities

- Email/password login (`bcrypt` hashing).
- Access token + refresh token flow.
- Refresh token rotation with reuse detection.
- Session logout + device logout + logout all devices.
- Role-based access checks on backend only.
- Request-level user reload from DB (no trust to frontend role claims).
- Device registration/tracking and `last_seen` updates.
- Login brute-force protection:
  - DB lock table (`auth_login_attempts`)
  - route-level rate limiting.

## Required Endpoints

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `POST /api/v1/devices/register`
- `POST /api/v1/devices/logout-current`
- `POST /api/v1/devices/logout-all-if-supported`

## RBAC Rules Covered

- `super_admin` can create `admin` and `client`.
- `admin` can create `admin` and `client`.
- `admin` cannot deactivate `super_admin`.
- `client` cannot access admin endpoints (`/users` create/deactivate).
- All checks are enforced by backend guards and DB-loaded user role.

## Verification

- e2e scenario script validates:
  - successful login
  - failed login
  - refresh success
  - refresh reuse rejection
  - logout behavior
  - role-forbidden access
  - brute-force and refresh rate limiting
