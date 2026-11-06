/** Run only against a dedicated, empty Neon destination. Source is always read-only. */
import { Pool } from "pg";
import { copyLegacyDatabase } from "../lib/db/import-legacy";
const sourceUrl = process.env.SOURCE_DATABASE_URL;
const targetUrl = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!sourceUrl || !targetUrl)
  throw new Error("Set SOURCE_DATABASE_URL and DATABASE_URL_UNPOOLED");
if (new URL(sourceUrl).hostname === new URL(targetUrl).hostname)
  throw new Error("Source and destination must differ");
const source = new Pool({ connectionString: sourceUrl, max: 1 });
const target = new Pool({ connectionString: targetUrl, max: 1 });
try {
  await copyLegacyDatabase(source, target, console.log);
} catch (error) {
  console.error(
    "Import rolled back:",
    error instanceof Error ? error.message : "Unknown error",
  );
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
