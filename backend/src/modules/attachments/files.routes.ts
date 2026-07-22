import { Router } from "express";
import { env } from "../../common/config/env.js";
import { pool } from "../../common/db/pool.js";
import { authGuard } from "../../common/guards/auth.guard.js";
import { asyncHandler } from "../../common/http/async-handler.js";
import { HttpError } from "../../common/http/error.js";
import { createRateLimiter } from "../../common/security/rate-limit.js";
import { parseFileId, parseUploadFileDto } from "./files.dto.js";
import { deleteFile, uploadFileForMessage } from "./files.service.js";

export const filesRouter = Router();

const uploadRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "files-upload",
  errorMessage: "Too many file upload requests. Please retry later."
});

function ensureFilesEnabled() {
  if (!env.filesEnabled) {
    throw new HttpError(403, "File uploads are disabled");
  }
}

function getParamId(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

filesRouter.post(
  "/files/upload",
  authGuard,
  uploadRateLimiter,
  asyncHandler(async (req, res) => {
    ensureFilesEnabled();
    const dto = parseUploadFileDto(req.body);
    const result = await uploadFileForMessage(req.authUser!, dto);
    res.status(201).json(result);
  })
);

function getResponseMimeType(fileType: string, fileName: string): string {
  if (fileType && fileType.includes("/")) return fileType;
  const name = (fileName || "").toLowerCase();
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".gif")) return "image/gif";
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".xls")) return "application/vnd.ms-excel";
  if (name.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (name.endsWith(".doc")) return "application/msword";
  if (name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (fileType === "image") return "image/jpeg";
  if (fileType === "pdf") return "application/pdf";
  return "application/octet-stream";
}

filesRouter.get(
  "/files/download/:id",
  asyncHandler(async (req, res) => {
    const fileId = getParamId(req.params.id);
    const result = await pool.query(
      `select file_data, file_type, file_name from public.attachment_data where file_id = $1 limit 1`,
      [fileId]
    );
    if (!result.rowCount) {
      throw new HttpError(404, "File not found");
    }
    let { file_data, file_type, file_name } = result.rows[0] as {
      file_data: Buffer | string;
      file_type: string;
      file_name: string;
    };

    let buffer: Buffer;
    if (Buffer.isBuffer(file_data)) {
      const headerSnippet = file_data.toString("utf8", 0, 100);
      if (headerSnippet.startsWith("data:") || headerSnippet.includes(";base64,")) {
        const fullStr = file_data.toString("utf8");
        const clean = fullStr.replace(/^data:[^;]+;base64,/, "").trim();
        buffer = Buffer.from(clean, "base64");
      } else {
        buffer = file_data;
      }
    } else if (typeof file_data === "string") {
      const clean = (file_data as string).replace(/^data:[^;]+;base64,/, "").trim();
      buffer = Buffer.from(clean, "base64");
    } else {
      buffer = Buffer.from(file_data as unknown as Uint8Array);
    }

    const mimeType = getResponseMimeType(file_type, file_name);
    const isInlineType = mimeType.startsWith("image/") || mimeType === "application/pdf";
    const disposition = isInlineType ? "inline" : "attachment";

    // Support ASCII fallback and UTF-8 filename in Content-Disposition
    const safeFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const encodedFileName = encodeURIComponent(file_name);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Content-Type", mimeType);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.send(buffer);
  })
);

filesRouter.delete(
  "/files/:id",
  authGuard,
  asyncHandler(async (req, res) => {
    ensureFilesEnabled();
    const fileId = parseFileId(getParamId(req.params.id));
    const result = await deleteFile(req.authUser!, fileId);
    res.json(result);
  })
);
