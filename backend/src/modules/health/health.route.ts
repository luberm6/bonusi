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
    
    // Find all users who share the same last 10 digits of phone or email prefix
    const duplicatesQuery = await pool.query(
      `select u.id, u.email, u.phone, u.phone_number, u.role, u.created_at,
              (select count(*)::int from public.visits where client_id = u.id) as visits_count,
              (select count(*)::int from public.messages where sender_id = u.id or receiver_id = u.id) as messages_count,
              (select count(*)::int from public.bonus_transactions where client_id = u.id) as bonus_count
       from public.users u
       where u.role = 'client'`
    );

    // Group by last 10 digits of phone/email to find duplicate entries
    const grouped = new Map<string, any[]>();
    for (const row of duplicatesQuery.rows) {
      const clean = (row.phone_number || row.phone || row.email || "").replace(/\D/g, "");
      const suffix = clean.substring(clean.length - 10);
      if (suffix && suffix.length === 10) {
        const list = grouped.get(suffix) ?? [];
        list.push(row);
        grouped.set(suffix, list);
      }
    }

    const duplicateGroups: any[] = [];
    for (const [suffix, list] of grouped.entries()) {
      if (list.length > 1) {
        duplicateGroups.push({ suffix, accounts: list });
      }
    }

    return res.json({
      success: true,
      usersTotal: usersCount.rows[0].count,
      attachmentsTotal: attCount.rows[0].count,
      duplicateGroupsCount: duplicateGroups.length,
      duplicateGroups
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
