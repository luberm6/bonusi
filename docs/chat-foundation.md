# Chat Foundation (Phase 8)

## Implemented REST endpoints

- `GET /api/v1/chat/conversations`
- `GET /api/v1/chat/conversations/:id/messages`
- `POST /api/v1/chat/conversations/:id/messages`
- `POST /api/v1/chat/messages/:id/read`

## Implemented Socket.IO events

Client -> Server:

- `conversation:join`
- `message:send`
- `message:read`

Server -> Client:

- `message:new`
- `message:ack`
- `message:read`
- `conversation:updated`

## Security and integrity

- Socket auth via backend access token verification.
- Conversation membership enforced on backend for REST and socket events.
- `sender_id` is derived from authenticated backend user only.
- `client_message_id` dedupe enforced by DB unique key and backend dedupe logic.
- Message history persisted in PostgreSQL (`messages` table).
- Text-only messaging in current phase (no attachments in workflow).
