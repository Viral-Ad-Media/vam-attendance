import type { Pool } from "pg";
import { randomUUID } from "node:crypto";
const tables = [
  "organizations",
  "memberships",
  "users",
  "teachers",
  "students",
  "courses",
  "sessions",
  "enrollments",
  "attendance",
  "invites",
  "subscriptions",
  "audit_logs",
  "student_feedback",
  "student_feedback_requests",
];
const quote = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export async function copyLegacyDatabase(
  source: Pool,
  target: Pool,
  onProgress: (message: string) => void = () => {},
) {
  const src = await source.connect();
  let dst;
  try {
    dst = await target.connect();
  } catch (error) {
    src.release();
    throw error;
  }
  try {
    await src.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await dst.query("BEGIN");
    await dst.query("SELECT pg_advisory_xact_lock(192301125)");
    for (const table of ["auth_users", ...tables]) {
      const count = await dst.query(
        `SELECT count(*)::int AS n FROM ${quote(table)}`,
      );
      if (count.rows[0].n)
        throw new Error(
          `Destination ${table} is not empty. Import aborted without changes.`,
        );
    }
    const auth = await src.query(
      "SELECT id,email,encrypted_password,email_confirmed_at,created_at,updated_at,raw_app_meta_data,raw_user_meta_data FROM auth.users ORDER BY created_at",
    );
    for (const row of auth.rows) {
      if (row.encrypted_password && !/^\$2[aby]\$/.test(row.encrypted_password))
        throw new Error("Unsupported legacy password format; import aborted");
      if (!row.email)
        throw new Error("An account without email requires manual migration");
      await dst.query(
        'INSERT INTO auth_users(id,name,email,"emailVerified","createdAt","updatedAt",app_metadata,user_metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
        [
          row.id,
          row.raw_user_meta_data?.full_name ||
            row.raw_user_meta_data?.name ||
            row.email,
          row.email.toLowerCase(),
          Boolean(row.email_confirmed_at),
          row.created_at,
          row.updated_at ?? row.created_at,
          row.raw_app_meta_data ?? {},
          row.raw_user_meta_data ?? {},
        ],
      );
      if (row.encrypted_password)
        await dst.query(
          'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2::text,\'credential\',$2::uuid,$3,$4,$5)',
          [
            randomUUID(),
            row.id,
            row.encrypted_password,
            row.created_at,
            row.updated_at ?? row.created_at,
          ],
        );
    }
    onProgress(
      `Copied ${auth.rows.length} accounts; legacy sessions are intentionally not imported.`,
    );
    // Feedback requests and feedback can refer to each other. Load their nullable
    // feedback_id links after both tables have been copied.
    const feedbackLinks: Array<{ id: string; feedback_id: string }> = [];
    for (const table of tables) {
      const exists = await src.query("SELECT to_regclass($1) AS relation", [
        "public." + table,
      ]);
      if (!exists.rows[0].relation) {
        onProgress(`${table}: not present in source`);
        continue;
      }
      const { rows } = await src.query(`SELECT * FROM public.${quote(table)}`);
      const columns = await dst.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",
        [table],
      );
      const supported = new Set(columns.rows.map((row) => row.column_name));
      for (const row of rows) {
        if (table === "student_feedback_requests" && row.feedback_id) {
          feedbackLinks.push({ id: row.id, feedback_id: row.feedback_id });
          row.feedback_id = null;
        }
        const keys = Object.keys(row).filter((key) => supported.has(key));
        const values = keys.map((key) =>
          typeof row[key] === "object" &&
          row[key] !== null &&
          !(row[key] instanceof Date)
            ? JSON.stringify(row[key])
            : row[key],
        );
        await dst.query(
          `INSERT INTO public.${quote(table)} (${keys.map(quote).join(",")}) VALUES (${keys.map((_, i) => "$" + (i + 1)).join(",")})`,
          values,
        );
      }
      const count = await dst.query(
        `SELECT count(*)::int AS n FROM public.${quote(table)}`,
      );
      if (count.rows[0].n !== rows.length)
        throw new Error(`Row count mismatch in ${table}`);
      onProgress(`${table}: ${rows.length} verified`);
    }
    for (const link of feedbackLinks)
      await dst.query(
        "UPDATE student_feedback_requests SET feedback_id=$1 WHERE id=$2",
        [link.feedback_id, link.id],
      );
    await dst.query("COMMIT");
    await src.query("COMMIT");
    onProgress(
      "Import committed. UUIDs, memberships, and password hashes preserved. Source unchanged.",
    );
  } catch (error) {
    await dst.query("ROLLBACK");
    await src.query("ROLLBACK");
    // Avoid exposing connection strings, password hashes or user rows in error logs.

    throw error;
  } finally {
    src.release();
    dst.release();
  }
}
