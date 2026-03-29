import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";
import type { AuthenticatedUser } from "../../common/types/auth.js";
import { logAudit } from "../audit/audit.service.js";
import type { BonusSettingsDto } from "./bonus-settings.dto.js";

type BonusSettingsRow = {
  id: string;
  accrual_mode: "percentage" | "fixed";
  percentage_value: string | null;
  fixed_value: number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

function assertManagePermission(actor: AuthenticatedUser) {
  if (!["admin", "super_admin"].includes(actor.role)) {
    throw new HttpError(403, "Only admin/super_admin can manage bonus settings");
  }
}

function toView(row: BonusSettingsRow) {
  return {
    id: row.id,
    accrualMode: row.accrual_mode,
    percentageValue: row.percentage_value === null ? null : Number(row.percentage_value),
    fixedValue: row.fixed_value === null ? null : Number(row.fixed_value),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function lockSettingsStream(client: PoolClient) {
  await client.query("select pg_advisory_xact_lock(hashtext('bonus_settings_active'))");
}

async function getActiveRow(client?: PoolClient): Promise<BonusSettingsRow> {
  const runner = client ?? pool;
  const result = await runner.query(
    `select id, accrual_mode, percentage_value, fixed_value, is_active, created_at, updated_at
     from public.bonus_settings
     where is_active = true
     order by updated_at desc, created_at desc
     limit 1`
  );
  if (!result.rowCount) {
    throw new HttpError(404, "Active bonus settings not found");
  }
  return result.rows[0] as BonusSettingsRow;
}

export function calculateAccrualBonus(
  finalAmount: number,
  settings: { accrualMode: "percentage" | "fixed"; percentageValue: number | null; fixedValue: number | null }
) {
  if (!Number.isFinite(finalAmount) || finalAmount <= 0) return 0;
  if (settings.accrualMode === "fixed") {
    return Math.max(0, Math.floor(settings.fixedValue ?? 0));
  }
  const percentage = settings.percentageValue ?? 0;
  return Math.max(0, Math.floor((finalAmount * percentage) / 100));
}

export async function getBonusSettings(actor: AuthenticatedUser) {
  assertManagePermission(actor);
  const row = await getActiveRow();
  return toView(row);
}

export async function getActiveBonusSettings(client?: PoolClient) {
  const row = await getActiveRow(client);
  return toView(row);
}

export async function updateBonusSettings(actor: AuthenticatedUser, dto: BonusSettingsDto) {
  assertManagePermission(actor);
  const client = await pool.connect();
  try {
    await client.query("begin");
    await lockSettingsStream(client);

    const previous = await getActiveRow(client);
    await client.query("update public.bonus_settings set is_active = false where is_active = true");

    const inserted = await client.query(
      `insert into public.bonus_settings (accrual_mode, percentage_value, fixed_value, is_active)
       values ($1, $2, $3, true)
       returning id, accrual_mode, percentage_value, fixed_value, is_active, created_at, updated_at`,
      [dto.accrualMode, dto.percentageValue, dto.fixedValue]
    );
    const next = inserted.rows[0] as BonusSettingsRow;

    await logAudit({
      actorUserId: actor.id,
      action: "bonus_settings.update",
      entityType: "bonus_settings",
      entityId: next.id,
      payload: {
        previous: toView(previous),
        current: toView(next)
      },
      client
    });

    await client.query("commit");
    return toView(next);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
