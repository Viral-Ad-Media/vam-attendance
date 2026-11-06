import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { passwordHash } from "./password";
export async function registerAccount(
  pool: Pool,
  input: { email: string; password: string; fullName: string },
) {
  const userId = randomUUID(),
    orgId = randomUUID(),
    orgName = `${input.fullName}'s Org`;
  const hash = await passwordHash(input.password);
  const connection = await pool.connect();
  try {
    await connection.query("BEGIN");
    await connection.query(
      'INSERT INTO auth_users(id,name,email,"emailVerified","createdAt","updatedAt",app_metadata,user_metadata) VALUES($1,$2,$3,false,now(),now(),$4,$5)',
      [
        userId,
        input.fullName,
        input.email.toLowerCase(),
        { org_id: orgId, org_name: orgName },
        { full_name: input.fullName },
      ],
    );
    await connection.query(
      'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2::text,\'credential\',$2::uuid,$3,now(),now())',
      [randomUUID(), userId, hash],
    );
    await connection.query(
      "INSERT INTO organizations(id,name,owner_id) VALUES($1,$2,$3)",
      [orgId, orgName, userId],
    );
    await connection.query(
      "INSERT INTO memberships(org_id,user_id,role) VALUES($1,$2,'owner')",
      [orgId, userId],
    );
    await connection.query(
      "INSERT INTO users(id,org_id,email,full_name) VALUES($1,$2,$3,$4)",
      [userId, orgId, input.email.toLowerCase(), input.fullName],
    );
    await connection.query("COMMIT");
    return { userId, orgId };
  } catch (error) {
    await connection.query("ROLLBACK");
    throw error;
  } finally {
    connection.release();
  }
}
