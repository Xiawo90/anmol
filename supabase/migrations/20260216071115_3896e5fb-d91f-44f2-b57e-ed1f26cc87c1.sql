
-- Teacher Salaries table
CREATE TABLE public.teacher_salaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  monthly_salary NUMERIC NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_salaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage school teacher salaries" ON public.teacher_salaries
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all teacher salaries" ON public.teacher_salaries
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Teachers view own salary" ON public.teacher_salaries
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE TRIGGER update_teacher_salaries_updated_at
  BEFORE UPDATE ON public.teacher_salaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Teacher Attendance table
CREATE TABLE public.teacher_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('absent', 'casual_leave', 'earned_leave')),
  reason TEXT,
  approved_by UUID,
  is_deductible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, date)
);

ALTER TABLE public.teacher_attendance ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_teacher_attendance_teacher_date ON public.teacher_attendance(teacher_id, date);

CREATE POLICY "Admin manage school teacher attendance" ON public.teacher_attendance
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all teacher attendance" ON public.teacher_attendance
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Teachers view own attendance" ON public.teacher_attendance
  FOR SELECT USING (auth.uid() = teacher_id);

-- School Attendance Settings table
CREATE TABLE public.school_attendance_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id),
  max_yearly_absences INTEGER NOT NULL DEFAULT 7,
  salary_calculation_type TEXT NOT NULL DEFAULT 'calendar_days' CHECK (salary_calculation_type IN ('calendar_days', 'working_days')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.school_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage school attendance settings" ON public.school_attendance_settings
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all attendance settings" ON public.school_attendance_settings
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Teachers view own school settings" ON public.school_attendance_settings
  FOR SELECT USING (school_id = get_user_school_id(auth.uid()));

CREATE TRIGGER update_school_attendance_settings_updated_at
  BEFORE UPDATE ON public.school_attendance_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Teacher Payroll table
CREATE TABLE public.teacher_payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  monthly_salary NUMERIC NOT NULL,
  total_days_in_month INTEGER NOT NULL,
  deductible_absences INTEGER NOT NULL DEFAULT 0,
  per_day_salary NUMERIC NOT NULL,
  total_deduction NUMERIC NOT NULL DEFAULT 0,
  final_salary NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  paid_date DATE,
  remarks TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, month, year)
);

ALTER TABLE public.teacher_payroll ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_teacher_payroll_teacher_month_year ON public.teacher_payroll(teacher_id, month, year);

CREATE POLICY "Admin manage school teacher payroll" ON public.teacher_payroll
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all teacher payroll" ON public.teacher_payroll
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Teachers view own payroll" ON public.teacher_payroll
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE TRIGGER update_teacher_payroll_updated_at
  BEFORE UPDATE ON public.teacher_payroll
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
