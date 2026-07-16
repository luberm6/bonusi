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

import { pool } from "../../common/db/pool.js";

healthRouter.get("/db-diagnostics", async (req, res) => {
  if (req.query.secret !== "antigravity-diag") {
    return res.status(403).json({ error: "Forbidden" });
  }
  try {
    const usersCount = await pool.query("select count(*)::int as count from public.users");
    const attCount = await pool.query("select count(*)::int as count from public.attachments");
    const unsynced = await pool.query(
      `select id, email, phone, phone_number from public.users 
       where email like '%@noemail.placeholder' 
         and (phone_number is null or phone is null)
       limit 10`
    );
    const testMatch = await pool.query(
      `select id, email from public.users 
       where right(regexp_replace(coalesce(phone_number, ''), '[^0-9]', '', 'g'), 10) = '9216396959'`
    );

    return res.json({
      success: true,
      usersTotal: usersCount.rows[0].count,
      attachmentsTotal: attCount.rows[0].count,
      unsyncedUsers: unsynced.rows,
      testMatchCount: testMatch.rowCount
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
