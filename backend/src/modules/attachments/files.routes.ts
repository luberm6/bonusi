import { Router } from "express";
import { env } from "../../common/config/env.js";
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
