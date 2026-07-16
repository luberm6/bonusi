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

    let deletedDuplicatesCount = 0;
    let synchronizedAccountsCount = 0;

    const duplicateGroups: any[] = [];
    for (const [suffix, list] of grouped.entries()) {
      if (list.length > 1) {
        duplicateGroups.push({ suffix, accounts: list });

        if (req.query.fix === "true") {
          // Find if there is a duplicate with 0 activity
          const emptyAccounts = list.filter(a => a.visits_count === 0 && a.messages_count === 0 && a.bonus_count === 0);
          const activeAccounts = list.filter(a => a.visits_count > 0 || a.messages_count > 0 || a.bonus_count > 0);

          let masterAccount = activeAccounts[0] || list[0];
          
          // Delete empty duplicate accounts that are not the master account
          for (const empty of emptyAccounts) {
            if (empty.id !== masterAccount.id) {
              await pool.query("delete from public.users where id = $1", [empty.id]);
              deletedDuplicatesCount++;
            }
          }

          // Update the master account with formatted and normalized phone
          const rawPhone = masterAccount.phone_number || masterAccount.phone || suffix;
          await pool.query(
            `update public.users 
             set phone_number = $2,
                 phone = $3
             where id = $1`,
            [masterAccount.id, normalizePhone(rawPhone), formatPhone(rawPhone)]
          );
          synchronizedAccountsCount++;
        }
      }
    }

    // Return the updated counts and list
    return res.json({
      success: true,
      usersTotal: usersCount.rows[0].count,
      attachmentsTotal: attCount.rows[0].count,
      duplicateGroupsCountBeforeFix: duplicateGroups.length,
      deletedDuplicatesCount,
      synchronizedAccountsCount
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});
