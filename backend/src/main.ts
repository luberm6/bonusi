import { createServer } from "http";
import { buildApp } from "./app.js";
import { env } from "./common/config/env.js";
import { setupChatSocket } from "./modules/chat/chat.socket.js";

const app = buildApp();
const httpServer = createServer(app);
setupChatSocket(httpServer);

httpServer.listen(env.port, () => {
  console.log(`[startup] nodeEnv=${env.nodeEnv}`);
  console.log(`[startup] filesEnabled=${env.filesEnabled}`);
  console.log(`[startup] pushEnabled=${env.pushEnabled}`);
  console.log(`[startup] smtpEnabled=${env.smtpEnabled}`);
  if (!env.fcmServerKey) {
    console.log("[startup] FCM disabled (FCM_SERVER_KEY is empty)");
  }
  if (!env.pushEnabled) {
    console.log("[startup] Push delivery disabled via PUSH_ENABLED=false");
  }
  if (!env.smtpEnabled) {
    console.log("[startup] SMTP disabled via SMTP_ENABLED=false");
  }
  if (!env.filesEnabled) {
    console.log("[startup] File uploads disabled via FILES_ENABLED=false");
  }
  console.log(`[backend] listening on :${env.port}`);
});
