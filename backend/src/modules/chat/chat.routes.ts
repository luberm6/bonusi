import { Router } from "express";
import { env } from "../../common/config/env.js";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { HttpError } from "../../common/http/error.js";
import { createRateLimiter } from "../../common/security/rate-limit.js";
import { deliverChatPush } from "../notifications/push.service.js";
import { emitMessageNew, emitMessageRead } from "./chat.realtime.js";
import {
  parseConversationId,
  parseCreateTemplateDto,
  parseMessageId,
  parseSearchMessagesDto,
  parseSendMessageDto,
  parseUpdateTemplateDto
} from "./chat.dto.js";
import { isUserOnline } from "./chat.presence.js";
import {
  createTemplate,
  ensureConversation,
  listConversations,
  listMessages,
  listTemplates,
  markMessageRead,
  searchMessages,
  sendMessage,
  updateTemplate
} from "./chat.service.js";

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export const chatRouter = Router();

const chatSendRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 80,
  keyPrefix: "chat-send",
  errorMessage: "Too many message sends. Please slow down."
});

const chatUploadPresignRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "chat-upload",
  errorMessage: "Too many upload requests. Please retry later."
});

const chatSearchRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 40,
  keyPrefix: "chat-search",
  errorMessage: "Too many search requests. Please retry later."
});

chatRouter.get(
  "/chat/conversations",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listConversations(req.authUser!);
    res.json(payload);
  })
);

chatRouter.post(
  "/chat/conversations/ensure",
  authGuard,
  asyncHandler(async (req, res) => {
    const clientId = typeof req.body?.clientId === "string" ? req.body.clientId : undefined;
    const payload = await ensureConversation(req.authUser!, { clientId });
    res.status(payload.created ? 201 : 200).json(payload);
  })
);

chatRouter.get(
  "/chat/conversations/:id/messages",
  authGuard,
  asyncHandler(async (req, res) => {
    const conversationId = parseConversationId(getParamId(req.params.id));
    const payload = await listMessages(req.authUser!, conversationId);
    res.json(payload);
  })
);

chatRouter.post(
  "/chat/conversations/:id/messages",
  authGuard,
  chatSendRateLimiter,
  asyncHandler(async (req, res) => {
    const conversationId = parseConversationId(getParamId(req.params.id));
    const dto = parseSendMessageDto(req.body);
    const payload = await sendMessage(req.authUser!, conversationId, dto);
    emitMessageNew({ conversationId, message: payload.message });
    if (payload.receiverId && payload.receiverId !== req.authUser!.id && !isUserOnline(payload.receiverId)) {
      await deliverChatPush({
        receiverUserId: payload.receiverId,
        senderUserId: req.authUser!.id,
        conversationId,
        messageId: payload.message.id,
        messageText: payload.message.text ?? null
      });
    }
    res.status(payload.deduped ? 200 : 201).json(payload);
  })
);

chatRouter.post(
  "/chat/messages/:id/read",
  authGuard,
  asyncHandler(async (req, res) => {
    const messageId = parseMessageId(getParamId(req.params.id));
    const payload = await markMessageRead(req.authUser!, messageId);
    emitMessageRead({
      conversationId: payload.conversationId,
      messageId: payload.id,
      readAt: payload.readAt ? new Date(payload.readAt).toISOString() : new Date().toISOString(),
      readerId: req.authUser!.id
    });
    res.json(payload);
  })
);

chatRouter.post(
  "/chat/templates",
  authGuard,
  asyncHandler(async (req, res) => {
    const dto = parseCreateTemplateDto(req.body);
    const payload = await createTemplate(req.authUser!, dto);
    res.status(201).json(payload);
  })
);

chatRouter.get(
  "/chat/templates",
  authGuard,
  asyncHandler(async (req, res) => {
    const payload = await listTemplates(req.authUser!);
    res.json(payload);
  })
);

chatRouter.patch(
  "/chat/templates/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    const templateId = parseMessageId(getParamId(req.params.id));
    const dto = parseUpdateTemplateDto(req.body);
    const payload = await updateTemplate(req.authUser!, templateId, dto);
    res.json(payload);
  })
);

chatRouter.get(
  "/chat/search",
  authGuard,
  chatSearchRateLimiter,
  asyncHandler(async (req, res) => {
    const dto = parseSearchMessagesDto(req.query as Record<string, unknown>);
    const payload = await searchMessages(req.authUser!, dto);
    res.json(payload);
  })
);

chatRouter.post(
  "/chat/attachments/presign",
  authGuard,
  chatUploadPresignRateLimiter,
  asyncHandler(async (req, res) => {
    if (!env.filesEnabled) throw new HttpError(403, "File uploads are disabled");
    res.status(410).json({
      error: "Use /files/upload endpoint when files are enabled"
    });
  })
);
