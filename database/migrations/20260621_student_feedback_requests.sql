ALTER TABLE public.student_feedback
  ADD COLUMN IF NOT EXISTS attendance_id uuid REFERENCES public.attendance(id) ON DELETE SET NULL;

ALTER TABLE public.student_feedback
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'internal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_feedback_source_check'
      AND conrelid = 'public.student_feedback'::regclass
  ) THEN
    ALTER TABLE public.student_feedback
      ADD CONSTRAINT student_feedback_source_check
      CHECK (source IN ('internal','student'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.student_feedback_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  attendance_id uuid NOT NULL REFERENCES public.attendance(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  feedback_id uuid REFERENCES public.student_feedback(id) ON DELETE SET NULL,
  token_hash text NOT NULL UNIQUE,
  sent_to text NOT NULL,
  sent_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, attendance_id)
);

CREATE INDEX IF NOT EXISTS idx_student_feedback_attendance ON public.student_feedback(org_id, attendance_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_org_student ON public.student_feedback_requests(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_token_hash ON public.student_feedback_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_student_feedback_requests_expires_at ON public.student_feedback_requests(expires_at);

ALTER TABLE public.student_feedback_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student feedback requests readable by org members" ON public.student_feedback_requests;
DROP POLICY IF EXISTS "Student feedback requests insert by admins or teachers" ON public.student_feedback_requests;
DROP POLICY IF EXISTS "Student feedback requests update by admins or teachers" ON public.student_feedback_requests;
DROP POLICY IF EXISTS "Student feedback requests delete by admins or teachers" ON public.student_feedback_requests;

CREATE POLICY "Student feedback requests readable by org members"
  ON public.student_feedback_requests FOR SELECT USING (public.app_is_org_member(org_id));
CREATE POLICY "Student feedback requests insert by admins or teachers"
  ON public.student_feedback_requests FOR INSERT WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));
CREATE POLICY "Student feedback requests update by admins or teachers"
  ON public.student_feedback_requests FOR UPDATE USING (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']))
  WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));
CREATE POLICY "Student feedback requests delete by admins or teachers"
  ON public.student_feedback_requests FOR DELETE USING (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));

DROP TRIGGER IF EXISTS update_student_feedback_requests_updated_at ON public.student_feedback_requests;
CREATE TRIGGER update_student_feedback_requests_updated_at
  BEFORE UPDATE ON public.student_feedback_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
