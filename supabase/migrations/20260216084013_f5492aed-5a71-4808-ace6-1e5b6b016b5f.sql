
-- =============================================
-- HR & PAYROLL MODULE - NEW TABLES
-- =============================================

-- 1. Teacher Security Deposits
CREATE TABLE public.teacher_security_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  base_salary NUMERIC NOT NULL,
  deposit_percentage NUMERIC NOT NULL DEFAULT 20,
  total_deposit NUMERIC NOT NULL,
  collected_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, school_id),
  CONSTRAINT teacher_security_deposits_status_check CHECK (status IN ('active', 'completed'))
);

ALTER TABLE public.teacher_security_deposits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage school security deposits" ON public.teacher_security_deposits
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all security deposits" ON public.teacher_security_deposits
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Accountant view school security deposits" ON public.teacher_security_deposits
  FOR SELECT USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

CREATE INDEX idx_security_deposits_teacher ON public.teacher_security_deposits(teacher_id);
CREATE INDEX idx_security_deposits_school ON public.teacher_security_deposits(school_id);

-- 2. Teacher Advances
CREATE TABLE public.teacher_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  amount NUMERIC NOT NULL,
  deduction_month TEXT NOT NULL,
  deduction_year INTEGER NOT NULL,
  deducted_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_balance NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_advances_status_check CHECK (status IN ('pending', 'approved', 'deducted', 'carried_forward'))
);

ALTER TABLE public.teacher_advances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage school advances" ON public.teacher_advances
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all advances" ON public.teacher_advances
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Accountant view school advances" ON public.teacher_advances
  FOR SELECT USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

CREATE INDEX idx_advances_teacher ON public.teacher_advances(teacher_id);
CREATE INDEX idx_advances_school ON public.teacher_advances(school_id);

-- 3. Teacher Loans
CREATE TABLE public.teacher_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  total_loan_amount NUMERIC NOT NULL,
  remaining_balance NUMERIC NOT NULL,
  installment_amount NUMERIC NOT NULL,
  start_month TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  approved_by UUID,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT teacher_loans_status_check CHECK (status IN ('active', 'completed'))
);

ALTER TABLE public.teacher_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage school loans" ON public.teacher_loans
  FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Admindirector view all loans" ON public.teacher_loans
  FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

CREATE POLICY "Accountant view school loans" ON public.teacher_loans
  FOR SELECT USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

CREATE INDEX idx_loans_teacher ON public.teacher_loans(teacher_id);
CREATE INDEX idx_loans_school ON public.teacher_loans(school_id);

-- 4. Add new deduction columns to teacher_payroll
ALTER TABLE public.teacher_payroll
  ADD COLUMN IF NOT EXISTS security_deposit_deduction NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_deduction NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loan_deduction NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gross_salary NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_salary NUMERIC NOT NULL DEFAULT 0;

-- 5. Add accountant RLS policies to existing payroll table
CREATE POLICY "Accountant view school payroll" ON public.teacher_payroll
  FOR SELECT USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

CREATE POLICY "Accountant mark payroll paid" ON public.teacher_payroll
  FOR UPDATE USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

-- 6. Add accountant view policies to existing tables
CREATE POLICY "Accountant view school salaries" ON public.teacher_salaries
  FOR SELECT USING (get_user_role(auth.uid()) = 'accountant' AND school_id = get_user_school_id(auth.uid()));

-- 7. Update triggers for new tables
CREATE TRIGGER update_teacher_security_deposits_updated_at
  BEFORE UPDATE ON public.teacher_security_deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_advances_updated_at
  BEFORE UPDATE ON public.teacher_advances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teacher_loans_updated_at
  BEFORE UPDATE ON public.teacher_loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
