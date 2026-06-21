CREATE TABLE IF NOT EXISTS public.student_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES public.teachers(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  rating int CHECK (rating BETWEEN 1 AND 5),
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','progress','participation','behavior','homework','assessment')),
  sentiment text NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive','neutral','needs_attention')),
  visibility text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal','shareable')),
  title text NOT NULL,
  body text NOT NULL,
  reviewed_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_feedback_org_student ON public.student_feedback(org_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_org_teacher ON public.student_feedback(org_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_feedback_reviewed_at ON public.student_feedback(org_id, reviewed_at DESC);

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Student feedback readable by org members" ON public.student_feedback;
DROP POLICY IF EXISTS "Student feedback insert by admins or teachers" ON public.student_feedback;
DROP POLICY IF EXISTS "Student feedback update by admins or teachers" ON public.student_feedback;
DROP POLICY IF EXISTS "Student feedback delete by admins or teachers" ON public.student_feedback;

CREATE POLICY "Student feedback readable by org members"
  ON public.student_feedback FOR SELECT USING (public.app_is_org_member(org_id));
CREATE POLICY "Student feedback insert by admins or teachers"
  ON public.student_feedback FOR INSERT WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));
CREATE POLICY "Student feedback update by admins or teachers"
  ON public.student_feedback FOR UPDATE USING (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']))
  WITH CHECK (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));
CREATE POLICY "Student feedback delete by admins or teachers"
  ON public.student_feedback FOR DELETE USING (public.app_has_org_role(org_id, ARRAY['owner','admin','teacher']));

DROP TRIGGER IF EXISTS update_student_feedback_updated_at ON public.student_feedback;
CREATE TRIGGER update_student_feedback_updated_at
  BEFORE UPDATE ON public.student_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
