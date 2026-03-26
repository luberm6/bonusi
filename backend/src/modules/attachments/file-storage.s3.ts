import { randomUUID } from "crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "../../common/config/env.js";
import type { FileStorageService, UploadFileInput, UploadFileResult } from "./file-storage.service.js";

function normalizeName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildPublicUrl(objectKey: string): string {
  const base = env.s3PublicBaseUrl?.trim();
  if (base) {
    return `${base.replace(/\/$/, "")}/${objectKey}`;
  }
  return `${env.s3Endpoint.replace(/\/$/, "")}/${env.s3Bucket}/${objectKey}`;
}

function extractObjectKey(fileUrl: string): string {
  const base = env.s3PublicBaseUrl?.trim();
  if (base) {
    const normalizedBase = `${base.replace(/\/$/, "")}/`;
    if (!fileUrl.startsWith(normalizedBase)) {
      throw new Error("File URL is outside configured storage base");
    }
    return fileUrl.slice(normalizedBase.length);
  }
  const fallbackBase = `${env.s3Endpoint.replace(/\/$/, "")}/${env.s3Bucket}/`;
  if (!fileUrl.startsWith(fallbackBase)) {
    throw new Error("File URL is outside configured storage endpoint");
  }
  return fileUrl.slice(fallbackBase.length);
}

export class S3CompatibleFileStorageService implements FileStorageService {
  private readonly s3Client = new S3Client({
    region: env.s3Region,
    endpoint: env.s3Endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.s3AccessKeyId,
      secretAccessKey: env.s3SecretAccessKey
    }
  });

  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const objectKey = `chat/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${normalizeName(input.fileName)}`;
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: objectKey,
        Body: input.content,
        ContentType: input.fileType,
        ContentLength: input.size
      })
    );
    return {
      objectKey,
      url: buildPublicUrl(objectKey)
    };
  }

  async delete(fileUrl: string): Promise<void> {
    const objectKey = extractObjectKey(fileUrl);
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: env.s3Bucket,
        Key: objectKey
      })
    );
  }
}
