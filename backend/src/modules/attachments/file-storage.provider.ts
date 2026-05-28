import { env } from "../../common/config/env.js";
import { DatabaseFileStorageService } from "./file-storage.database.js";
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

  // No S3 → fall back to PostgreSQL database storage (stores files inside db and serves via rest endpoint)
  console.info("[files] S3 not configured — using database-backed file storage.");
  singleton = new DatabaseFileStorageService();
  return singleton;
}
