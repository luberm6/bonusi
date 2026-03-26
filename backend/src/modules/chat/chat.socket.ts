import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../../common/config/env.js";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser, UserRole } from "../../common/types/auth.js";
import { verifyAccessToken } from "../auth/token.service.js";
import { deliverChatPush } from "../notifications/push.service.js";
import { isUserOnline, markUserSocketOffline, markUserSocketOnline } from "./chat.presence.js";
import { registerChatIo } from "./chat.realtime.js";
import { parseConversationId, parseMessageId, parseSendMessageDto } from "./chat.dto.js";
import { assertConversationAccess, markMessageRead, sendMessage } from "./chat.service.js";

type SocketAuthedUser = AuthenticatedUser;
const MESSAGE_WINDOW_MS = 60_000;
const MESSAGE_LIMIT_PER_WINDOW = 80;
const messageRateWindow = new Map<string, number[]>();

function conversationRoom(conversationId: string) {
  return `conversation:${conversationId}`;
}

async function resolveSocketUser(token: string): Promise<SocketAuthedUser> {
  const payload = verifyAccessToken(token);
  if (payload.typ !== "access") throw new HttpError(401, "Invalid token type");
  const result = await pool.query("select id, email, role, is_active from public.users where id = $1 limit 1", [payload.sub]);
  if (!result.rowCount) throw new HttpError(401, "User not found");
  const row = result.rows[0] as { id: string; email: string; role: UserRole; is_active: boolean };
  if (!row.is_active) throw new HttpError(403, "User is deactivated");
  return { id: row.id, email: row.email, role: row.role, isActive: row.is_active };
}

function getTokenFromHandshake(auth: unknown, header: unknown): string | null {
  if (auth && typeof auth === "object" && typeof (auth as Record<string, unknown>).token === "string") {
    return (auth as Record<string, unknown>).token as string;
  }
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

async function emitPresenceToUserConversations(io: Server, userId: string, online: boolean) {
  const result = await pool.query(`select id from public.conversations where client_id = $1 or admin_id = $1`, [userId]);
  for (const row of result.rows as Array<{ id: string }>) {
    io.to(conversationRoom(row.id)).emit("presence:update", { userId, online });
  }
}

export function setupChatSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin,
      credentials: true
    }
  });
  registerChatIo(io);

  io.use(async (socket, next) => {
    try {
      const token = getTokenFromHandshake(socket.handshake.auth, socket.handshake.headers.authorization);
      if (!token) throw new HttpError(401, "Missing socket token");
      const user = await resolveSocketUser(token);
      socket.data.user = user;
      next();
    } catch (error) {
      next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    const actor = socket.data.user as SocketAuthedUser;
    markUserSocketOnline(actor.id, socket.id);
    void emitPresenceToUserConversations(io, actor.id, true);
    void pool.query("update public.users set last_seen = now() where id = $1", [actor.id]);

    socket.on("conversation:join", async (payload: { conversationId?: string }, ack?: (value: unknown) => void) => {
      try {
        const conversationId = parseConversationId(String(payload?.conversationId ?? ""));
        await assertConversationAccess(actor, conversationId);
        await socket.join(conversationRoom(conversationId));
        ack?.({ ok: true, conversationId });
      } catch (error) {
        ack?.({ ok: false, error: (error as Error).message });
      }
    });

    socket.on(
      "message:send",
      async (
        payload: { conversationId?: string; text?: string; clientMessageId?: string; attachments?: unknown[] },
        ack?: (value: unknown) => void
      ) => {
        try {
          const now = Date.now();
          const bucket = messageRateWindow.get(socket.id) ?? [];
          const recent = bucket.filter((t) => now - t <= MESSAGE_WINDOW_MS);
          if (recent.length >= MESSAGE_LIMIT_PER_WINDOW) {
            throw new HttpError(429, "Too many realtime message sends");
          }
          recent.push(now);
          messageRateWindow.set(socket.id, recent);

          const conversationId = parseConversationId(String(payload?.conversationId ?? ""));
          const dto = parseSendMessageDto({
            clientMessageId: payload?.clientMessageId,
            text: payload?.text,
            attachments: payload?.attachments
          });
          const result = await sendMessage(actor, conversationId, dto);

          io.to(conversationRoom(conversationId)).emit("message:new", result.message);
          io.to(conversationRoom(conversationId)).emit("conversation:updated", {
            conversationId,
            updatedAt: new Date().toISOString()
          });

          const ackPayload = {
            ok: true,
            conversationId,
            messageId: result.message.id,
            clientMessageId: result.message.clientMessageId,
            deduped: result.deduped
          };

          if (result.receiverId !== actor.id && !isUserOnline(result.receiverId)) {
            await deliverChatPush({
              receiverUserId: result.receiverId,
              senderUserId: actor.id,
              conversationId,
              messageId: result.message.id,
              messageText: result.message.text ?? null
            });
          }

          ack?.(ackPayload);
          socket.emit("message:ack", ackPayload);
        } catch (error) {
          ack?.({ ok: false, error: (error as Error).message });
          socket.emit("message:ack", { ok: false, error: (error as Error).message });
        }
      }
    );

    socket.on("message:read", async (payload: { messageId?: string }, ack?: (value: unknown) => void) => {
      try {
        const messageId = parseMessageId(String(payload?.messageId ?? ""));
        const read = await markMessageRead(actor, messageId);
        const event = {
          conversationId: read.conversationId,
          messageId: read.id,
          readAt: read.readAt ? new Date(read.readAt).toISOString() : new Date().toISOString(),
          readerId: actor.id
        };
        io.to(conversationRoom(read.conversationId)).emit("message:read", event);
        io.to(conversationRoom(read.conversationId)).emit("conversation:updated", {
          conversationId: read.conversationId,
          updatedAt: new Date().toISOString()
        });
        ack?.({ ok: true, ...event });
      } catch (error) {
        ack?.({ ok: false, error: (error as Error).message });
      }
    });

    socket.on("typing:start", async (payload: { conversationId?: string }, ack?: (value: unknown) => void) => {
      try {
        const conversationId = parseConversationId(String(payload?.conversationId ?? ""));
        await assertConversationAccess(actor, conversationId);
        socket.to(conversationRoom(conversationId)).emit("typing:start", { conversationId, userId: actor.id });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: (error as Error).message });
      }
    });

    socket.on("typing:stop", async (payload: { conversationId?: string }, ack?: (value: unknown) => void) => {
      try {
        const conversationId = parseConversationId(String(payload?.conversationId ?? ""));
        await assertConversationAccess(actor, conversationId);
        socket.to(conversationRoom(conversationId)).emit("typing:stop", { conversationId, userId: actor.id });
        ack?.({ ok: true });
      } catch (error) {
        ack?.({ ok: false, error: (error as Error).message });
      }
    });

    socket.on("disconnect", () => {
      messageRateWindow.delete(socket.id);
      markUserSocketOffline(actor.id, socket.id);
      if (!isUserOnline(actor.id)) {
        void emitPresenceToUserConversations(io, actor.id, false);
      }
      void pool.query("update public.users set last_seen = now() where id = $1", [actor.id]);
    });
  });

  return io;
}
