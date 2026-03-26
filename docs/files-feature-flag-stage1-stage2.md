# Files Feature Flag (Stage 1 -> Stage 2)

## Stage 1 (default)

Set:

- `FILES_ENABLED=false`

Behavior:

- `POST /api/v1/files/upload` returns `403` with `File uploads are disabled`.
- `DELETE /api/v1/files/:id` returns `403` with `File uploads are disabled`.
- `POST /api/v1/chat/attachments/presign` returns `403` with `File uploads are disabled`.
- Chat remains fully functional in text-only mode (REST + Socket.IO).
- Frontend should hide chat attach button via feature config (`filesEnabled=false`).

## Stage 2 (Cloudflare R2 / S3-compatible)

Enable and configure:

- `FILES_ENABLED=true`
- `S3_ENDPOINT=...`
- `S3_BUCKET=...`
- `S3_ACCESS_KEY_ID=...`
- `S3_SECRET_ACCESS_KEY=...`
- optional: `S3_REGION=us-east-1`
- optional: `S3_PUBLIC_BASE_URL=https://<public-base>/<bucket>`

Behavior:

- Backend switches to `S3CompatibleFileStorageService` via DI provider.
- `POST /api/v1/files/upload` uploads binary payload to S3-compatible storage and stores metadata in `attachments`.
- `DELETE /api/v1/files/:id` removes metadata row and attempts remote object delete.
- Existing chat message schema/API remains compatible (attachments are optional).

## Security/Storage Notes

- Binary file content is never written to local server disk.
- Binary file content is never stored in PostgreSQL.
- PostgreSQL stores only metadata (`attachments` table).
