import { randomUUID } from "crypto";
import { pool } from "../../common/db/pool.js";
import type { FileStorageService, UploadFileInput, UploadFileResult } from "./file-storage.service.js";

export class DatabaseFileStorageService implements FileStorageService {
  async upload(input: UploadFileInput): Promise<UploadFileResult> {
    const fileId = randomUUID();
    await pool.query(
      `insert into public.attachment_data (file_id, file_data, file_type, file_name)
       values ($1, $2, $3, $4)`,
      [fileId, input.content, input.fileType, input.fileName]
    );
    const url = `/api/v1/files/download/${fileId}`;
    return { url, objectKey: fileId };
  }

  async delete(fileUrl: string): Promise<void> {
    const match = fileUrl.match(/\/files\/download\/([0-9a-f-]{36})/i);
    if (match) {
      const fileId = match[1];
      await pool.query(`delete from public.attachment_data where file_id = $1`, [fileId]);
    }
  }
}
