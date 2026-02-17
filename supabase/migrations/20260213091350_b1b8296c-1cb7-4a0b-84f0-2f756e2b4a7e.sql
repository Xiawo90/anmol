
-- Create schools table
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Systemadmins can manage all schools
CREATE POLICY "Systemadmins can manage schools"
ON public.schools FOR ALL
USING (get_user_role(auth.uid()) = 'systemadmin');

-- Schools viewable by authenticated users
CREATE POLICY "Schools viewable by authenticated"
ON public.schools FOR SELECT
USING (true);

-- Add school_id to profiles
ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.schools(id);

-- Add school_id to key tables
ALTER TABLE public.classes ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.subjects ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.sections ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.student_enrollments ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.teacher_assignments ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.attendance ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.homework ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.homework_submissions ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.exams ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.exam_results ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.fee_records ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.fee_payment_receipts ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.study_materials ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.timetable ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.announcements ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.events ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.messages ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.notifications ADD COLUMN school_id UUID REFERENCES public.schools(id);
ALTER TABLE public.activity_logs ADD COLUMN school_id UUID REFERENCES public.schools(id);

-- Create helper function to get user's school_id
CREATE OR REPLACE FUNCTION public.get_user_school_id(uid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = uid LIMIT 1;
$$;

-- Update updated_at trigger for schools
CREATE TRIGGER update_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for school_id on frequently queried tables
CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_student_enrollments_school_id ON public.student_enrollments(school_id);
CREATE INDEX idx_attendance_school_id ON public.attendance(school_id);
CREATE INDEX idx_homework_school_id ON public.homework(school_id);
