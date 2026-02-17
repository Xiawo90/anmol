
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Fee records viewable by authenticated" ON public.fee_records;

-- Students can view their own fee records
CREATE POLICY "Students can view own fee records"
ON public.fee_records
FOR SELECT
USING (auth.uid() = student_id);

-- Parents can view their children's fee records
CREATE POLICY "Parents can view children fee records"
ON public.fee_records
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.parent_students
    WHERE parent_students.parent_id = auth.uid()
      AND parent_students.student_id = fee_records.student_id
  )
);

-- Admins can view own school fee records (already covered by ALL policy, but adding explicit SELECT)
-- Admindirector already has a SELECT policy
