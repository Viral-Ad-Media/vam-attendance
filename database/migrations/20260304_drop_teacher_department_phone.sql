-- Drop unused teacher fields
ALTER TABLE public.teachers DROP COLUMN IF EXISTS department;
ALTER TABLE public.teachers DROP COLUMN IF EXISTS phone;
