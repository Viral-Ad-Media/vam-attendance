-- Neon PostgreSQL schema. Apply once with npm run db:migrate.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
END $$;
GRANT authenticated TO CURRENT_USER;
CREATE SCHEMA IF NOT EXISTS app_private;
CREATE OR REPLACE FUNCTION app_private.user_id() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id',true),'')::uuid;
$$;
GRANT USAGE ON SCHEMA app_private, public TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.user_id() TO authenticated;

CREATE TABLE IF NOT EXISTS auth_users (
 id uuid PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE,
 "emailVerified" boolean NOT NULL DEFAULT false, image text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 app_metadata jsonb NOT NULL DEFAULT '{}', user_metadata jsonb NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS auth_accounts (
 id uuid PRIMARY KEY, "accountId" text NOT NULL, "providerId" text NOT NULL,
 "userId" uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
 "accessToken" text, "refreshToken" text, "idToken" text,
 "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, scope text, password text,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 UNIQUE("providerId","accountId")
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 id uuid PRIMARY KEY, "expiresAt" timestamptz NOT NULL, token text NOT NULL UNIQUE,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now(),
 "ipAddress" text, "userAgent" text, "userId" uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS auth_accounts_user_idx ON auth_accounts("userId");
CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions("userId");
CREATE TABLE IF NOT EXISTS auth_verifications (
 id uuid PRIMARY KEY, identifier text NOT NULL, value text NOT NULL, "expiresAt" timestamptz NOT NULL,
 "createdAt" timestamptz NOT NULL DEFAULT now(), "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_verifications_identifier_idx ON auth_verifications(identifier);
-- Auth tables are server-only. The unprivileged data role cannot read credentials or sessions.
REVOKE ALL ON auth_users,auth_accounts,auth_sessions,auth_verifications FROM PUBLIC, authenticated;
-- Application tables and org-scoped RLS for VAM Attendance

-- 1) Core tables (create before functions that reference them)
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  stripe_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner','admin','teacher','student','viewer')),
  invited_by uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  invited_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  seat_number int,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE TABLE IF NOT EXISTS invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','teacher','student','viewer')),
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  invited_by uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'inactive',
  plan text NOT NULL DEFAULT 'free',
  seats int NOT NULL DEFAULT 1,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  stripe_subscription_id text,
  stripe_price_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  location text,
  bio text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  modality text NOT NULL CHECK (modality IN ('group','1on1')),
  lead_teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  course_type text,
  duration_weeks integer,
  sessions_per_week integer,
  max_students int,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  country text,
  program text,
  duration_weeks integer,
  sessions_per_week integer,
  class_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, email)
);

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  title text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  class_name text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Backfill columns for existing deployments
ALTER TABLE students ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE students ADD COLUMN IF NOT EXISTS country text;

-- Remove legacy teacher columns for existing deployments

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed','dropped')),
  enrolled_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, student_id, course_id)
);

CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('present','absent','late')),
  notes text,
  noted_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, session_id, student_id)
);

CREATE TABLE IF NOT EXISTS student_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES attendance(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  course_id uuid REFERENCES courses(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','progress','participation','behavior','homework','assessment')),
  sentiment text NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','needs_attention')),
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','shareable')),
  source text NOT NULL DEFAULT 'internal' CHECK (source IN ('internal','student')),
  title text NOT NULL,
  body text NOT NULL,
  reviewed_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES attendance(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES student_feedback(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  sent_to text NOT NULL,
  sent_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, attendance_id)
);

-- 2) Helper functions (after tables exist)
CREATE OR REPLACE FUNCTION public.app_has_org_role(check_org uuid, roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = check_org
        AND m.user_id = app_private.user_id()
        AND m.role = ANY(roles)
    )
    OR (
      'owner' = ANY(roles)
      AND EXISTS (
        SELECT 1 FROM organizations o
        WHERE o.id = check_org
          AND o.owner_id = app_private.user_id()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.app_is_org_member(check_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.org_id = check_org
        AND m.user_id = app_private.user_id()
    )
    OR EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = check_org
        AND o.owner_id = app_private.user_id()
    );
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_teachers_org_id ON teachers(org_id);
CREATE INDEX IF NOT EXISTS idx_students_org_id ON students(org_id);
CREATE INDEX IF NOT EXISTS idx_sessions_org_id ON sessions(org_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_id ON attendance(org_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org_user ON memberships(org_id, user_id);
CREATE INDEX IF NOT EXISTS idx_invites_org_email ON invites(org_id, email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org_id ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_courses_org_id ON courses(org_id);
CREATE INDEX IF NOT EXISTS idx_courses_lead_teacher ON courses(lead_teacher_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_org_student ON enrollments(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_org_course ON enrollments(org_id, course_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_org_student ON student_feedback(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_org_teacher ON student_feedback(org_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_attendance ON student_feedback(org_id, attendance_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_reviewed_at ON student_feedback(org_id, reviewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_org_student ON student_feedback_requests(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_token_hash ON student_feedback_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_expires_at ON student_feedback_requests(expires_at);

-- 4) Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback_requests ENABLE ROW LEVEL SECURITY;

-- Organization policies. Other tables receive scoped policies below.
CREATE POLICY "Organizations are org-scoped readable by members"
  ON organizations FOR SELECT USING (
    owner_id = app_private.user_id()
    OR EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = organizations.id AND m.user_id = app_private.user_id())
  );
CREATE POLICY "Organizations insert by owner" ON organizations FOR INSERT WITH CHECK (owner_id = app_private.user_id());
CREATE POLICY "Organizations update by owner" ON organizations FOR UPDATE USING (owner_id = app_private.user_id()) WITH CHECK (owner_id = app_private.user_id());
CREATE POLICY "Organizations delete by owner" ON organizations FOR DELETE USING (owner_id = app_private.user_id());

-- Updated timestamp triggers (fresh Neon installation).
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_memberships_updated_at BEFORE UPDATE ON memberships FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invites_updated_at BEFORE UPDATE ON invites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_feedback_updated_at BEFORE UPDATE ON student_feedback FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_feedback_requests_updated_at BEFORE UPDATE ON student_feedback_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Security hardening (fresh Neon installation).
-- Abort on existing cross-organization links; never delete or silently repair data.
BEGIN;

CREATE OR REPLACE FUNCTION public.app_teacher_owns(check_org uuid, check_teacher uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.app_has_org_role(check_org, ARRAY['teacher']) AND EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = check_teacher
      AND t.org_id = check_org AND t.user_id = app_private.user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.app_teacher_session(check_org uuid, check_session uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = check_session
    AND s.org_id = check_org AND public.app_teacher_owns(check_org, s.teacher_id));
$$;

CREATE OR REPLACE FUNCTION public.app_teacher_course(check_org uuid, check_course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = check_course AND c.org_id = check_org
    AND (public.app_teacher_owns(check_org, c.lead_teacher_id)
      OR EXISTS (SELECT 1 FROM public.sessions s WHERE s.course_id = c.id AND s.org_id = check_org
        AND public.app_teacher_owns(check_org, s.teacher_id))
      OR EXISTS (SELECT 1 FROM public.enrollments e WHERE e.course_id = c.id AND e.org_id = check_org
        AND public.app_teacher_owns(check_org, e.teacher_id))));
$$;

CREATE OR REPLACE FUNCTION public.app_teacher_student(check_org uuid, check_student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = check_student AND e.org_id = check_org
    AND (public.app_teacher_owns(check_org, e.teacher_id) OR public.app_teacher_course(check_org, e.course_id)))
    OR EXISTS (SELECT 1 FROM public.attendance a WHERE a.student_id = check_student AND a.org_id = check_org
      AND public.app_teacher_session(check_org, a.session_id));
$$;

CREATE OR REPLACE FUNCTION public.app_teacher_feedback(
  check_org uuid, check_student uuid, check_teacher uuid, check_course uuid, check_session uuid, check_attendance uuid
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.app_teacher_student(check_org, check_student)
    AND (check_teacher IS NULL OR public.app_teacher_owns(check_org, check_teacher))
    AND (check_course IS NULL OR public.app_teacher_course(check_org, check_course))
    AND (check_session IS NULL OR public.app_teacher_session(check_org, check_session))
    AND (check_attendance IS NULL OR EXISTS (
      SELECT 1 FROM public.attendance a WHERE a.id = check_attendance AND a.org_id = check_org
        AND a.student_id = check_student AND public.app_teacher_session(check_org, a.session_id)));
$$;

-- These SECURITY DEFINER functions only return access decisions for app_private.user_id().
REVOKE ALL ON FUNCTION public.app_teacher_owns(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_teacher_session(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_teacher_course(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_teacher_student(uuid,uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.app_teacher_feedback(uuid,uuid,uuid,uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_teacher_owns(uuid,uuid), public.app_teacher_session(uuid,uuid),
  public.app_teacher_course(uuid,uuid), public.app_teacher_student(uuid,uuid),
  public.app_teacher_feedback(uuid,uuid,uuid,uuid,uuid,uuid) TO authenticated;

-- Prevent moving a parent or profile into another tenant, including via direct REST.
-- Keep existing simple FKs so PostgREST embedded relationship names remain unchanged.
CREATE OR REPLACE FUNCTION public.app_validate_org_relations()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  row_data jsonb := to_jsonb(NEW);
  old_data jsonb;
  related_id uuid;
  related_org uuid;
  i integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_data := to_jsonb(OLD);
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN
      RAISE EXCEPTION 'Organization cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF TG_NARGS > 0 THEN
    FOR i IN 0..(TG_NARGS / 2 - 1) LOOP
      related_id := NULLIF(row_data->>TG_ARGV[i * 2], '')::uuid;
      -- Check only changed links on update, allowing existing FK SET NULL cascades.
      IF related_id IS NOT NULL AND (TG_OP = 'INSERT' OR
          row_data->TG_ARGV[i * 2] IS DISTINCT FROM old_data->TG_ARGV[i * 2]) THEN
        EXECUTE format('SELECT org_id FROM public.%I WHERE id = $1 FOR KEY SHARE', TG_ARGV[i * 2 + 1])
          INTO related_org USING related_id;
        IF related_org IS DISTINCT FROM NEW.org_id THEN
          RAISE EXCEPTION 'Related record must exist in the same organization' USING ERRCODE = '23503';
        END IF;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.app_validate_org_relations() FROM PUBLIC;

LOCK TABLE public.memberships, public.invites, public.subscriptions, public.audit_logs, public.users, public.teachers, public.students, public.courses, public.sessions, public.enrollments, public.attendance, public.student_feedback, public.student_feedback_requests IN SHARE ROW EXCLUSIVE MODE;

CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.teachers child JOIN public.users parent ON parent.id = child.user_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: teachers.user_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('user_id', 'users');
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.courses child JOIN public.teachers parent ON parent.id = child.lead_teacher_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: courses.lead_teacher_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('lead_teacher_id', 'teachers');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.sessions child JOIN public.courses parent ON parent.id = child.course_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: sessions.course_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.sessions child JOIN public.teachers parent ON parent.id = child.teacher_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: sessions.teacher_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('course_id', 'courses', 'teacher_id', 'teachers');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.enrollments child JOIN public.students parent ON parent.id = child.student_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: enrollments.student_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.enrollments child JOIN public.courses parent ON parent.id = child.course_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: enrollments.course_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.enrollments child JOIN public.teachers parent ON parent.id = child.teacher_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: enrollments.teacher_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('student_id', 'students', 'course_id', 'courses', 'teacher_id', 'teachers');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.attendance child JOIN public.sessions parent ON parent.id = child.session_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: attendance.session_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.attendance child JOIN public.students parent ON parent.id = child.student_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: attendance.student_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('session_id', 'sessions', 'student_id', 'students');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback child JOIN public.students parent ON parent.id = child.student_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback.student_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback child JOIN public.attendance parent ON parent.id = child.attendance_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback.attendance_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback child JOIN public.teachers parent ON parent.id = child.teacher_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback.teacher_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback child JOIN public.courses parent ON parent.id = child.course_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback.course_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback child JOIN public.sessions parent ON parent.id = child.session_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback.session_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.student_feedback
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('student_id', 'students', 'attendance_id', 'attendance', 'teacher_id', 'teachers', 'course_id', 'courses', 'session_id', 'sessions');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback_requests child JOIN public.attendance parent ON parent.id = child.attendance_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback_requests.attendance_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback_requests child JOIN public.students parent ON parent.id = child.student_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback_requests.student_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback_requests child JOIN public.sessions parent ON parent.id = child.session_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback_requests.session_id. Repair these before retrying.';
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.student_feedback_requests child JOIN public.student_feedback parent ON parent.id = child.feedback_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: student_feedback_requests.feedback_id. Repair these before retrying.';
  END IF;
END $$;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.student_feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('attendance_id', 'attendance', 'student_id', 'students', 'session_id', 'sessions', 'feedback_id', 'student_feedback');

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.memberships FOR SELECT TO authenticated USING (public.app_is_org_member(org_id));
CREATE POLICY scoped_insert ON public.memberships FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.memberships FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.memberships FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.invites FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_insert ON public.invites FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.invites FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.invites FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.subscriptions FOR SELECT TO authenticated USING (public.app_is_org_member(org_id));
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.audit_logs FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY member_audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.app_is_org_member(org_id) AND actor_id = app_private.user_id());
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.users FOR SELECT TO authenticated USING (id = app_private.user_id() OR public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY self_update ON public.users FOR UPDATE TO authenticated USING (id = app_private.user_id()) WITH CHECK (id = app_private.user_id());
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.teachers FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_owns(org_id, id));
CREATE POLICY scoped_insert ON public.teachers FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.teachers FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.teachers FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.students FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_student(org_id, id));
CREATE POLICY scoped_insert ON public.students FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.students FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.students FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.courses FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_course(org_id, id));
CREATE POLICY scoped_insert ON public.courses FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.courses FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.courses FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.sessions FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_owns(org_id, teacher_id));
CREATE POLICY scoped_insert ON public.sessions FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR (public.app_teacher_owns(org_id, teacher_id) AND (course_id IS NULL OR public.app_teacher_course(org_id, course_id))));
CREATE POLICY scoped_update ON public.sessions FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR (public.app_teacher_owns(org_id, teacher_id) AND (course_id IS NULL OR public.app_teacher_course(org_id, course_id)))) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR (public.app_teacher_owns(org_id, teacher_id) AND (course_id IS NULL OR public.app_teacher_course(org_id, course_id))));
CREATE POLICY scoped_delete ON public.sessions FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR (public.app_teacher_owns(org_id, teacher_id) AND (course_id IS NULL OR public.app_teacher_course(org_id, course_id))));
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.enrollments FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_owns(org_id, teacher_id) OR public.app_teacher_course(org_id, course_id));
CREATE POLICY scoped_insert ON public.enrollments FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.enrollments FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.enrollments FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.attendance FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_session(org_id, session_id));
CREATE POLICY scoped_insert ON public.attendance FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_session(org_id, session_id));
CREATE POLICY scoped_update ON public.attendance FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_session(org_id, session_id)) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_session(org_id, session_id));
CREATE POLICY scoped_delete ON public.attendance FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_session(org_id, session_id));
ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.student_feedback FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_feedback(org_id, student_id, teacher_id, course_id, session_id, attendance_id));
CREATE POLICY scoped_insert ON public.student_feedback FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_feedback(org_id, student_id, teacher_id, course_id, session_id, attendance_id));
CREATE POLICY scoped_update ON public.student_feedback FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_feedback(org_id, student_id, teacher_id, course_id, session_id, attendance_id)) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_feedback(org_id, student_id, teacher_id, course_id, session_id, attendance_id));
CREATE POLICY scoped_delete ON public.student_feedback FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']) OR public.app_teacher_feedback(org_id, student_id, teacher_id, course_id, session_id, attendance_id));
ALTER TABLE public.student_feedback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.student_feedback_requests FOR SELECT TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin','student','viewer']) OR public.app_teacher_session(org_id, session_id));
CREATE POLICY scoped_insert ON public.student_feedback_requests FOR INSERT TO authenticated WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_update ON public.student_feedback_requests FOR UPDATE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin'])) WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY scoped_delete ON public.student_feedback_requests FOR DELETE TO authenticated USING (public.app_has_org_role(org_id, ARRAY['owner','admin']));

COMMIT;

GRANT SELECT,INSERT,UPDATE,DELETE ON organizations,memberships,invites,subscriptions,audit_logs,users,teachers,students,courses,sessions,enrollments,attendance,student_feedback,student_feedback_requests TO authenticated;
CREATE POLICY self_profile_insert ON public.users FOR INSERT TO authenticated
 WITH CHECK (id = app_private.user_id() AND public.app_is_org_member(org_id));
