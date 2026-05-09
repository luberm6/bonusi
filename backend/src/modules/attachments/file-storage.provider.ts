import { env } from "../../common/config/env.js";
import { DataUrlFileStorageService } from "./file-storage.dataurl.js";
import { DisabledFileStorageService } from "./file-storage.disabled.js";
import type { FileStorageService } from "./file-storage.service.js";
import { S3CompatibleFileStorageService } from "./file-storage.s3.js";

let singleton: FileStorageService | null = null;

export function getFileStorageService(): FileStorageService {
  if (singleton) return singleton;

  if (!env.filesEnabled) {
    singleton = new DisabledFileStorageService();
    return singleton;
  }

  // S3 configured → use S3-compatible storage
  if (env.s3Endpoint && env.s3Bucket && env.s3AccessKeyId && env.s3SecretAccessKey) {
    singleton = new S3CompatibleFileStorageService();
    return singleton;
  }

  // No S3 → fall back to data-URL storage (stores base64 inline, no external service needed)
  console.info("[files] S3 not configured — using data-URL inline storage.");
  singleton = new DataUrlFileStorageService();
  return singleton;
}
