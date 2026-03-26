# Hardening Layer (Phase 14)

## Implemented

- Audit logging hooks for security-sensitive auth actions (`login success/fail`, refresh anomalies, logout) and business-critical modules.
- Best-effort audit behavior:
  - audit insertion runs with savepoint inside transactions
  - audit failure is logged and does not break primary business flow
- Rate limiting extended:
  - login
  - refresh
  - geocode
  - chat message sends (REST + socket)
  - chat attachment presign uploads
  - chat search
- Cloudflare-friendly client IP extraction (`CF-Connecting-IP` / `X-Forwarded-For`) for brute-force and rate-limit keys.
- Session/device management support:
  - list sessions
  - revoke specific session
- WebSocket resilience:
  - client readiness for transport fallback (`websocket` -> `polling`)
  - tested server compatibility with polling transport.
- Frontend failover-ready endpoint configs (primary + secondary API/WS).

## Backup / Restore readiness (PostgreSQL)

Recommended baseline:

1. Daily full logical backup:
   - `pg_dump -Fc -d <db> -f backup_<date>.dump`
2. WAL archiving (if RPO requires near-real-time restore).
3. Restore drill in staging at least weekly:
   - `createdb <restore_db>`
   - `pg_restore -d <restore_db> backup_<date>.dump`
4. Verify after restore:
   - row counts for critical tables (`users`, `visits`, `messages`, `bonus_transactions`, `audit_logs`)
   - app health endpoint and smoke auth/chat flow.
5. Store backups in external durable object storage with retention policy and encryption.

## Notes

- Important binary files remain outside local server disk (S3-compatible object storage path).
- Frontend must still treat backend as source of truth; failover endpoint switching does not bypass RBAC checks.
