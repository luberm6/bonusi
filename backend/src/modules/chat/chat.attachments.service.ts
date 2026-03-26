import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../../common/config/env.js";
import type { PresignAttachmentDto } from "./chat.dto.js";

const hasS3Credentials = Boolean(env.s3AccessKeyId && env.s3SecretAccessKey);
const s3Client = new S3Client({
  region: env.s3Region,
  endpoint: env.s3Endpoint,
  forcePathStyle: true,
  ...(hasS3Credentials
    ? {
        credentials: {
          accessKeyId: env.s3AccessKeyId,
          secretAccessKey: env.s3SecretAccessKey
        }
      }
    : {})
});

function normalizeName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function createAttachmentPresign(input: PresignAttachmentDto) {
  const objectKey = `chat/${new Date().toISOString().slice(0, 10)}/${randomUUID()}-${normalizeName(input.fileName)}`;
  const fileUrl = `${env.s3PublicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
  const uploadUrl = hasS3Credentials
    ? await getSignedUrl(
        s3Client,
        new PutObjectCommand({
          Bucket: env.s3Bucket,
          Key: objectKey,
          ContentType: input.fileType,
          ContentLength: input.size
        }),
        { expiresIn: 10 * 60 }
      )
    : `${env.s3Endpoint.replace(/\/$/, "")}/${env.s3Bucket}/${objectKey}`;
  const chatFileType = input.fileType === "application/pdf" ? "pdf" : "image";
  return {
    objectKey,
    uploadUrl,
    fileUrl,
    fileType: chatFileType,
    fileName: input.fileName,
    size: input.size,
    expiresInSec: 600,
    signed: hasS3Credentials
  };
}
