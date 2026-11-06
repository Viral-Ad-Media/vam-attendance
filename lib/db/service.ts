import { randomUUID } from "node:crypto";
import { createDatabaseClient } from "./client";
import { getPool } from "./pool";
import { passwordHash } from "@/lib/auth/password";
import type { AppUser } from "@/lib/auth/session";

type UserInput = {
  email: string;
  password?: string;
  email_confirm?: boolean;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};
function asUser(row: Record<string, unknown>): AppUser {
  return {
    id: String(row.id),
    email: String(row.email),
    created_at: String(row.createdAt),
    email_confirmed_at: row.emailVerified ? String(row.updatedAt) : null,
    app_metadata: (row.app_metadata ?? {}) as Record<string, unknown>,
    user_metadata: (row.user_metadata ?? {}) as Record<string, unknown>,
  };
}
export const authAdmin = {
  async getUserById(id: string) {
    const { rows } = await getPool().query(
      "SELECT * FROM auth_users WHERE id=$1",
      [id],
    );
    return { data: { user: rows[0] ? asUser(rows[0]) : null }, error: null };
  },
  async createUser(input: UserInput) {
    const connection = await getPool().connect();
    try {
      const id = randomUUID(),
        now = new Date(),
        password = await passwordHash(input.password ?? randomUUID());
      await connection.query("BEGIN");
      const { rows } = await connection.query(
        'INSERT INTO auth_users(id,name,email,"emailVerified","createdAt","updatedAt",app_metadata,user_metadata) VALUES($1,$2,$3,$4,$5,$5,$6,$7) RETURNING *',
        [
          id,
          input.user_metadata?.full_name ?? input.email,
          input.email.toLowerCase(),
          input.email_confirm ?? false,
          now,
          input.app_metadata ?? {},
          input.user_metadata ?? {},
        ],
      );
      await connection.query(
        'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2::text,\'credential\',$2::uuid,$3,$4,$4)',
        [randomUUID(), id, password, now],
      );
      await connection.query("COMMIT");
      return { data: { user: asUser(rows[0]) }, error: null };
    } catch (error) {
      await connection.query("ROLLBACK");
      const e = error as { code?: string; message: string };
      return {
        data: { user: null },
        error: {
          message:
            e.code === "23505"
              ? "User already exists for this email"
              : "Account creation failed",
        },
      };
    } finally {
      connection.release();
    }
  },
  async updateUserById(id: string, input: Partial<UserInput>) {
    const connection = await getPool().connect();
    try {
      await connection.query("BEGIN");
      if (input.email)
        await connection.query(
          'UPDATE auth_users SET email=$1,"updatedAt"=now() WHERE id=$2',
          [input.email.toLowerCase(), id],
        );
      if (input.app_metadata)
        await connection.query(
          "UPDATE auth_users SET app_metadata=coalesce(app_metadata,'{}'::jsonb)||$1::jsonb WHERE id=$2",
          [JSON.stringify(input.app_metadata), id],
        );
      if (input.user_metadata)
        await connection.query(
          "UPDATE auth_users SET user_metadata=coalesce(user_metadata,'{}'::jsonb)||$1::jsonb WHERE id=$2",
          [JSON.stringify(input.user_metadata), id],
        );
      if (input.password) {
        const hash = await passwordHash(input.password);
        await connection.query(
          'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2::text,\'credential\',$2::uuid,$3,now(),now()) ON CONFLICT("providerId","accountId") DO UPDATE SET password=EXCLUDED.password,"updatedAt"=now()',
          [randomUUID(), id, hash],
        );
      }
      // Administrative identity/privilege changes invalidate all active sessions.
      if (input.password || input.email || input.app_metadata)
        await connection.query('DELETE FROM auth_sessions WHERE "userId"=$1', [
          id,
        ]);
      await connection.query("COMMIT");
      return { error: null };
    } catch (error) {
      await connection.query("ROLLBACK");
      throw error;
    } finally {
      connection.release();
    }
  },
  async deleteUser(id: string) {
    await getPool().query("DELETE FROM auth_users WHERE id=$1", [id]);
    return { error: null };
  },
};
// Only import in server routes which have already checked authorization, or trusted jobs.
export function getAdminDatabase() {
  return Object.assign(createDatabaseClient(), { auth: { admin: authAdmin } });
}
