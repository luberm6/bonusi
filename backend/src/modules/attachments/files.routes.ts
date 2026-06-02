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
    const { file_data, file_type, file_name } = result.rows[0] as {
      file_data: Buffer;
      file_type: string;
      file_name: string;
    };
    
    const isInlineType = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf"
    ].includes(file_type);
    const disposition = isInlineType ? "inline" : "attachment";

    // Support ASCII fallback and UTF-8 filename in Content-Disposition
    const safeFileName = file_name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const encodedFileName = encodeURIComponent(file_name);

    res.setHeader("Content-Type", file_type);
    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.send(file_data);
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
