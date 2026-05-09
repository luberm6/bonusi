import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SendMessageDto = {
  clientMessageId: string;
  text?: string;
  isRepairHistory?: boolean;
  attachments?: Array<{
    fileUrl: string;
    fileType: "image" | "pdf";
    fileName: string;
    size: number;
  }>;
};

export type CreateTemplateDto = { title: string; text: string };
export type UpdateTemplateDto = { title?: string; text?: string };
export type SearchMessagesDto = { conversationId: string; query: string };
export type PresignAttachmentDto = {
  fileName: string;
  fileType: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  size: number;
};

export function parseConversationId(value: string): string {
  if (!UUID_RE.test(value)) throw new HttpError(400, "Invalid conversation id");
  return value;
}

export function parseMessageId(value: string): string {
  if (!UUID_RE.test(value)) throw new HttpError(400, "Invalid message id");
  return value;
}

export function parseSendMessageDto(body: unknown): SendMessageDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  if (typeof input.clientMessageId !== "string" || !UUID_RE.test(input.clientMessageId)) {
    throw new HttpError(400, "clientMessageId must be valid uuid");
  }

  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (text.length > 4000) throw new HttpError(400, "text too long (max 4000)");
  const rawAttachments = input.attachments;
  let attachments: SendMessageDto["attachments"] = undefined;
  if (rawAttachments !== undefined) {
    if (!Array.isArray(rawAttachments)) throw new HttpError(400, "attachments must be array");
    attachments = rawAttachments.map((item, idx) => {
      if (!item || typeof item !== "object") throw new HttpError(400, `attachments[${idx}] must be object`);
      const row = item as Record<string, unknown>;
      const fileUrl = typeof row.fileUrl === "string" ? row.fileUrl.trim() : "";
      const fileName = typeof row.fileName === "string" ? row.fileName.trim() : "";
      const fileType = row.fileType;
      const size = Number(row.size);
      if (!fileUrl) throw new HttpError(400, `attachments[${idx}].fileUrl is required`);
      if (!fileName) throw new HttpError(400, `attachments[${idx}].fileName is required`);
      if (fileType !== "image" && fileType !== "pdf") {
        throw new HttpError(400, `attachments[${idx}].fileType must be image|pdf`);
      }
      if (!Number.isFinite(size) || size <= 0) throw new HttpError(400, `attachments[${idx}].size must be > 0`);
      return { fileUrl, fileType, fileName, size: Math.floor(size) };
    });
  }

  if (!text && (!attachments || attachments.length === 0)) {
    throw new HttpError(400, "Either text or attachments must be provided");
  }

  const isRepairHistory = input.isRepairHistory === true;

  return {
    clientMessageId: input.clientMessageId,
    ...(text ? { text } : {}),
    ...(isRepairHistory ? { isRepairHistory: true } : {}),
    ...(attachments && attachments.length ? { attachments } : {})
  };
}

function parseNonEmptyText(value: unknown, field: string, maxLen: number): string {
  if (typeof value !== "string") throw new HttpError(400, `${field} must be string`);
  const trimmed = value.trim();
  if (!trimmed) throw new HttpError(400, `${field} cannot be empty`);
  if (trimmed.length > maxLen) throw new HttpError(400, `${field} too long`);
  return trimmed;
}

export function parseCreateTemplateDto(body: unknown): CreateTemplateDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  return {
    title: parseNonEmptyText(input.title, "title", 180),
    text: parseNonEmptyText(input.text, "text", 4000)
  };
}

export function parseUpdateTemplateDto(body: unknown): UpdateTemplateDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const dto: UpdateTemplateDto = {};
  if (input.title !== undefined) dto.title = parseNonEmptyText(input.title, "title", 180);
  if (input.text !== undefined) dto.text = parseNonEmptyText(input.text, "text", 4000);
  if (!Object.keys(dto).length) throw new HttpError(400, "No fields to update");
  return dto;
}

export function parseSearchMessagesDto(query: Record<string, unknown>): SearchMessagesDto {
  const conversationIdRaw = Array.isArray(query.conversation_id) ? query.conversation_id[0] : query.conversation_id;
  const queryRaw = Array.isArray(query.query) ? query.query[0] : query.query;
  if (typeof conversationIdRaw !== "string") throw new HttpError(400, "conversation_id is required");
  if (typeof queryRaw !== "string") throw new HttpError(400, "query is required");
  const q = queryRaw.trim();
  if (!q) throw new HttpError(400, "query cannot be empty");
  if (q.length < 2) throw new HttpError(400, "query too short");
  return {
    conversationId: parseConversationId(conversationIdRaw),
    query: q
  };
}

export function parsePresignAttachmentDto(body: unknown): PresignAttachmentDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const fileName = parseNonEmptyText(input.fileName, "fileName", 255);
  const fileType = input.fileType;
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const;
  if (!allowed.includes(fileType as (typeof allowed)[number])) {
    throw new HttpError(400, "fileType must be image/jpeg|image/png|image/webp|application/pdf");
  }
  const size = Number(input.size);
  if (!Number.isFinite(size) || size <= 0 || size > 20 * 1024 * 1024) {
    throw new HttpError(400, "size must be between 1 and 20971520");
  }
  return {
    fileName,
    fileType: fileType as PresignAttachmentDto["fileType"],
    size: Math.floor(size)
  };
}
