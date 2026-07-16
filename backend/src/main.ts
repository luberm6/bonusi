import { createServer } from "http";
import { buildApp } from "./app.js";
import { env } from "./common/config/env.js";
import { setupChatSocket } from "./modules/chat/chat.socket.js";
import { pool } from "./common/db/pool.js";
import { runProductionSelfTest } from "./modules/health/health.selftest.js";
import { sendDiagnosticsNotification } from "./common/services/notification.service.js";

const app = buildApp();
const httpServer = createServer(app);
setupChatSocket(httpServer);

async function performDiagnosticsCheck() {
  console.log("[diagnostics] Running scheduled database self-test...");
  const client = await pool.connect();
  try {
    const result = await runProductionSelfTest(client);
    console.log(`[diagnostics] Completed. Total: ${result.total}, Passed: ${result.passed}, Failed: ${result.failed}`);
    if (result.failed > 0) {
      await sendDiagnosticsNotification("89263358010", "luberm6@gmail.com", result.failed, result.failures);
    }
  } catch (error: any) {
    console.error("[diagnostics] Background check crashed:", error);
    await sendDiagnosticsNotification("89263358010", "luberm6@gmail.com", 1, [error.message]);
  } finally {
    client.release();
  }
}

function startBackgroundDiagnostics() {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000; // run every 1 hour
  console.log(`[startup] Background diagnostics scheduled to run every 60 minutes.`);
  
  // Run once 30 seconds after startup to verify immediate status
  setTimeout(async () => {
    await performDiagnosticsCheck();
  }, 30000);

  setInterval(async () => {
    await performDiagnosticsCheck();
  }, CHECK_INTERVAL_MS);
}

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

  // Launch background self-testing service
  startBackgroundDiagnostics();
});
