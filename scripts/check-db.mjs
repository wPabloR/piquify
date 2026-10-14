import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("MISSING");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, max: 1 });
try {
  const [row] = await sql`select current_user, current_database()`;
  const ok = row.current_user.startsWith("piquify_app");
  console.log(
    JSON.stringify({
      ok,
      current_user: row.current_user,
      database: row.current_database,
      expected_user_prefix: "piquify_app",
    }),
  );
  if (!ok) process.exit(1);
} catch (err) {
  console.error(err instanceof Error ? err.message : "connection failed");
  process.exit(1);
} finally {
  await sql.end({ timeout: 2 });
}
