import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function ensureMigrationsTable(client) {
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

async function run() {
  const migrationsDir = path.resolve(process.cwd(), "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    for (const file of files) {
      const version = file;
      const already = await client.query(
        "select 1 from public.schema_migrations where version = $1 limit 1",
        [version]
      );
      if (already.rowCount) {
        console.log(`[migrate] skip ${version}`);
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      console.log(`[migrate] apply ${version}`);
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into public.schema_migrations (version) values ($1)", [version]);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
    console.log("[migrate] done");
  } finally {
    client.release();
  }
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });

