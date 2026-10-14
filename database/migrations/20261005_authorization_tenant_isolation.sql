-- Apply after schema.sql on existing deployments. Transactional and repeatable.
-- Abort on existing cross-organization links; never delete or silently repair data.
BEGIN;

CREATE OR REPLACE FUNCTION public.app_teacher_owns(check_org uuid, check_teacher uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.app_has_org_role(check_org, ARRAY['teacher']) AND EXISTS (
    SELECT 1 FROM public.teachers t WHERE t.id = check_teacher
      AND t.org_id = check_org AND t.user_id = auth.uid()
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

-- These SECURITY DEFINER functions only return access decisions for auth.uid().
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

DROP TRIGGER IF EXISTS enforce_org_relations ON public.memberships;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DROP TRIGGER IF EXISTS enforce_org_relations ON public.invites;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DROP TRIGGER IF EXISTS enforce_org_relations ON public.subscriptions;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DROP TRIGGER IF EXISTS enforce_org_relations ON public.audit_logs;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DROP TRIGGER IF EXISTS enforce_org_relations ON public.users;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.teachers child JOIN public.users parent ON parent.id = child.user_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: teachers.user_id. Repair these before retrying.';
  END IF;
END $$;
DROP TRIGGER IF EXISTS enforce_org_relations ON public.teachers;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.teachers
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('user_id', 'users');
DROP TRIGGER IF EXISTS enforce_org_relations ON public.students;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations();
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.courses child JOIN public.teachers parent ON parent.id = child.lead_teacher_id
    WHERE child.org_id <> parent.org_id) THEN
    RAISE EXCEPTION 'Cross-organization links found: courses.lead_teacher_id. Repair these before retrying.';
  END IF;
END $$;
DROP TRIGGER IF EXISTS enforce_org_relations ON public.courses;
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
DROP TRIGGER IF EXISTS enforce_org_relations ON public.sessions;
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
DROP TRIGGER IF EXISTS enforce_org_relations ON public.enrollments;
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
DROP TRIGGER IF EXISTS enforce_org_relations ON public.attendance;
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
DROP TRIGGER IF EXISTS enforce_org_relations ON public.student_feedback;
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
DROP TRIGGER IF EXISTS enforce_org_relations ON public.student_feedback_requests;
CREATE TRIGGER enforce_org_relations BEFORE INSERT OR UPDATE ON public.student_feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.app_validate_org_relations('attendance_id', 'attendance', 'student_id', 'students', 'session_id', 'sessions', 'feedback_id', 'student_feedback');

DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(ARRAY['memberships','invites','subscriptions','audit_logs','users','teachers','students','courses','sessions','enrollments','attendance','student_feedback','student_feedback_requests']) LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;
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
CREATE POLICY member_audit_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (public.app_is_org_member(org_id) AND actor_id = auth.uid());
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_read ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR public.app_has_org_role(org_id, ARRAY['owner','admin']));
CREATE POLICY self_update ON public.users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
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
