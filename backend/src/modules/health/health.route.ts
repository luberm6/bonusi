import { Router } from "express";
import { dbPing } from "../../common/db/pool.js";
import { env } from "../../common/config/env.js";

export const healthRouter = Router();

healthRouter.get("/healthz", async (_req, res) => {
  try {
    const dbOk = await dbPing();
    if (!dbOk) {
      return res.status(503).json({ status: "degraded", db: "down" });
    }
    return res.json({ status: "ok", db: "up" });
  } catch {
    return res.status(503).json({ status: "degraded", db: "down" });
  }
});

healthRouter.get("/readyz", async (_req, res) => {
  try {
    const dbOk = await dbPing();
    if (!dbOk) {
      return res.status(503).json({ status: "not_ready", db: "down" });
    }

    return res.json({
      status: "ready",
      db: "up",
      filesEnabled: env.filesEnabled,
      pushEnabled: env.pushEnabled,
      smtpEnabled: env.smtpEnabled,
      integrations: {
        fcmConfigured: Boolean(env.fcmServerKey),
        s3Configured: Boolean(env.s3Endpoint && env.s3Bucket && env.s3AccessKeyId && env.s3SecretAccessKey)
      }
    });
  } catch {
    return res.status(503).json({ status: "not_ready", db: "down" });
  }
});
import { authGuard } from "../../common/guards/auth.guard.js";
import { requireRoles } from "../../common/guards/role.guard.js";
import { pool } from "../../common/db/pool.js";
import { runProductionSelfTest } from "./health.selftest.js";

healthRouter.get(
  "/healthz/selftest",
  authGuard,
  requireRoles("super_admin"),
  async (_req, res) => {
    const client = await pool.connect();
    try {
      const result = await runProductionSelfTest(client);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }
);

import { sendDiagnosticsNotification } from "../../common/services/notification.service.js";

healthRouter.post(
  "/healthz/trigger-failure-alert",
  authGuard,
  requireRoles("super_admin"),
  async (_req, res) => {
    try {
      await sendDiagnosticsNotification(
        "89263358010",
        "luberm6@gmail.com",
        1,
        ["[ТЕСТ] Имитация сбоя диагностики Centr Radius Service"]
      );
      res.json({ success: true, message: "Test notifications dispatched!" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
