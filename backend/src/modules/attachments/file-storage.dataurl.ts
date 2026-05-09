import { randomUUID } from "crypto";
import type { FileStorageService, UploadFileInput, UploadFileResult } from "./file-storage.service.js";

// Stores file content as a data URL — no external storage required.
// Works out-of-the-box without S3 credentials. The data URL is saved
// directly in the attachments.file_url column and the mobile app
// renders it inline via <Image source={{ uri: dataUrl }} />.
export class DataUrlFileStorageService implements FileStorageService {
  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const base64 = input.content.toString("base64");
    const url = `data:${input.fileType};base64,${base64}`;
    const objectKey = `dataurl-${randomUUID()}`;
    return { url, objectKey };
  }

  async delete(_fileUrl: string): Promise<void> {
    // Data URLs are stored inline — nothing to delete externally.
  }
}
