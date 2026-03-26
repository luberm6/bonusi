import type { Server } from "socket.io";

let ioRef: Server | null = null;

export function registerChatIo(io: Server) {
  ioRef = io;
}

function room(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function emitMessageNew(payload: {
  conversationId: string;
  message: unknown;
}) {
  ioRef?.to(room(payload.conversationId)).emit("message:new", payload.message);
  ioRef?.to(room(payload.conversationId)).emit("conversation:updated", {
    conversationId: payload.conversationId,
    updatedAt: new Date().toISOString()
  });
}

export function emitMessageRead(payload: {
  conversationId: string;
  messageId: string;
  readAt: string;
  readerId: string;
}) {
  ioRef?.to(room(payload.conversationId)).emit("message:read", payload);
  ioRef?.to(room(payload.conversationId)).emit("conversation:updated", {
    conversationId: payload.conversationId,
    updatedAt: new Date().toISOString()
  });
}
