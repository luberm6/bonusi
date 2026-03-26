import { Pool } from "pg";
import { env } from "../config/env.js";

const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000
});

export async function dbPing(): Promise<boolean> {
  const result = await pool.query("select 1 as ok");
  return result.rows[0]?.ok === 1;
}

export { pool };
