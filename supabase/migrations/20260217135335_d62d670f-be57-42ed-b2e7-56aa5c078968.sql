
-- Add teacher_code column to profiles table
ALTER TABLE public.profiles ADD COLUMN teacher_code text;

-- Create unique index on teacher_code (only for non-null values)
CREATE UNIQUE INDEX idx_profiles_teacher_code ON public.profiles (teacher_code) WHERE teacher_code IS NOT NULL;
