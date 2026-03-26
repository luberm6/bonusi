# Chat Advanced (Phase 9)

## Added capabilities

- Attachments (image/pdf metadata in DB, files in S3-compatible storage via presigned upload URL).
- Admin message templates (create/list/update).
- Message search in conversation (`to_tsvector` + `plainto_tsquery`).
- Online/offline presence over Socket.IO.
- Typing indicators (`typing:start`, `typing:stop`) without DB persistence.
- Push notification flow for new incoming messages (device-based, skip self, skip when receiver online).

## New REST endpoints

- `POST /api/v1/chat/attachments/presign`
- `POST /api/v1/chat/templates`
- `GET /api/v1/chat/templates`
- `PATCH /api/v1/chat/templates/:id`
- `GET /api/v1/chat/search?conversation_id=...&query=...`

## New socket events

- Client -> Server: `typing:start`, `typing:stop`
- Server -> Client: `typing:start`, `typing:stop`, `presence:update`

## Notes

- Push uses active iOS/Android devices with `push_token`.
- If `FCM_SERVER_KEY` is missing, delivery attempts are still recorded in `notifications` with failed status for observability.
- Realtime delivery is primary; push is fallback when receiver is offline.
