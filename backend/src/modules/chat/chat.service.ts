import { env } from "../../common/config/env.js";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";

type ConversationRow = {
  id: string;
  client_id: string;
  admin_id: string;
  created_at: Date;
  updated_at: Date;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  client_message_id: string;
  text: string | null;
  status: "sent" | "delivered" | "read" | "failed";
  read_at: Date | null;
  created_at: Date;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  size: string;
  created_at: Date;
};

function toMessageView(row: MessageRow) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    clientMessageId: row.client_message_id,
    text: row.text,
    status: row.status,
    readAt: row.read_at,
    createdAt: row.created_at,
    attachments: [] as Array<{
      id: string;
      fileUrl: string;
      fileType: string;
      fileName: string;
      size: number;
      createdAt: Date;
    }>
  };
}

function canAccessConversation(actor: AuthenticatedUser, conv: ConversationRow): boolean {
  if (actor.role === "super_admin") return true;
  return actor.id === conv.client_id || actor.id === conv.admin_id;
}

function canSendInConversation(actor: AuthenticatedUser, conv: ConversationRow): boolean {
  if (actor.role === "super_admin") return true;
  return actor.id === conv.client_id || actor.id === conv.admin_id;
}

async function getConversationRaw(conversationId: string): Promise<ConversationRow> {
  const result = await pool.query(
    `select id, client_id, admin_id, created_at, updated_at
     from public.conversations
     where id = $1
     limit 1`,
    [conversationId]
  );
  if (!result.rowCount) throw new HttpError(404, "Conversation not found");
  return result.rows[0] as ConversationRow;
}

function resolveReceiverId(actorId: string, conv: ConversationRow): string {
  if (actorId === conv.client_id) return conv.admin_id;
  if (actorId === conv.admin_id) return conv.client_id;
  return conv.client_id; // super_admin отправляет как admin, получатель — клиент
}

export async function listConversations(actor: AuthenticatedUser) {
  const where =
    actor.role === "super_admin"
      ? ""
      : actor.role === "admin"
        ? "where c.admin_id = $2"
        : "where c.client_id = $2";
  const params = actor.role === "super_admin" ? [actor.id] : [actor.id, actor.id];
  const result = await pool.query(
    `select c.id, c.client_id, c.admin_id, c.created_at, c.updated_at,
            m.id as last_message_id, m.text as last_message_text, m.created_at as last_message_at,
            coalesce(unread.unread_count, 0) as unread_count,
            cu.email as client_email, cu.full_name as client_name
     from public.conversations c
     left join public.users cu on cu.id = c.client_id
     left join lateral (
       select id, text, created_at
       from public.messages
       where conversation_id = c.id
       order by created_at desc
       limit 1
     ) m on true
     left join lateral (
       select count(*)::int as unread_count
       from public.messages um
       where um.conversation_id = c.id
         and um.receiver_id = $1
         and um.read_at is null
     ) unread on true
     ${where}
     order by c.updated_at desc, c.created_at desc`,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    adminId: row.admin_id,
    clientEmail: row.client_email as string | null,
    clientName: row.client_name as string | null,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    unreadCount: Number(row.unread_count),
    lastMessage: row.last_message_id
      ? {
          id: row.last_message_id,
          text: row.last_message_text,
          createdAt: row.last_message_at
        }
      : null
  }));
}

export async function ensureConversation(actor: AuthenticatedUser, input: { clientId?: string }) {
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (actor.role === "client") {
    const existing = await pool.query(
      `select id from public.conversations where client_id = $1 limit 1`,
      [actor.id]
    );
    if (existing.rowCount) return { id: existing.rows[0].id as string, created: false };

    const adminRes = await pool.query(
      `select id from public.users where role = 'admin' and is_active = true order by created_at asc limit 1`
    );
    if (!adminRes.rowCount) throw new HttpError(503, "Нет доступных администраторов");
    const adminId = adminRes.rows[0].id as string;

    const created = await pool.query(
      `insert into public.conversations (client_id, admin_id)
       values ($1, $2)
       on conflict (client_id, admin_id) do update set updated_at = now()
       returning id`,
      [actor.id, adminId]
    );
    return { id: created.rows[0].id as string, created: true };
  }

  if (actor.role === "admin" || actor.role === "super_admin") {
    if (!input.clientId) throw new HttpError(400, "clientId обязателен");
    if (!UUID_RE.test(input.clientId)) throw new HttpError(400, "Некорректный clientId");

    let adminId: string;
    if (actor.role === "super_admin") {
      const adminRes = await pool.query(
        `select id from public.users where role = 'admin' and is_active = true order by created_at asc limit 1`
      );
      adminId = adminRes.rows[0]?.id ?? actor.id;
    } else {
      adminId = actor.id;
    }

    const result = await pool.query(
      `insert into public.conversations (client_id, admin_id)
       values ($1, $2)
       on conflict (client_id, admin_id) do update set updated_at = now()
       returning id`,
      [input.clientId, adminId]
    );
    return { id: result.rows[0].id as string, created: true };
  }

  throw new HttpError(403, "Доступ запрещён");
}

export async function listMessages(actor: AuthenticatedUser, conversationId: string) {
  const conv = await getConversationRaw(conversationId);
  if (!canAccessConversation(actor, conv)) throw new HttpError(403, "Access denied");

  const result = await pool.query(
    `select id, conversation_id, sender_id, receiver_id, client_message_id, text, status, read_at, created_at
     from public.messages
     where conversation_id = $1
     order by created_at asc`,
    [conversationId]
  );
  const messages = (result.rows as MessageRow[]).map(toMessageView);
  if (!messages.length) return messages;
  const ids = messages.map((m) => m.id);
  const attachments = await pool.query(
    `select id, message_id, file_url, file_type, file_name, size, created_at
     from public.attachments
     where message_id = any($1::uuid[])
     order by created_at asc`,
    [ids]
  );
  const byMessage = new Map<string, AttachmentRow[]>();
  for (const row of attachments.rows as AttachmentRow[]) {
    const list = byMessage.get(row.message_id) ?? [];
    list.push(row);
    byMessage.set(row.message_id, list);
  }
  for (const msg of messages) {
    msg.attachments = (byMessage.get(msg.id) ?? []).map((a) => ({
      id: a.id,
      fileUrl: a.file_url,
      fileType: a.file_type,
      fileName: a.file_name,
      size: Number(a.size),
      createdAt: a.created_at
    }));
  }
  return messages;
}

export async function sendMessage(
  actor: AuthenticatedUser,
  conversationId: string,
  input: {
    clientMessageId: string;
    text?: string;
    attachments?: Array<{ fileUrl: string; fileType: "image" | "pdf"; fileName: string; size: number }>;
  }
) {
  if (input.attachments?.length && !env.filesEnabled) {
    throw new HttpError(403, "File uploads are disabled");
  }
  const conv = await getConversationRaw(conversationId);
  if (!canSendInConversation(actor, conv)) throw new HttpError(403, "Only conversation members can send messages");

  const receiverId = resolveReceiverId(actor.id, conv);
  const client = await pool.connect();
  try {
    await client.query("begin");
    const inserted = await client.query(
      `insert into public.messages
       (conversation_id, sender_id, receiver_id, client_message_id, text, status)
       values ($1, $2, $3, $4, $5, 'sent')
       on conflict (sender_id, client_message_id) do nothing
       returning id, conversation_id, sender_id, receiver_id, client_message_id, text, status, read_at, created_at`,
      [conversationId, actor.id, receiverId, input.clientMessageId, input.text ?? null]
    );

    let message: MessageRow;
    let deduped = false;
    if (inserted.rowCount && inserted.rowCount > 0) {
      message = inserted.rows[0] as MessageRow;
    } else {
      deduped = true;
      const existing = await client.query(
        `select id, conversation_id, sender_id, receiver_id, client_message_id, text, status, read_at, created_at
         from public.messages
         where sender_id = $1 and client_message_id = $2
         limit 1`,
        [actor.id, input.clientMessageId]
      );
      if (!existing.rowCount) throw new HttpError(409, "Message dedupe conflict");
      message = existing.rows[0] as MessageRow;
      if (message.conversation_id !== conversationId) {
        throw new HttpError(409, "client_message_id already used in another conversation");
      }
    }

    if (!deduped && input.attachments?.length) {
      for (const att of input.attachments) {
        await client.query(
          `insert into public.attachments (message_id, file_url, file_type, file_name, size)
           values ($1, $2, $3, $4, $5)`,
          [message.id, att.fileUrl, att.fileType, att.fileName, att.size]
        );
      }
    }

    await client.query("update public.conversations set updated_at = now() where id = $1", [conversationId]);
    await client.query("commit");
    const fullMessage = (await listMessages(actor, conversationId)).find((m) => m.id === message.id);
    return {
      conversationId,
      receiverId,
      message: fullMessage ?? toMessageView(message),
      deduped
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function markMessageRead(actor: AuthenticatedUser, messageId: string) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const rowRes = await client.query(
      `select m.id, m.conversation_id, m.sender_id, m.receiver_id, m.client_message_id, m.text, m.status, m.read_at, m.created_at,
              c.client_id, c.admin_id
       from public.messages m
       join public.conversations c on c.id = m.conversation_id
       where m.id = $1
       limit 1
       for update`,
      [messageId]
    );
    if (!rowRes.rowCount) throw new HttpError(404, "Message not found");

    const row = rowRes.rows[0] as MessageRow & { client_id: string; admin_id: string };
    if (actor.role !== "super_admin" && actor.id !== row.client_id && actor.id !== row.admin_id) {
      throw new HttpError(403, "Access denied");
    }
    if (actor.role !== "super_admin" && actor.id !== row.receiver_id) {
      throw new HttpError(403, "Only receiver can mark message as read");
    }

    if (!row.read_at) {
      await client.query("update public.messages set read_at = now(), status = 'read' where id = $1", [messageId]);
      await client.query("update public.conversations set updated_at = now() where id = $1", [row.conversation_id]);
    }

    const refreshed = await client.query(
      `select id, conversation_id, sender_id, receiver_id, client_message_id, text, status, read_at, created_at
       from public.messages where id = $1`,
      [messageId]
    );
    await client.query("commit");
    const msg = refreshed.rows[0] as MessageRow;
    return {
      ...toMessageView(msg),
      conversationId: msg.conversation_id
    };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function assertConversationAccess(actor: AuthenticatedUser, conversationId: string) {
  const conv = await getConversationRaw(conversationId);
  if (!canAccessConversation(actor, conv)) throw new HttpError(403, "Access denied");
  return conv;
}

export async function createTemplate(actor: AuthenticatedUser, input: { title: string; text: string }) {
  if (!["admin", "super_admin"].includes(actor.role)) throw new HttpError(403, "Only admin can create templates");
  const result = await pool.query(
    `insert into public.message_templates (admin_id, title, text)
     values ($1, $2, $3)
     returning id, admin_id, title, text, created_at, updated_at`,
    [actor.id, input.title, input.text]
  );
  return result.rows[0];
}

export async function listTemplates(actor: AuthenticatedUser) {
  if (actor.role === "client") throw new HttpError(403, "Client cannot access templates");
  const result =
    actor.role === "super_admin"
      ? await pool.query(
          `select id, admin_id, title, text, created_at, updated_at
           from public.message_templates
           order by updated_at desc`
        )
      : await pool.query(
          `select id, admin_id, title, text, created_at, updated_at
           from public.message_templates
           where admin_id = $1
           order by updated_at desc`,
          [actor.id]
        );
  return result.rows;
}

export async function updateTemplate(actor: AuthenticatedUser, templateId: string, input: { title?: string; text?: string }) {
  if (actor.role === "client") throw new HttpError(403, "Client cannot update templates");
  const owned =
    actor.role === "super_admin"
      ? await pool.query("select id from public.message_templates where id = $1 limit 1", [templateId])
      : await pool.query("select id from public.message_templates where id = $1 and admin_id = $2 limit 1", [templateId, actor.id]);
  if (!owned.rowCount) throw new HttpError(404, "Template not found");

  const sets: string[] = [];
  const values: unknown[] = [];
  const push = (column: string, value: unknown) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };
  if (input.title !== undefined) push("title", input.title);
  if (input.text !== undefined) push("text", input.text);
  values.push(templateId);
  const result = await pool.query(
    `update public.message_templates
     set ${sets.join(", ")}
     where id = $${values.length}
     returning id, admin_id, title, text, created_at, updated_at`,
    values
  );
  return result.rows[0];
}

export async function searchMessages(actor: AuthenticatedUser, input: { conversationId: string; query: string }) {
  const conv = await getConversationRaw(input.conversationId);
  if (!canAccessConversation(actor, conv)) throw new HttpError(403, "Access denied");

  const result = await pool.query(
    `select id, conversation_id, sender_id, receiver_id, client_message_id, text, status, read_at, created_at,
            ts_rank_cd(to_tsvector('simple', coalesce(text, '')), plainto_tsquery('simple', $2)) as rank
     from public.messages
     where conversation_id = $1
       and text is not null
       and to_tsvector('simple', coalesce(text, '')) @@ plainto_tsquery('simple', $2)
     order by rank desc, created_at desc
     limit 50`,
    [input.conversationId, input.query]
  );
  return (result.rows as Array<MessageRow & { rank: string }>).map((row) => ({
    ...toMessageView(row),
    rank: Number(row.rank)
  }));
}
