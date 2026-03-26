import { env } from "../../common/config/env.js";
import { pool } from "../../common/db/pool.js";

type PushInput = {
  receiverUserId: string;
  senderUserId: string;
  conversationId: string;
  messageId: string;
  messageText: string | null;
};

type DeliveryRow = {
  platform: "ios" | "android";
  token: string;
  notificationId: string;
  status: "sent" | "skipped" | "failed";
  error?: string;
};

async function insertNotification(userId: string, payload: unknown) {
  const inserted = await pool.query(
    `insert into public.notifications (user_id, type, payload, status, sent_at)
     values ($1, 'chat_message', $2::jsonb, 'queued', null)
     returning id`,
    [userId, JSON.stringify(payload ?? {})]
  );
  return inserted.rows[0].id as string;
}

async function updateNotification(id: string, status: "sent" | "failed" | "skipped", error?: string) {
  await pool.query("update public.notifications set status = $1, sent_at = now(), payload = payload || $3::jsonb where id = $2", [
    status,
    id,
    JSON.stringify(error ? { delivery_error: error } : {})
  ]);
}

async function sendToFcm(token: string, title: string, body: string) {
  if (!env.pushEnabled) return { ok: false, error: "PUSH_ENABLED is false" };
  if (!env.fcmServerKey) return { ok: false, error: "FCM_SERVER_KEY is not configured" };
  const response = await fetch("https://fcm.googleapis.com/fcm/send", {
    method: "POST",
    headers: {
      Authorization: `key=${env.fcmServerKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      to: token,
      notification: { title, body },
      priority: "high"
    })
  });
  if (!response.ok) {
    return { ok: false, error: `FCM HTTP ${response.status}` };
  }
  return { ok: true as const };
}

export async function deliverChatPush(input: PushInput): Promise<DeliveryRow[]> {
  if (!env.pushEnabled) {
    return [];
  }

  const devicesRes = await pool.query(
    `select platform, push_token
     from public.devices
     where user_id = $1
       and is_active = true
       and platform in ('ios', 'android')
       and push_token is not null`,
    [input.receiverUserId]
  );
  const rows = devicesRes.rows as Array<{ platform: "ios" | "android"; push_token: string }>;
  if (!rows.length) return [];

  const title = "New message";
  const body = input.messageText ? input.messageText.slice(0, 120) : "Attachment";
  const result: DeliveryRow[] = [];

  for (const row of rows) {
    const notificationId = await insertNotification(input.receiverUserId, {
      conversationId: input.conversationId,
      messageId: input.messageId,
      senderUserId: input.senderUserId,
      platform: row.platform
    });

    const delivery = await sendToFcm(row.push_token, title, body);
    if (delivery.ok) {
      await updateNotification(notificationId, "sent");
      result.push({
        platform: row.platform,
        token: row.push_token,
        notificationId,
        status: "sent"
      });
    } else {
      await updateNotification(notificationId, "failed", delivery.error);
      result.push({
        platform: row.platform,
        token: row.push_token,
        notificationId,
        status: "failed",
        error: delivery.error
      });
    }
  }
  return result;
}
