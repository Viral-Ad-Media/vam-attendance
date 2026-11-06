import { headers } from "next/headers";
import { getAuth } from "./server";
import { getPool } from "@/lib/db/pool";
export type AppUser = {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};
export async function getAppSession() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) return null;
  // Platform roles and preferences always come from the database, never cookies.
  const { rows } = await getPool().query(
    "SELECT * FROM auth_users WHERE id=$1",
    [session.user.id],
  );
  const row = rows[0];
  if (!row) return null;
  const user: AppUser = {
    id: row.id,
    email: row.email,
    created_at: new Date(row.createdAt).toISOString(),
    email_confirmed_at: row.emailVerified
      ? new Date(row.updatedAt).toISOString()
      : null,
    app_metadata: row.app_metadata ?? {},
    user_metadata: row.user_metadata ?? {},
  };
  return { user };
}
