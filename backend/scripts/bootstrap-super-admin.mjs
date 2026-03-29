import bcrypt from "bcryptjs";
import pg from "pg";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("[bootstrap-super-admin] DATABASE_URL is required");
  process.exit(1);
}

const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() ?? "";
const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
const name = process.env.SUPER_ADMIN_NAME?.trim() || null;

if (!email && !password) {
  console.log("[bootstrap-super-admin] skipped (SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are not set)");
  process.exit(0);
}

if (!email) {
  console.error("[bootstrap-super-admin] SUPER_ADMIN_EMAIL is required when bootstrap is enabled");
  process.exit(1);
}

const pool = new Pool({ connectionString: databaseUrl });

async function run() {
  const existing = await pool.query(
    `select id, role
     from public.users
     where email = $1
     limit 1`,
    [email]
  );

  if (existing.rowCount === 0) {
    if (!password) {
      console.error("[bootstrap-super-admin] SUPER_ADMIN_PASSWORD is required for first-time super admin creation");
      process.exit(1);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const created = await pool.query(
      `insert into public.users (email, password_hash, role, is_active, full_name)
       values ($1, $2, 'super_admin', true, $3)
       returning id`,
      [email, passwordHash, name]
    );
    console.log(`[bootstrap-super-admin] Super admin bootstrap completed (id=${created.rows[0].id})`);
    return;
  }

  const user = existing.rows[0];
  if (user.role === "super_admin") {
    console.log("[bootstrap-super-admin] Super admin already exists");
    return;
  }

  console.error(
    "[bootstrap-super-admin] A user with SUPER_ADMIN_EMAIL already exists but does not have super_admin role. Refusing automatic promotion."
  );
  process.exit(1);
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
