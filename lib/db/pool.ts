import { Pool } from "pg";

let pool: Pool | undefined;
export function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return (pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  }));
}
