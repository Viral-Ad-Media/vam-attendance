import { readFile } from "node:fs/promises";
import { Pool } from "pg";
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL_UNPOOLED (direct Neon connection)");
const pool = new Pool({ connectionString: url });
const client = await pool.connect();
try {
  // The whole schema, including role grants and policies, rolls back on failure.
  const schema = (
    await readFile(new URL("../database/schema.sql", import.meta.url), "utf8")
  )
    .replace(/^BEGIN;$/gm, "")
    .replace(/^COMMIT;$/gm, "");
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(192301125)");
  await client.query(
    "CREATE TABLE IF NOT EXISTS vam_migrations(version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = await client.query(
    "SELECT 1 FROM vam_migrations WHERE version=$1",
    ["20261106_neon_better_auth"],
  );
  if (!applied.rowCount) {
    await client.query(schema);
    await client.query("INSERT INTO vam_migrations(version) VALUES($1)", [
      "20261106_neon_better_auth",
    ]);
  }
  await client.query("COMMIT");
  console.log("Neon schema is ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
