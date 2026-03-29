import { randomUUID } from "crypto";
import pg from "pg";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql:///bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const pool = new Pool({ connectionString: dbUrl });

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function login(email, password) {
  const res = await request("/auth/login", {
    method: "POST",
    body: { email, password, device: { platform: "web", deviceName: "Files Flag E2E", appVersion: "1.0.0" } }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

async function run() {
  const report = [];
  const suffix = Date.now();

  const superAccess = await login("superadmin@example.com", "Passw0rd123");
  const clientAccess = await login("client@example.com", "Passw0rd123");

  const adminEmail = `files-flag-admin-${suffix}@example.com`;
  const adminCreate = await request("/users", {
    method: "POST",
    token: superAccess,
    body: { email: adminEmail, password: "Passw0rd123", role: "admin" }
  });
  assert(adminCreate.status === 201, `admin create failed: ${adminCreate.status}`);
  const adminAccess = await login(adminEmail, "Passw0rd123");

  const users = await request("/users", { token: superAccess });
  const client = users.json.find((u) => u.email === "client@example.com");
  assert(client?.id, "client@example.com not found");

  const convRes = await pool.query(
    `insert into public.conversations (client_id, admin_id)
     values ($1, $2)
     on conflict (client_id, admin_id)
     do update set updated_at = now()
     returning id`,
    [client.id, adminCreate.json.id]
  );
  const conversationId = convRes.rows[0].id;

  const textMessage = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    token: clientAccess,
    body: {
      clientMessageId: randomUUID(),
      text: "Text-only chat works while files are disabled"
    }
  });
  assert(textMessage.status === 201, `text message failed: ${textMessage.status}`);
  report.push("chat_text_only=ok");

  const withAttachment = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    token: clientAccess,
    body: {
      clientMessageId: randomUUID(),
      text: "should fail with attachment",
      attachments: [{ fileUrl: "http://x/f.pdf", fileType: "pdf", fileName: "f.pdf", size: 1 }]
    }
  });
  assert(withAttachment.status === 403, `attachment send should fail with 403, got ${withAttachment.status}`);
  assert(withAttachment.json?.error === "File uploads are disabled", "missing controlled disabled error");
  report.push("chat_attachments_disabled=ok");

  const presign = await request("/chat/attachments/presign", {
    method: "POST",
    token: adminAccess,
    body: { fileName: "t.pdf", fileType: "application/pdf", size: 100 }
  });
  assert(presign.status === 403, `presign should fail with 403, got ${presign.status}`);
  assert(presign.json?.error === "File uploads are disabled", "presign disabled error mismatch");
  report.push("chat_presign_disabled=ok");

  const upload = await request("/files/upload", {
    method: "POST",
    token: adminAccess,
    body: {
      messageId: textMessage.json.message.id,
      fileName: "x.pdf",
      fileType: "application/pdf",
      size: 4,
      contentBase64: "dGVzdA=="
    }
  });
  assert(upload.status === 403, `files upload should fail with 403, got ${upload.status}`);
  assert(upload.json?.error === "File uploads are disabled", "files upload disabled error mismatch");
  report.push("files_upload_disabled=ok");

  const remove = await request(`/files/${randomUUID()}`, {
    method: "DELETE",
    token: adminAccess
  });
  assert(remove.status === 403, `files delete should fail with 403, got ${remove.status}`);
  assert(remove.json?.error === "File uploads are disabled", "files delete disabled error mismatch");
  report.push("files_delete_disabled=ok");

  console.log(report.join("\n"));
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
