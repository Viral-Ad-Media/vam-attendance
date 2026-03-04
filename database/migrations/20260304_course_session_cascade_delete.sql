-- Ensure sessions are deleted when parent course is deleted.
ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_course_id_fkey;
ALTER TABLE public.sessions
  ADD CONSTRAINT sessions_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES public.courses(id)
  ON DELETE CASCADE;
