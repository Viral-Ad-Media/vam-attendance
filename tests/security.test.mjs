import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { PGlite } from '@electric-sql/pglite';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
async function loadTs(path, dependencies = {}) {
  const code = ts.transpileModule(await read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, process, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const roles = await loadTs('lib/auth/roles.ts');

test('user-editable metadata never grants platform privileges', () => {
  for (const user of [null, {}, { user_metadata: { role: 'superadmin' } },
    { app_metadata: { role: 'teacher' }, user_metadata: { role: 'superadmin' } },
    { app_metadata: { role: null }, user_metadata: { role: 'superadmin' } }]) {
    assert.equal(roles.isPlatformSuperadmin(user), false);
  }
  assert.equal(roles.isPlatformSuperadmin({ app_metadata: { role: 'superadmin' } }), true);
});

class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

async function contextModule(user, membership = { role: 'teacher' }, cookieOrg = id(10)) {
  let serviceCalls = 0;
  const query = () => {
    const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: membership, error: null }) };
    return q;
  };
  const supabase = {
    auth: { getUser: async () => ({ data: { user } }), getSession: async () => ({ data: {
      session: { user: { id: 'forged-session-user' }, access_token: 'token' },
    } }) },
    from: query,
  };
  const mod = await loadTs('lib/api/supabase.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: cookieOrg }), getAll: () => [], set: () => {} }) },
    '@supabase/ssr': { createServerClient: () => supabase },
    './errors': { ApiError }, '@/lib/auth/roles': roles,
    '@/lib/supabase/service': { getServiceClient: () => { serviceCalls++; return supabase; } },
  });
  return { mod, serviceCalls: () => serviceCalls };
}

test('route context refuses forged superadmin and verifies tenant selection', async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
  const user = { id: id(2), app_metadata: { org_id: id(11) }, user_metadata: { role: 'superadmin' } };
  const { mod, serviceCalls } = await contextModule(user);
  const context = await mod.getRouteContext();
  assert.equal(context.isSuperadmin, false);
  assert.equal(context.role, 'teacher');
  assert.equal(context.orgId, id(10));
  assert.equal(context.session.user.id, user.id);
  assert.equal(serviceCalls(), 0);
  const denied = await contextModule(user, null);
  await assert.rejects(denied.mod.getRouteContext(), (e) => e.status === 403);
  const trusted = await contextModule({ ...user, app_metadata: { role: 'superadmin', org_id: id(10) } });
  assert.equal((await trusted.mod.getRouteContext()).role, 'superadmin');
  assert.equal(trusted.serviceCalls(), 1);
  for (const role of ['teacher', 'viewer', 'student', null]) {
    assert.throws(() => mod.requireOrgAdmin(role), (e) => e.status === 403);
  }
  for (const role of ['admin', 'superadmin']) assert.doesNotThrow(() => mod.requireOrgAdmin(role));
});

test('session checks scope teacher access and deny viewer writes', async () => {
  const { mod } = await contextModule({ id: id(2) });
  const filters = [];
  const q = { select: () => q, eq: (k, v) => { filters.push([k, v]); return q; },
    maybeSingle: async () => ({ data: { id: id(40) }, error: null }) };
  const context = { role: 'teacher', teacherId: id(20), orgId: id(10), supabase: { from: () => q } };
  await mod.requireSessionAccess(context, id(40), true);
  assert.deepEqual(filters, [['org_id', id(10)], ['id', id(40)], ['teacher_id', id(20)]]);
  await assert.rejects(mod.requireSessionAccess({ ...context, teacherId: null }, id(40)), (e) => e.status === 404);
  await assert.rejects(mod.requireSessionAccess({ ...context, role: 'viewer' }, id(40), true), (e) => e.status === 403);
});

test('privileged teacher, invitation and billing handlers deny non-admins before service access', async () => {
  const { mod } = await contextModule({ id: id(2) });
  process.env.STRIPE_SECRET_KEY = 'test-secret';
  process.env.STRIPE_PRICE_ID = 'test-price';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  let serviceCalls = 0;
  const dependencies = {
    'next/server': { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } },
    'zod': { z },
    '@/lib/api/supabase': {
      ...mod, getRouteContext: async () => ({ role: 'teacher', orgId: id(10), session: { user: { id: id(2) } } }),
    },
    '@/lib/api/errors': { ApiError, respondWithError: (error) => ({ status: error.status ?? 500 }) },
    '@/lib/api/audit': { logAudit: () => { throw new Error('Audit must not run'); } },
    '@/lib/api/rate-limit': { consumeRateLimit: () => ({ allowed: true }) },
    '@/lib/supabase/service': { getServiceClient: () => { serviceCalls++; throw new Error('Service must not run'); } },
    '@/lib/api/teacher-setup-email': {}, '@/lib/api/invite-email': {},
    '@/lib/telemetry': { logError: () => {} },
    'crypto': {}, 'stripe': {},
  };
  for (const [path, method, body] of [
    ['app/api/teachers/route.ts', 'POST', { name: 'Teacher', email: 'teacher@test.com', password: 'password123' }],
    ['app/api/teachers/[id]/route.ts', 'PATCH', { password: 'password123' }],
    ['app/api/teachers/[id]/route.ts', 'DELETE', {}],
    ['app/api/invites/route.ts', 'POST', { email: 'admin@test.com', role: 'admin' }],
    ['app/api/invites/route.ts', 'GET', {}],
    ['app/api/billing/checkout/route.ts', 'POST', {}],
    ['app/api/billing/portal/route.ts', 'POST', {}],
  ]) {
    const route = await loadTs(path, dependencies);
    const response = await route[method]({ headers: new Headers(), json: async () => body }, { params: Promise.resolve({ id: id(20) }) });
    assert.equal(response.status, 403, `${method} ${path}`);
  }
  assert.equal(serviceCalls, 0);
});

test('invite acceptance requires the matching confirmed email before membership writes', async () => {
  let writes = 0;
  const q = { select: () => q, eq: async () => ({ data: [{ id: id(80), org_id: id(10), email: 'invited@test.com', role: 'admin', expires_at: '2099-01-01' }] }) };
  let user;
  const route = await loadTs('app/api/invite/accept/route.ts', {
    'zod': { z }, 'next/server': {},
    'next/headers': { cookies: async () => ({ getAll: () => [], set: () => {} }) },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) } }) },
    '@/lib/api/errors': { ApiError, respondWithError: (error) => ({ status: error.status ?? 500 }) },
    '@/lib/api/audit': {},
    '@/lib/supabase/service': { getServiceClient: () => ({ from: () => ({ ...q, upsert: () => { writes++; } }) }) },
  });
  for (const candidate of [
    { email: 'attacker@test.com', email_confirmed_at: '2026-01-01' },
    { email: 'invited@test.com', email_confirmed_at: null },
  ]) {
    user = { id: id(2), ...candidate };
    const result = await route.POST({ json: async () => ({ token: 'secret' }) });
    assert.equal(result.status, 403);
  }
  assert.equal(writes, 0);
});

const bootstrap = `
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb; $$;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid(), auth.jwt() TO authenticated;
CREATE TABLE public.unrelated (id int);
ALTER TABLE public.unrelated ENABLE ROW LEVEL SECURITY;
CREATE POLICY keep_me ON public.unrelated FOR SELECT USING (true);
`;
const schema = await read('database/schema.sql');
const migration = await read('database/migrations/20261005_authorization_tenant_isolation.sql');
const legacySchema = schema.split('-- Security hardening (also shipped separately for existing installations).')[0];

async function seed(db) {
  await db.exec(`
    INSERT INTO auth.users VALUES ('${id(1)}'),('${id(2)}'),('${id(3)}'),('${id(4)}'),('${id(5)}');
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
async function asUser(db, userId, sql) {
  await db.exec(`SET ROLE authenticated; SET request.jwt.claim.sub = '${userId}';`);
  try { return await db.query(sql); }
  finally { await db.exec('RESET ROLE; RESET request.jwt.claim.sub;'); }
}
const denied = async (promise, code = '42501') => assert.rejects(promise, (e) => e.code === code);

test('database enforces teacher assignments and tenant isolation for direct SQL clients', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(bootstrap);
    await db.exec(legacySchema);
    await seed(db);
    await db.exec(migration);
    await db.exec(migration); // repeatable upgrade
    assert.equal((await db.query("SELECT 1 FROM pg_policies WHERE tablename='unrelated' AND policyname='keep_me'")).rows.length, 1);
    for (const table of ['teachers', 'students', 'courses', 'sessions', 'enrollments', 'attendance', 'student_feedback', 'student_feedback_requests']) {
      assert.equal((await asUser(db, id(2), `SELECT * FROM ${table}`)).rows.length, 1, table);
    }
    assert.equal((await asUser(db, id(2), 'SELECT * FROM invites')).rows.length, 0);
    assert.equal((await asUser(db, id(4), 'SELECT * FROM invites')).rows.length, 0);
    assert.equal((await asUser(db, id(1), 'SELECT * FROM invites')).rows.length, 1);
    assert.equal((await asUser(db, id(1), 'SELECT * FROM students')).rows.length, 2);
    assert.equal((await asUser(db, id(5), 'SELECT * FROM students')).rows.length, 1);
    // Own attendance updates and upserts work; another teacher's records stay hidden.
    assert.equal((await asUser(db, id(2), `UPDATE attendance SET status='present' WHERE id='${id(60)}' RETURNING id`)).rows.length, 1);
    assert.equal((await asUser(db, id(2), `UPDATE attendance SET status='absent' WHERE id='${id(61)}' RETURNING id`)).rows.length, 0);
    await asUser(db, id(2), `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(30)}','late') ON CONFLICT(org_id,session_id,student_id) DO UPDATE SET status=excluded.status`);
    await denied(asUser(db, id(2), `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(41)}','${id(30)}','late')`));
    await denied(asUser(db, id(2), `UPDATE sessions SET teacher_id='${id(21)}' WHERE id='${id(40)}'`));
    await asUser(db, id(2), `INSERT INTO sessions(id,org_id,teacher_id,course_id,starts_at) VALUES ('${id(43)}','${id(10)}','${id(20)}','${id(50)}',now())`);
    await asUser(db, id(2), `INSERT INTO student_feedback(org_id,student_id,teacher_id,session_id,title,body) VALUES ('${id(10)}','${id(30)}','${id(20)}','${id(40)}','Teacher note','Own student note')`);
    await denied(asUser(db, id(2), `INSERT INTO student_feedback(org_id,student_id,teacher_id,session_id,title,body) VALUES ('${id(10)}','${id(31)}','${id(21)}','${id(41)}','Bad note','Not assigned')`));
    await denied(asUser(db, id(2), `INSERT INTO courses(org_id,title,modality) VALUES ('${id(10)}','Unauthorized','group')`));
    assert.equal((await asUser(db, id(2), `DELETE FROM sessions WHERE id='${id(41)}' RETURNING id`)).rows.length, 0);
    await denied(asUser(db, id(2), `INSERT INTO students(org_id,name) VALUES ('${id(10)}','Unauthorized student')`));
    await denied(asUser(db, id(4), `INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(31)}','late')`));
    await denied(asUser(db, id(1), `INSERT INTO subscriptions(org_id,status) VALUES ('${id(10)}','active')`));
    await denied(asUser(db, id(2), `INSERT INTO audit_logs(org_id,actor_id,action,entity) VALUES ('${id(10)}','${id(1)}','fake','student')`));
    await denied(asUser(db, id(2), `UPDATE users SET org_id='${id(11)}' WHERE id='${id(2)}'`));
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
    for (const sql of badLinks) await denied(db.exec(sql), '23503');
    await denied(db.exec(`UPDATE students SET org_id='${id(11)}' WHERE id='${id(30)}'`));
    // Existing FK SET NULL/CASCADE delete behavior remains compatible.
    await db.exec(`DELETE FROM teachers WHERE id='${id(20)}'; DELETE FROM courses WHERE id='${id(50)}';`);
    assert.equal((await db.query(`SELECT * FROM sessions WHERE id='${id(40)}'`)).rows.length, 0);
  } finally { await db.close(); }
});

test('fresh schema preserves unrelated policies and migration aborts safely on existing bad links', async () => {
  const db = await PGlite.create();
  try {
    await db.exec(bootstrap);
    await db.exec(schema);
    await seed(db);
    assert.equal((await db.query("SELECT 1 FROM pg_policies WHERE tablename='unrelated'")).rows.length, 1);
    await db.exec('ALTER TABLE attendance DISABLE TRIGGER enforce_org_relations');
    await db.exec(`INSERT INTO attendance(org_id,session_id,student_id,status) VALUES ('${id(10)}','${id(40)}','${id(32)}','late')`);
    await db.exec('ALTER TABLE attendance ENABLE TRIGGER enforce_org_relations');
    await assert.rejects(db.exec(migration), /Cross-organization links found/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query(`SELECT * FROM attendance WHERE student_id='${id(32)}'`)).rows.length, 1);
    assert.equal((await db.query("SELECT 1 FROM pg_policies WHERE tablename='attendance' AND policyname='scoped_read'")).rows.length, 1);
  } finally { await db.close(); }
});
