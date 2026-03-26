import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { assertConversationAccess } from "../chat/chat.service.js";
import { getFileStorageService } from "./file-storage.provider.js";
import type { UploadFileDto } from "./files.dto.js";

function mapFileTypeToChat(fileType: string): "image" | "pdf" {
  return fileType === "application/pdf" ? "pdf" : "image";
}

function decodeBase64(contentBase64: string): Buffer {
  try {
    return Buffer.from(contentBase64, "base64");
  } catch {
    throw new HttpError(400, "Invalid contentBase64");
  }
}

export async function uploadFileForMessage(actor: AuthenticatedUser, input: UploadFileDto) {
  const messageRes = await pool.query(
    `select m.id, m.conversation_id
     from public.messages m
     where m.id = $1
     limit 1`,
    [input.messageId]
  );
  if (!messageRes.rowCount) throw new HttpError(404, "Message not found");

  const message = messageRes.rows[0] as { id: string; conversation_id: string };
  await assertConversationAccess(actor, message.conversation_id);

  const content = decodeBase64(input.contentBase64);
  if (content.byteLength !== input.size) {
    throw new HttpError(400, "size mismatch for contentBase64");
  }

  const storage = getFileStorageService();
  const uploaded = await storage.upload({
    fileName: input.fileName,
    fileType: input.fileType,
    size: input.size,
    content
  });

  try {
    const inserted = await pool.query(
      `insert into public.attachments (message_id, file_url, file_type, file_name, size)
       values ($1, $2, $3, $4, $5)
       returning id, message_id, file_url, file_type, file_name, size, created_at`,
      [input.messageId, uploaded.url, mapFileTypeToChat(input.fileType), input.fileName, input.size]
    );
    const row = inserted.rows[0] as {
      id: string;
      message_id: string;
      file_url: string;
      file_type: string;
      file_name: string;
      size: string;
      created_at: Date;
    };
    return {
      id: row.id,
      messageId: row.message_id,
      fileUrl: row.file_url,
      fileType: row.file_type,
      fileName: row.file_name,
      size: Number(row.size),
      createdAt: row.created_at
    };
  } catch (error) {
    try {
      await storage.delete(uploaded.url);
    } catch (cleanupError) {
      console.error("[files] rollback delete failed", cleanupError);
    }
    throw error;
  }
}

export async function deleteFile(actor: AuthenticatedUser, fileId: string) {
  const found = await pool.query(
    `select a.id, a.file_url, m.conversation_id
     from public.attachments a
     join public.messages m on m.id = a.message_id
     where a.id = $1
     limit 1`,
    [fileId]
  );
  if (!found.rowCount) throw new HttpError(404, "File not found");
  const row = found.rows[0] as { id: string; file_url: string; conversation_id: string };
  await assertConversationAccess(actor, row.conversation_id);

  await pool.query("delete from public.attachments where id = $1", [fileId]);
  try {
    await getFileStorageService().delete(row.file_url);
  } catch (error) {
    console.error("[files] storage delete failed", error);
  }
  return { success: true as const, id: fileId };
}
