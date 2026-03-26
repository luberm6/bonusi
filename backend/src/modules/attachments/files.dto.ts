import { HttpError } from "../../common/http/error.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type UploadFileDto = {
  messageId: string;
  fileName: string;
  fileType: string;
  size: number;
  contentBase64: string;
};

export function parseFileId(value: string): string {
  if (!UUID_RE.test(value)) throw new HttpError(400, "Invalid file id");
  return value;
}

export function parseUploadFileDto(body: unknown): UploadFileDto {
  if (!body || typeof body !== "object") throw new HttpError(400, "Request body is required");
  const input = body as Record<string, unknown>;
  const messageId = typeof input.messageId === "string" ? input.messageId : "";
  const fileName = typeof input.fileName === "string" ? input.fileName.trim() : "";
  const fileType = typeof input.fileType === "string" ? input.fileType : "";
  const contentBase64 = typeof input.contentBase64 === "string" ? input.contentBase64.trim() : "";
  const size = Number(input.size);

  if (!UUID_RE.test(messageId)) throw new HttpError(400, "messageId must be valid uuid");
  if (!fileName) throw new HttpError(400, "fileName is required");
  if (!ALLOWED_CONTENT_TYPES.has(fileType)) {
    throw new HttpError(400, "fileType must be image/jpeg|image/png|image/webp|application/pdf");
  }
  if (!contentBase64) throw new HttpError(400, "contentBase64 is required");
  if (!Number.isFinite(size) || size <= 0 || size > 20 * 1024 * 1024) {
    throw new HttpError(400, "size must be between 1 and 20971520");
  }

  return {
    messageId,
    fileName,
    fileType,
    contentBase64,
    size: Math.floor(size)
  };
}
