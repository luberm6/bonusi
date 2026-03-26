import type { PoolClient } from "pg";
import { pool } from "../../common/db/pool.js";

type AuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  payload?: unknown;
  client?: PoolClient;
};

export async function logAudit(input: AuditInput) {
  const payload = [input.actorUserId ?? null, input.action, input.entityType, input.entityId, JSON.stringify(input.payload ?? {})];
  if (input.client) {
    // Keep audit best-effort: failure must not break critical business transaction.
    try {
      await input.client.query("savepoint sp_audit_log");
      await input.client.query(
        `insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, payload)
         values ($1, $2, $3, $4, $5::jsonb)`,
        payload
      );
      await input.client.query("release savepoint sp_audit_log");
    } catch (error) {
      await input.client.query("rollback to savepoint sp_audit_log");
      await input.client.query("release savepoint sp_audit_log");
      console.error("[audit] failed but ignored", error);
    }
    return;
  }

  try {
    await pool.query(
      `insert into public.audit_logs (actor_user_id, action, entity_type, entity_id, payload)
       values ($1, $2, $3, $4, $5::jsonb)`,
      payload
    );
  } catch (error) {
    console.error("[audit] failed but ignored", error);
  }
}
