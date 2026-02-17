-- Update role check constraint to include admindirector
ALTER TABLE public.user_roles DROP CONSTRAINT user_roles_role_check;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_role_check CHECK (role = ANY (ARRAY['systemadmin'::text, 'admin'::text, 'admindirector'::text, 'teacher'::text, 'student'::text, 'parent'::text]));

-- Allow admindirector to view all schools (they already can via existing SELECT policy)
-- Allow admindirector to view all fee records across schools
CREATE POLICY "Admindirector can view all fee records"
ON public.fee_records
FOR SELECT
USING (get_user_role(auth.uid()) = 'admindirector'::text);

-- Allow admindirector to view all fee receipts
CREATE POLICY "Admindirector can view all receipts"
ON public.fee_payment_receipts
FOR SELECT
USING (get_user_role(auth.uid()) = 'admindirector'::text);

-- Allow admindirector to view all student enrollments
CREATE POLICY "Admindirector can view all enrollments"
ON public.student_enrollments
FOR SELECT
USING (get_user_role(auth.uid()) = 'admindirector'::text);

-- Allow admindirector to view activity logs
CREATE POLICY "Admindirector can view all activity logs"
ON public.activity_logs
FOR SELECT
USING (get_user_role(auth.uid()) = 'admindirector'::text);