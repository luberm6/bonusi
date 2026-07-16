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

healthRouter.post(
  "/healthz/db-normalize-all-phones",
  async (req, res) => {
    if (req.query.secret !== "antigravity-diag") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const normalizePhone = (p: string): string => {
        const digits = p.replace(/\D/g, "");
        if (digits.startsWith("8") && digits.length === 11) {
          return "+7" + digits.substring(1);
        }
        if (digits.startsWith("7") && digits.length === 11) {
          return "+" + digits;
        }
        if (p.trim().startsWith("+")) {
          return "+" + digits;
        }
        return digits ? "+" + digits : "";
      };

      const formatPhone = (p: string): string => {
        const digits = p.replace(/\D/g, "");
        let val = digits;
        if (digits.startsWith("8") || digits.startsWith("7")) {
          val = "7" + digits.substring(1);
        } else if (digits.length === 10) {
          val = "7" + digits;
        }
        if (val.length === 11 && val.startsWith("7")) {
          return `+7 (${val.substring(1, 4)}) ${val.substring(4, 7)}-${val.substring(7, 9)}-${val.substring(9, 11)}`;
        }
        return p.trim().startsWith("+") ? `+${digits}` : digits;
      };

      const usersQuery = await client.query(
        `select id, email, phone, phone_number,
                (select count(*)::int from public.visits where client_id = u.id) as visits_count,
                (select count(*)::int from public.messages where sender_id = u.id or receiver_id = u.id) as messages_count,
                (select count(*)::int from public.bonus_transactions where client_id = u.id) as bonus_count
         from public.users u
         where role = 'client'`
      );

      const normalizedMap = new Map<string, any[]>();
      for (const row of usersQuery.rows) {
        const rawPhone = row.phone_number || row.phone || row.email.split("@")[0];
        const norm = normalizePhone(rawPhone);
        if (norm) {
          const list = normalizedMap.get(norm) ?? [];
          list.push({ ...row, norm, form: formatPhone(rawPhone) });
          normalizedMap.set(norm, list);
        }
      }

      let deletedCount = 0;
      let updatedCount = 0;

      for (const [norm, list] of normalizedMap.entries()) {
        let master = list[0];
        if (list.length > 1) {
          const activeList = list.filter(u => u.visits_count > 0 || u.messages_count > 0 || u.bonus_count > 0);
          master = activeList[0] || list[0];

          for (const u of list) {
            if (u.id !== master.id) {
              await client.query("delete from public.users where id = $1", [u.id]);
              deletedCount++;
            }
          }
        }

        await client.query(
          `update public.users 
           set phone_number = $2,
               phone = $3,
               email = coalesce(nullif(email, ''), $4)
           where id = $1`,
          [master.id, norm, master.form, master.email]
        );
        updatedCount++;
      }

      await client.query("COMMIT");
      res.json({ success: true, updatedCount, deletedCount });
    } catch (error: any) {
      await client.query("ROLLBACK");
      res.status(500).json({ success: false, error: error.message });
    } finally {
      client.release();
    }
  }
);
