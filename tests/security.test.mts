import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { DatabaseClient, identifier } from "../lib/db/query";
import { passwordHash, passwordVerify } from "../lib/auth/password";
import { createAuth } from "../lib/auth/server";
import { isPlatformSuperadmin } from "../lib/auth/roles";
import { hash } from "bcryptjs";
import type { Pool } from "pg";
const root = new URL("../", import.meta.url);
const read = (path: string) => readFile(new URL(path, root), "utf8");
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const bootstrap = `CREATE TABLE public.unrelated (id int);
ALTER TABLE public.unrelated ENABLE ROW LEVEL SECURITY;
CREATE POLICY keep_me ON public.unrelated FOR SELECT USING (true);`;
const schema = await read("database/schema.sql");
const migration = (
  await read("database/migrations/20261005_authorization_tenant_isolation.sql")
).replaceAll("auth.uid()", "app_private.user_id()");
const legacySchema = schema.split(
  "-- Security hardening (also shipped separately for existing installations).",
)[0];

async function seed(db: PGlite) {
  await db.exec(`
    INSERT INTO auth_users(id,name,email) SELECT x::uuid,x,x||'@test.com' FROM (VALUES ('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(5)}')) ids(x);
    INSERT INTO organizations(id,name,owner_id) VALUES ('${id(10)}','Org A','${id(1)}'),('${id(11)}','Org B','${id(5)}');
    INSERT INTO memberships(org_id,user_id,role) VALUES
      ('${id(10)}','${id(1)}','owner'),('${id(10)}','${id(2)}','teacher'),
      ('${id(10)}','${id(3)}','teacher'),('${id(10)}','${id(4)}','viewer'),('${id(11)}','${id(5)}','owner');
    INSERT INTO users(id,org_id,email) VALUES ('${id(2)}','${id(10)}','t1@test.com'),('${id(3)}','${id(10)}','t2@test.com');
    INSERT INTO teachers(id,org_id,name,email,user_id) VALUES
      ('${id(20)}','${id(10)}','Teacher 1','t1@test.com','${id(2)}'),
      ('${id(21)}','${id(10)}','Teacher 2','t2@test.com','${id(3)}'),
      ('${id(22)}','${id(11)}','Teacher B','tb@test.com',NULL);
    INSERT INTO students(id,org_id,name) VALUES ('${id(30)}','${id(10)}','Own student'),
      ('${id(31)}','${id(10)}','Other student'),('${id(32)}','${id(11)}','Other tenant student');
    INSERT INTO courses(id,org_id,title,modality,lead_teacher_id) VALUES
      ('${id(50)}','${id(10)}','Own course','group','${id(20)}'),
      ('${id(51)}','${id(10)}','Other course','group','${id(21)}'),
      ('${id(52)}','${id(11)}','Other tenant course','group','${id(22)}');
    INSERT INTO sessions(id,org_id,teacher_id,course_id,starts_at) VALUES
      ('${id(40)}','${id(10)}','${id(20)}','${id(50)}',now()),
      ('${id(41)}','${id(10)}','${id(21)}','${id(51)}',now()),
      ('${id(42)}','${id(11)}','${id(22)}','${id(52)}',now());
    INSERT INTO enrollments(org_id,student_id,course_id,teacher_id) VALUES
      ('${id(10)}','${id(30)}','${id(50)}','${id(20)}'),
      ('${id(10)}','${id(31)}','${id(51)}','${id(21)}');
    INSERT INTO attendance(id,org_id,student_id,session_id,status) VALUES
      ('${id(60)}','${id(10)}','${id(30)}','${id(40)}','absent'),
      ('${id(61)}','${id(10)}','${id(31)}','${id(41)}','present');
    INSERT INTO invites(org_id,email,role,token,expires_at) VALUES ('${id(10)}','invited@test.com','admin','secret-token',now()+interval '1 day');
    INSERT INTO student_feedback(id,org_id,student_id,teacher_id,session_id,title,body) VALUES
      ('${id(70)}','${id(10)}','${id(30)}','${id(20)}','${id(40)}','Own feedback','Good'),
      ('${id(71)}','${id(10)}','${id(31)}','${id(21)}','${id(41)}','Other feedback','Good');
    INSERT INTO student_feedback_requests(org_id,attendance_id,student_id,session_id,token_hash,sent_to) VALUES
      ('${id(10)}','${id(60)}','${id(30)}','${id(40)}','hash1','student@test.com'),
      ('${id(10)}','${id(61)}','${id(31)}','${id(41)}','hash2','other@test.com');
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  `);
}
async function asUser(db: PGlite, userId: string, sql: string) {
  await db.exec(`SET ROLE authenticated; SET app.user_id = '${userId}';`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("RESET ROLE; RESET app.user_id;");
  }
}
const denied = async (promise: Promise<unknown>, code = "42501") =>
  assert.rejects(
    promise,
    (e: unknown) => (e as { code: string }).code === code,
  );

test("database enforces teacher assignments and tenant isolation for direct SQL clients", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(bootstrap);
    await db.exec(legacySchema);
    await seed(db);
    await db.exec(migration);
    await db.exec(migration); // repeatable upgrade
    assert.equal(
      (
        await db.query(
          "SELECT 1 FROM pg_policies WHERE tablename='unrelated' AND policyname='keep_me'",
        )
      ).rows.length,
      1,
    );
    for (const table of [
      "teachers",
      "students",
      "courses",
      "sessions",
      "enrollments",
      "attendance",
      "student_feedback",
      "student_feedback_requests",
    ]) {
      assert.equal(
        (await asUser(db, id(2), `SELECT * FROM ${table}`)).rows.length,
        1,
        table,
      );
    }
    assert.equal(
      (await asUser(db, id(2), "SELECT * FROM invites")).rows.length,
      0,
    );
    assert.equal(
      (await asUser(db, id(4), "SELECT * FROM invites")).rows.length,
      0,
    );
    assert.equal(
      (await asUser(db, id(1), "SELECT * FROM invites")).rows.length,
      1,
    );
    assert.equal(
      (await asUser(db, id(1), "SELECT * FROM students")).rows.length,
      2,
    );
    assert.equal(
      (await asUser(db, id(5), "SELECT * FROM students")).rows.length,
      1,
    );
    // Own attendance updates and upserts work; another teacher's records stay hidden.
    assert.equal(
      (
        await asUser(
          db,
          id(2),
          `UPDATE attendance SET status='present' WHERE id='${id(60)}' RETURNING id`,
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (
        await asUser(
          db,
          id(2),
          `UPDATE attendance SET status='absent' WHERE id='${id(61)}' RETURNING id`,
        )
      ).rows.length,
      0,
    );
    await asUser(
      db,
      id(2),
      `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(30)}','late') ON CONFLICT(org_id,session_id,student_id) DO UPDATE SET status=excluded.status`,
    );
    await denied(
      asUser(
        db,
        id(2),
        `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(41)}','${id(30)}','late')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(2),
        `UPDATE sessions SET teacher_id='${id(21)}' WHERE id='${id(40)}'`,
      ),
    );
    await asUser(
      db,
      id(2),
      `INSERT INTO sessions(id,org_id,teacher_id,course_id,starts_at) VALUES ('${id(43)}','${id(10)}','${id(20)}','${id(50)}',now())`,
    );
    await asUser(
      db,
      id(2),
      `INSERT INTO student_feedback(org_id,student_id,teacher_id,session_id,title,body) VALUES ('${id(10)}','${id(30)}','${id(20)}','${id(40)}','Teacher note','Own student note')`,
    );
    await denied(
      asUser(
        db,
        id(2),
        `INSERT INTO student_feedback(org_id,student_id,teacher_id,session_id,title,body) VALUES ('${id(10)}','${id(31)}','${id(21)}','${id(41)}','Bad note','Not assigned')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(2),
        `INSERT INTO courses(org_id,title,modality) VALUES ('${id(10)}','Unauthorized','group')`,
      ),
    );
    assert.equal(
      (
        await asUser(
          db,
          id(2),
          `DELETE FROM sessions WHERE id='${id(41)}' RETURNING id`,
        )
      ).rows.length,
      0,
    );
    await denied(
      asUser(
        db,
        id(2),
        `INSERT INTO students(org_id,name) VALUES ('${id(10)}','Unauthorized student')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(4),
        `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(31)}','late')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(1),
        `INSERT INTO subscriptions(org_id,status) VALUES ('${id(10)}','active')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(2),
        `INSERT INTO audit_logs(org_id,actor_id,action,entity) VALUES ('${id(10)}','${id(1)}','fake','student')`,
      ),
    );
    await denied(
      asUser(
        db,
        id(2),
        `UPDATE users SET org_id='${id(11)}' WHERE id='${id(2)}'`,
      ),
    );
    // All relationship checks also apply to the database owner/service-role path.
    const badLinks = [
      `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(32)}','late')`,
      `INSERT INTO enrollments(org_id,student_id,course_id) VALUES ('${id(10)}','${id(30)}','${id(52)}')`,
      `INSERT INTO sessions(org_id,teacher_id,starts_at) VALUES ('${id(10)}','${id(22)}',now())`,
      `INSERT INTO courses(org_id,title,modality,lead_teacher_id) VALUES ('${id(10)}','Bad','group','${id(22)}')`,
      `INSERT INTO student_feedback(org_id,student_id,title,body,session_id) VALUES ('${id(10)}','${id(30)}','Bad','Bad','${id(42)}')`,
      `INSERT INTO student_feedback_requests(org_id,attendance_id,student_id,session_id,token_hash,sent_to) VALUES ('${id(11)}','${id(60)}','${id(32)}','${id(42)}','bad','bad@test.com')`,
      `UPDATE attendance SET student_id='${id(32)}' WHERE id='${id(60)}'`,
    ];
    for (const sql of badLinks) await denied(db.exec(sql), "23503");
    await denied(
      db.exec(`UPDATE students SET org_id='${id(11)}' WHERE id='${id(30)}'`),
    );
    // Existing FK SET NULL/CASCADE delete behavior remains compatible.
    await db.exec(
      `DELETE FROM teachers WHERE id='${id(20)}'; DELETE FROM courses WHERE id='${id(50)}';`,
    );
    assert.equal(
      (await db.query(`SELECT * FROM sessions WHERE id='${id(40)}'`)).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});

test("fresh schema preserves unrelated policies and migration aborts safely on existing bad links", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(bootstrap);
    await db.exec(schema);
    await seed(db);
    assert.equal(
      (await db.query("SELECT 1 FROM pg_policies WHERE tablename='unrelated'"))
        .rows.length,
      1,
    );
    await db.exec(
      "ALTER TABLE attendance DISABLE TRIGGER enforce_org_relations",
    );
    await db.exec(
      `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(32)}','late')`,
    );
    await db.exec(
      "ALTER TABLE attendance ENABLE TRIGGER enforce_org_relations",
    );
    await assert.rejects(db.exec(migration), /Cross-organization links found/);
    await db.exec("ROLLBACK");
    assert.equal(
      (await db.query(`SELECT * FROM attendance WHERE student_id='${id(32)}'`))
        .rows.length,
      1,
    );
    assert.equal(
      (
        await db.query(
          "SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='scoped_read'",
        )
      ).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});

test("platform privilege ignores editable metadata and password migration accepts bcrypt and scrypt", async () => {
  assert.equal(
    isPlatformSuperadmin({
      app_metadata: {},
      user_metadata: { role: "superadmin" },
    } as { app_metadata: Record<string, unknown> }),
    false,
  );
  assert.equal(
    isPlatformSuperadmin({ app_metadata: { role: "superadmin" } }),
    true,
  );
  const password = "Test-only-password-218!";
  for (const encoded of [
    await passwordHash(password),
    await hash(password, 10),
  ]) {
    assert.equal(await passwordVerify({ password, hash: encoded }), true);
    assert.equal(
      await passwordVerify({ password: "incorrect", hash: encoded }),
      false,
    );
  }
});

test("SQL query builder binds values, filters, upserts, and embedded joins under RLS", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(schema);
    await seed(db);
    const execute = async (sql: string, values: unknown[]) => {
      const result = await db.query<Record<string, unknown>>(sql, values);
      return { rows: result.rows, rowCount: result.affectedRows };
    };
    const client = new DatabaseClient(execute);
    const own = await client
      .from("students")
      .select("id,name")
      .eq("name", "Own student")
      .single();
    assert.equal(own.error, null);
    assert.equal(own.data?.id, id(30));
    const attack = await client
      .from("students")
      .select("id")
      .eq("name", "' OR true --");
    assert.deepEqual(attack.data, []);
    assert.throws(() => identifier("id; DROP TABLE students"));
    assert.throws(() => client.from("auth_users"));
    const update = await client
      .from("attendance")
      .update({ status: "late" })
      .eq("id", id(60))
      .select("id,status")
      .single();
    assert.equal(update.data?.status, "late");
    const upsert = await client
      .from("attendance")
      .upsert(
        {
          org_id: id(10),
          session_id: id(40),
          student_id: id(30),
          status: "present",
        },
        { onConflict: "org_id,session_id,student_id" },
      )
      .select()
      .single();
    assert.equal(upsert.data?.status, "present");
    const embedded = await client
      .from("enrollments")
      .select("student_id, students(id, name, email, program, class_name)")
      .eq("student_id", id(30))
      .single();
    assert.equal(embedded.data?.students.name, "Own student");
    const unfiltered = await client.from("students").delete();
    assert.ok(unfiltered.error);
    const unknown = await client
      .from("students")
      .select("id")
      .eq("id", id(99))
      .maybeSingle();
    assert.equal(unknown.data, null);
    assert.equal(unknown.error, null);
    // Simulate the exact transaction-local role+identity contract of the pg pool executor.
    await db.exec(
      `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL app.user_id='${id(2)}'`,
    );
    const restricted = await client.from("students").select("id");
    assert.deepEqual(
      restricted.data?.map((row) => row.id),
      [id(30)],
    );
    await db.exec("COMMIT");
    const reset = await db.query<{ role: string; identity: string }>(
      "SELECT current_user AS role, current_setting('app.user_id',true) AS identity",
    );
    assert.notEqual(reset.rows[0].role, "authenticated");
    assert.equal(reset.rows[0].identity, "");
  } finally {
    await db.close();
  }
});

// pg-compatible pool backed by real embedded PostgreSQL, not a query-result mock.
class EmbeddedPool {
  private tail: Promise<void> = Promise.resolve();
  constructor(private engine: PGlite) {}
  async connect() {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    return {
      query: async (sql: string, values: unknown[] = []) => {
        const r = await this.engine.query(sql, [...values]);
        return {
          rows: r.rows,
          rowCount: r.affectedRows ?? r.rows.length,
          command: sql.trim().split(/\s/)[0].toUpperCase(),
        };
      },
      release,
    };
  }
  async query(sql: string, values: unknown[] = []) {
    const c = await this.connect();
    try {
      return await c.query(sql, values);
    } finally {
      c.release();
    }
  }
  async end() {}
}

test("Better Auth signs in imported accounts, restores and revokes sessions, resets passwords once, and rejects CSRF", async () => {
  const db = await PGlite.create();
  const originalFetch = globalThis.fetch;
  try {
    await db.exec(schema);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_SECRET =
      "local-test-only-secret-0000000000000000000000000";
    process.env.RESEND_API_KEY = "test-only";
    process.env.RESEND_FROM_EMAIL = "test@example.com";
    const password = "Test-only-password-218!";
    await db.query(
      'INSERT INTO auth_users(id,name,email,"emailVerified") VALUES($1,$2,$3,true)',
      [id(1), "Imported User", "imported@example.com"],
    );
    await db.query(
      'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password) VALUES($1,$2::text,\'credential\',$2::uuid,$3)',
      [id(2), id(1), await hash(password, 10)],
    );
    const auth = createAuth(new EmbeddedPool(db) as unknown as Pool);
    const call = (
      path: string,
      body?: unknown,
      cookie?: string,
      origin = "http://localhost:3000",
    ) =>
      auth.handler(
        new Request(`http://localhost:3000/api/auth/${path}`, {
          method: body === undefined ? "GET" : "POST",
          headers: {
            "Content-Type": "application/json",
            Origin: origin,
            ...(cookie ? { Cookie: cookie } : {}),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
      );
    const bad = await call("sign-in/email", {
      email: "imported@example.com",
      password: "incorrect",
    });
    assert.equal(bad.status, 401);
    const signedIn = await call("sign-in/email", {
      email: "imported@example.com",
      password,
    });
    assert.equal(signedIn.status, 200, await signedIn.clone().text());
    const cookie = signedIn.headers
      .getSetCookie()
      .map((item) => item.split(";")[0])
      .join("; ");
    assert.ok(cookie.includes("better-auth.session_token="));
    const session = await call("get-session", undefined, cookie);
    assert.equal((await session.json()).user.id, id(1));
    const forged = await call(
      "get-session",
      undefined,
      "better-auth.session_token=forged",
    );
    assert.equal(await forged.json(), null);
    const csrf = await call("sign-out", {}, cookie, "https://attacker.invalid");
    assert.equal(csrf.status, 403);
    let mailSent = false;
    globalThis.fetch = async () => {
      mailSent = true;
      return new Response('{"id":"email-id"}', { status: 200 });
    };
    const recovery = await call("request-password-reset", {
      email: "imported@example.com",
      redirectTo: "http://localhost:3000/auth/reset-password",
    });
    assert.equal(recovery.status, 200, await recovery.clone().text());
    assert.equal(mailSent, true);
    const tokens = await db.query<{ identifier: string }>(
      "SELECT identifier FROM auth_verifications WHERE identifier LIKE 'reset-password:%'",
    );
    const token = tokens.rows[0].identifier.slice("reset-password:".length);
    const reset = await call("reset-password", {
      newPassword: "New-test-password-919!",
      token,
    });
    assert.equal(reset.status, 200, await reset.clone().text());
    const replay = await call("reset-password", {
      newPassword: "Another-password-999!",
      token,
    });
    assert.notEqual(replay.status, 200);
    const revoked = await call("get-session", undefined, cookie);
    assert.equal(await revoked.json(), null);
    const login = await call("sign-in/email", {
      email: "imported@example.com",
      password: "New-test-password-919!",
    });
    assert.equal(login.status, 200);
    const newCookie = login.headers
      .getSetCookie()
      .map((item) => item.split(";")[0])
      .join("; ");
    const logout = await call("sign-out", {}, newCookie);
    assert.equal(logout.status, 200);
    assert.equal(
      await (await call("get-session", undefined, newCookie)).json(),
      null,
    );
    const directSignup = await call("sign-up/email", {
      email: "unprovisioned@example.com",
      name: "No org",
      password,
    });
    assert.notEqual(directSignup.status, 200);
  } finally {
    globalThis.fetch = originalFetch;
    await db.close();
  }
});

test("registration provisions the whole workspace atomically and rolls back failed profiles", async () => {
  const db = await PGlite.create();
  try {
    await db.exec(schema);
    const { registerAccount } = await import("../lib/auth/register");
    const pool = new EmbeddedPool(db) as unknown as Pool;
    const created = await registerAccount(pool, {
      email: "owner@example.com",
      password: "New-account-test-991!",
      fullName: "New Owner",
    });
    const membership = await db.query<{ role: string }>(
      "SELECT role FROM memberships WHERE user_id=$1 AND org_id=$2",
      [created.userId, created.orgId],
    );
    assert.equal(membership.rows[0].role, "owner");
    assert.equal(
      (await db.query("SELECT 1 FROM users WHERE id=$1", [created.userId])).rows
        .length,
      1,
    );
    await assert.rejects(
      registerAccount(pool, {
        email: "OWNER@example.com",
        password: "New-account-test-991!",
        fullName: "Duplicate",
      }),
    );
    assert.equal(
      (await db.query("SELECT * FROM organizations")).rows.length,
      1,
    );
    await db.exec(
      "CREATE FUNCTION reject_test_profile() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test profile failure'; END $$; CREATE TRIGGER reject_test_profile BEFORE INSERT ON users FOR EACH ROW EXECUTE FUNCTION reject_test_profile();",
    );
    await assert.rejects(
      registerAccount(pool, {
        email: "rollback@example.com",
        password: "New-account-test-991!",
        fullName: "Rollback Owner",
      }),
      /test profile failure/,
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM auth_users WHERE email='rollback@example.com'",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (await db.query("SELECT * FROM organizations")).rows.length,
      1,
    );
  } finally {
    await db.close();
  }
});

test("legacy import preserves identities, memberships, password hashes and counts; refuses populated targets", async () => {
  const source = await PGlite.create(),
    target = await PGlite.create();
  try {
    await source.exec(schema);
    await seed(source);
    await target.exec(schema);
    await source.exec(`CREATE SCHEMA auth; CREATE VIEW auth.users AS SELECT u.id,u.email,
      (SELECT a.password FROM auth_accounts a WHERE a."userId"=u.id LIMIT 1) AS encrypted_password,
      CASE WHEN u."emailVerified" THEN u."updatedAt" ELSE NULL END AS email_confirmed_at,
      u."createdAt" AS created_at,u."updatedAt" AS updated_at,u.app_metadata AS raw_app_meta_data,u.user_metadata AS raw_user_meta_data FROM auth_users u;`);
    const legacyHash = await hash("Legacy-import-password-771!", 10);
    await source.query(
      'INSERT INTO auth_accounts(id,"accountId","providerId","userId",password) VALUES($1,$2::text,\'credential\',$2::uuid,$3)',
      [id(90), id(2), legacyHash],
    );
    const { copyLegacyDatabase } = await import("../lib/db/import-legacy");
    const src = new EmbeddedPool(source) as unknown as Pool,
      dst = new EmbeddedPool(target) as unknown as Pool;
    await copyLegacyDatabase(src, dst);
    for (const table of [
      "auth_users",
      "organizations",
      "memberships",
      "students",
      "teachers",
      "sessions",
      "attendance",
      "student_feedback_requests",
    ]) {
      const before = await source.query(`SELECT id FROM ${table} ORDER BY id`),
        after = await target.query(`SELECT id FROM ${table} ORDER BY id`);
      assert.deepEqual(after.rows, before.rows, table);
    }
    const credentials = await target.query<{ password: string }>(
      'SELECT password FROM auth_accounts WHERE "userId"=$1',
      [id(2)],
    );
    assert.equal(credentials.rows[0].password, legacyHash);
    assert.equal(
      (await target.query("SELECT * FROM auth_sessions")).rows.length,
      0,
    );
    await assert.rejects(copyLegacyDatabase(src, dst), /not empty/);
    assert.equal((await target.query("SELECT * FROM students")).rows.length, 3);
    assert.equal((await source.query("SELECT * FROM students")).rows.length, 3);
  } finally {
    await source.close();
    await target.close();
  }
});

test("new accounts require and can complete Better Auth email verification", async () => {
  const db = await PGlite.create();
  const originalFetch = globalThis.fetch;
  try {
    await db.exec(schema);
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.BETTER_AUTH_SECRET = "local-test-only-secret-0000000000000000000000000";
    process.env.RESEND_API_KEY = "test-only";
    process.env.RESEND_FROM_EMAIL = "test@example.com";
    const pool = new EmbeddedPool(db) as unknown as Pool;
    const { registerAccount } = await import("../lib/auth/register");
    const password = "Verify-new-account-552!";
    const account = await registerAccount(pool, { email: "verify@example.com", password, fullName: "Verify User" });
    const auth = createAuth(pool);
    let verificationURL = "";
    globalThis.fetch = async (_url, init) => {
      const message = JSON.parse(String(init?.body));
      verificationURL = message.text.match(/https?:\/\/\S+/)?.[0] ?? "";
      return new Response('{"id":"test-message"}', { status: 200 });
    };
    const signIn = () => auth.handler(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" }, body: JSON.stringify({ email: "verify@example.com", password }) }));
    assert.equal((await signIn()).status, 403);
    assert.ok(verificationURL.includes("verify-email"));
    const verify = await auth.handler(new Request(verificationURL));
    assert.ok(verify.status < 400);
    const row = await db.query<{ emailVerified: boolean }>('SELECT "emailVerified" FROM auth_users WHERE id=$1', [account.userId]);
    assert.equal(row.rows[0].emailVerified, true);
    assert.equal((await signIn()).status, 200);
  } finally { globalThis.fetch = originalFetch; await db.close(); }
});
