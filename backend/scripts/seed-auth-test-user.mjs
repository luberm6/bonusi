import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run() {
  const passwordHash = await bcrypt.hash("Passw0rd123", 12);
  await pool.query(
    `insert into public.users (email, password_hash, role, is_active)
     values ('superadmin@example.com', $1, 'super_admin', true)
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         is_active = true`,
    [passwordHash]
  );

  await pool.query(
    `insert into public.users (email, password_hash, role, is_active)
     values ('client@example.com', $1, 'client', true)
     on conflict (email) do update
     set password_hash = excluded.password_hash,
         is_active = true`,
    [passwordHash]
  );
  console.log("Seeded users: superadmin@example.com, client@example.com (password: Passw0rd123)");
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
