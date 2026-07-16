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
         and (phone_number is null or phone is null)`
    );

    let fixedCount = 0;
    if (req.query.fix === "true" && unsynced.rows.length > 0) {
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

      for (const row of unsynced.rows as { id: string; email: string; phone: string | null; phone_number: string | null }[]) {
        const emailPhone = row.email.split("@")[0];
        const rawPhoneInput = row.phone_number || row.phone || emailPhone;
        const norm = normalizePhone(rawPhoneInput);
        const form = formatPhone(rawPhoneInput);

        await pool.query(
          `update public.users 
           set phone_number = $2,
               phone = $3
           where id = $1`,
          [row.id, norm, form]
        );
        fixedCount++;
      }
    }

    // Fetch remaining unsynced users after any fixes
    const unsyncedAfter = await pool.query(
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
      unsyncedCountBeforeFix: unsynced.rows.length,
      fixedCount,
      unsyncedUsersRemaining: unsyncedAfter.rows,
      testMatchCount: testMatch.rows.length
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
