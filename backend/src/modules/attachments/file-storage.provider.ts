import { env } from "../../common/config/env.js";
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

  if (!env.s3Endpoint || !env.s3Bucket || !env.s3AccessKeyId || !env.s3SecretAccessKey) {
    console.warn("[files] FILES_ENABLED=true but S3 settings are incomplete. Falling back to disabled file storage mode.");
    singleton = new DisabledFileStorageService();
    return singleton;
  }

  singleton = new S3CompatibleFileStorageService();
  return singleton;
}
