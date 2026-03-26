import { randomUUID } from "crypto";
import pg from "pg";
import { io as ioClient } from "socket.io-client";

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL ?? "postgresql://localhost:55432/bonusi_dev";
const apiBase = process.env.API_BASE_URL ?? "http://127.0.0.1:4010/api/v1";
const wsBase = process.env.WS_BASE_URL ?? "http://127.0.0.1:4010";
const filesEnabled = process.env.FILES_ENABLED === "true";
const pool = new Pool({ connectionString: dbUrl });

async function request(path, { method = "GET", token, body, forwardedFor } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  if (forwardedFor) headers["x-forwarded-for"] = forwardedFor;

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

async function login(email, password, ip) {
  const res = await request("/auth/login", {
    method: "POST",
    forwardedFor: ip,
    body: {
      email,
      password,
      device: { platform: "web", deviceName: "Chat E2E", appVersion: "1.0.0" }
    }
  });
  assert(res.status === 200, `login failed for ${email}: ${res.status}`);
  return res.json.accessToken;
}

function waitForEvent(socket, event, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`timeout waiting event ${event}`));
    }, timeoutMs);
    const onEvent = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, onEvent);
  });
}

async function emitWithAck(socket, event, payload, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ack for ${event}`)), timeoutMs);
    socket.emit(event, payload, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}

async function run() {
  const report = [];
  const suffix = Date.now();

  const superAccess = await login("superadmin@example.com", "Passw0rd123", "10.50.0.1");
  const clientAccess = await login("client@example.com", "Passw0rd123", "10.50.0.2");

  const adminEmail = `chat-admin-${suffix}@example.com`;
  const createAdmin = await request("/users", {
    method: "POST",
    token: superAccess,
    body: { email: adminEmail, password: "Passw0rd123", role: "admin", fullName: "Chat Admin" }
  });
  assert(createAdmin.status === 201, `create admin failed: ${createAdmin.status}`);
  const adminId = createAdmin.json.id;
  const adminAccess = await login(adminEmail, "Passw0rd123", "10.50.0.3");

  const users = await request("/users", { token: superAccess });
  const clientUser = users.json.find((u) => u.email === "client@example.com");
  assert(clientUser?.id, "client@example.com missing");
  const clientId = clientUser.id;

  const convRes = await pool.query(
    `insert into public.conversations (client_id, admin_id)
     values ($1, $2)
     on conflict (client_id, admin_id)
     do update set updated_at = now()
     returning id`,
    [clientId, adminId]
  );
  const conversationId = convRes.rows[0].id;

  const convList = await request("/chat/conversations", { token: adminAccess });
  assert(convList.status === 200, `conversations list failed: ${convList.status}`);
  assert(convList.json.some((c) => c.id === conversationId), "conversation missing in admin list");
  report.push(`conversations_list=${convList.status}`);

  const tplCreate = await request("/chat/templates", {
    method: "POST",
    token: adminAccess,
    body: {
      title: `Greeting ${suffix}`,
      text: "Hello! Your car is ready."
    }
  });
  assert(tplCreate.status === 201, `template create failed: ${tplCreate.status}`);
  const tplId = tplCreate.json.id;
  const tplPatch = await request(`/chat/templates/${tplId}`, {
    method: "PATCH",
    token: adminAccess,
    body: { text: "Hello! Your car is ready for pickup." }
  });
  assert(tplPatch.status === 200, `template patch failed: ${tplPatch.status}`);
  const tplList = await request("/chat/templates", { token: adminAccess });
  assert(tplList.status === 200, `template list failed: ${tplList.status}`);
  assert(tplList.json.some((t) => t.id === tplId), "template missing in list");
  report.push("templates_ok=true");

  const restMessageId = randomUUID();
  let attachmentPayload = undefined;
  if (filesEnabled) {
    const presign = await request("/chat/attachments/presign", {
      method: "POST",
      token: adminAccess,
      body: {
        fileName: "inspection.pdf",
        fileType: "application/pdf",
        size: 1024
      }
    });
    assert(presign.status === 201, `attachment presign failed: ${presign.status}`);
    assert(presign.json.uploadUrl && presign.json.fileUrl, "presign payload invalid");
    report.push("attachment_presign=201");
    attachmentPayload = [
      {
        fileUrl: presign.json.fileUrl,
        fileType: "pdf",
        fileName: "inspection.pdf",
        size: 1024
      }
    ];
  }

  const restSend = await request(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    token: adminAccess,
    body: {
      clientMessageId: restMessageId,
      text: "Hello from REST with attachment",
      ...(attachmentPayload ? { attachments: attachmentPayload } : {})
    }
  });
  assert(restSend.status === 201, `REST send failed: ${restSend.status}`);
  report.push(`rest_send=${restSend.status}`);

  const history1 = await request(`/chat/conversations/${conversationId}/messages`, { token: adminAccess });
  assert(history1.status === 200, `messages history failed: ${history1.status}`);
  const beforeSocketCount = history1.json.length;

  const adminSocket = ioClient(wsBase, {
    auth: { token: adminAccess },
    transports: ["websocket"]
  });
  const clientSocket = ioClient(wsBase, {
    auth: { token: clientAccess },
    transports: ["websocket"]
  });

  await Promise.all([
    new Promise((resolve) => adminSocket.on("connect", resolve)),
    new Promise((resolve) => clientSocket.on("connect", resolve))
  ]);

  const adminJoin = await emitWithAck(adminSocket, "conversation:join", { conversationId });
  const clientJoin = await emitWithAck(clientSocket, "conversation:join", { conversationId });
  assert(adminJoin.ok === true, "admin join failed");
  assert(clientJoin.ok === true, "client join failed");

  const typingStartPromise = waitForEvent(adminSocket, "typing:start", 6000);
  const typingStartAck = await emitWithAck(clientSocket, "typing:start", { conversationId });
  assert(typingStartAck.ok === true, "typing:start ack failed");
  const typingStartEvent = await typingStartPromise;
  assert(typingStartEvent.conversationId === conversationId, "typing:start event mismatch");
  const typingStopPromise = waitForEvent(adminSocket, "typing:stop", 6000);
  const typingStopAck = await emitWithAck(clientSocket, "typing:stop", { conversationId });
  assert(typingStopAck.ok === true, "typing:stop ack failed");
  await typingStopPromise;
  report.push("typing_ok=true");

  const wsClientMessageId = randomUUID();
  const messageNewPromise = waitForEvent(adminSocket, "message:new", 6000);
  const ack1 = await emitWithAck(clientSocket, "message:send", {
    conversationId,
    clientMessageId: wsClientMessageId,
    text: "Hello from Socket"
  });
  assert(ack1.ok === true, "socket send ack failed");
  assert(ack1.deduped === false, "first socket send should not be deduped");
  const messageNew = await messageNewPromise;
  assert(messageNew.clientMessageId === wsClientMessageId, "message:new payload mismatch");
  report.push("socket_send=ok");

  const ack2 = await emitWithAck(clientSocket, "message:send", {
    conversationId,
    clientMessageId: wsClientMessageId,
    text: "Hello from Socket duplicate"
  });
  assert(ack2.ok === true, "socket dedupe ack failed");
  assert(ack2.deduped === true, "duplicate socket send must be deduped");
  report.push("socket_dedupe=ok");

  const history2 = await request(`/chat/conversations/${conversationId}/messages`, { token: adminAccess });
  assert(history2.status === 200, `messages history 2 failed: ${history2.status}`);
  const afterSocketCount = history2.json.length;
  assert(afterSocketCount === beforeSocketCount + 1, "message count mismatch (possible loss or duplicate)");
  report.push("message_persistence_no_loss=ok");

  const wsMessage = history2.json.find((m) => m.clientMessageId === wsClientMessageId);
  assert(wsMessage?.id, "socket message missing in history");
  const restMsg = history2.json.find((m) => m.clientMessageId === restMessageId);
  if (filesEnabled) {
    assert(restMsg?.attachments?.length === 1, "attachment metadata missing in message history");
    report.push("attachment_history_ok=true");
  } else {
    assert((restMsg?.attachments?.length ?? 0) === 0, "attachments should be empty when files are disabled");
    report.push("attachment_disabled_mode_ok=true");
  }

  const search = await request(
    `/chat/search?conversation_id=${conversationId}&query=${encodeURIComponent("Socket")}`,
    { token: adminAccess }
  );
  assert(search.status === 200, `search failed: ${search.status}`);
  assert(search.json.some((m) => m.clientMessageId === wsClientMessageId), "search result missing target message");
  report.push("search_ok=true");

  const readEventPromise = waitForEvent(clientSocket, "message:read", 6000);
  const readAck = await emitWithAck(adminSocket, "message:read", { messageId: wsMessage.id });
  assert(readAck.ok === true, "message:read ack failed");
  const readEvent = await readEventPromise;
  assert(readEvent.messageId === wsMessage.id, "message:read event mismatch");
  report.push("socket_read_status=ok");

  const restRead = await request(`/chat/messages/${wsMessage.id}/read`, {
    method: "POST",
    token: adminAccess
  });
  assert(restRead.status === 200, `REST read failed: ${restRead.status}`);
  assert(restRead.json.readAt, "readAt missing after REST read");
  report.push(`rest_read=${restRead.status}`);

  const superConv = await request("/chat/conversations", { token: superAccess });
  assert(superConv.status === 200, `super conversations failed: ${superConv.status}`);
  assert(superConv.json.some((c) => c.id === conversationId), "super_admin should see all conversations");
  report.push(`super_admin_visibility=${superConv.status}`);

  const deviceReg = await request("/devices/register", {
    method: "POST",
    token: adminAccess,
    body: {
      platform: "ios",
      deviceName: "Admin iPhone",
      pushToken: `push-admin-${suffix}`,
      appVersion: "1.0.0"
    }
  });
  assert(deviceReg.status === 200, `device register failed: ${deviceReg.status}`);

  const presencePromise = waitForEvent(clientSocket, "presence:update", 6000);
  adminSocket.close();
  const presenceEvent = await presencePromise;
  assert(presenceEvent.userId === adminId && presenceEvent.online === false, "presence offline event mismatch");
  report.push("presence_offline_ok=true");

  const offlineMsgId = randomUUID();
  const offlineSendAck = await emitWithAck(clientSocket, "message:send", {
    conversationId,
    clientMessageId: offlineMsgId,
    text: "Message for offline admin"
  });
  assert(offlineSendAck.ok === true, "offline message send failed");

  await new Promise((r) => setTimeout(r, 300));
  const pushRows = await pool.query(
    `select count(*)::int as cnt
     from public.notifications
     where user_id = $1 and type = 'chat_message'
       and created_at > now() - interval '10 minutes'`,
    [adminId]
  );
  assert(pushRows.rows[0].cnt >= 1, "push notification flow was not triggered");
  report.push("push_flow_ok=true");

  clientSocket.close();
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
