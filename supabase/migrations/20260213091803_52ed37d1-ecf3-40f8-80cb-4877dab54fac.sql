
-- Update RLS policies to scope admin data by school_id
-- Admins should only see data belonging to their school

-- CLASSES: Replace admin ALL policy
DROP POLICY IF EXISTS "Admins can manage classes" ON public.classes;
CREATE POLICY "Admins can manage own school classes"
ON public.classes FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin' 
  AND school_id = get_user_school_id(auth.uid())
);

-- SECTIONS: Replace admin ALL policy
DROP POLICY IF EXISTS "Admins can manage sections" ON public.sections;
CREATE POLICY "Admins can manage own school sections"
ON public.sections FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- SUBJECTS: Replace admin ALL policy
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage own school subjects"
ON public.subjects FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- STUDENT ENROLLMENTS
DROP POLICY IF EXISTS "Admins can manage student enrollments" ON public.student_enrollments;
CREATE POLICY "Admins can manage own school enrollments"
ON public.student_enrollments FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- TEACHER ASSIGNMENTS
DROP POLICY IF EXISTS "Admins can manage teacher assignments" ON public.teacher_assignments;
CREATE POLICY "Admins can manage own school teacher assignments"
ON public.teacher_assignments FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- ATTENDANCE
DROP POLICY IF EXISTS "Teachers and admins can manage attendance" ON public.attendance;
CREATE POLICY "Teachers and admins can manage attendance"
ON public.attendance FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- HOMEWORK
DROP POLICY IF EXISTS "Teachers and admins can manage homework" ON public.homework;
CREATE POLICY "Teachers and admins can manage homework"
ON public.homework FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- EXAMS
DROP POLICY IF EXISTS "Teachers and admins can manage exams" ON public.exams;
CREATE POLICY "Teachers and admins can manage exams"
ON public.exams FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- EXAM RESULTS
DROP POLICY IF EXISTS "Teachers and admins can manage results" ON public.exam_results;
CREATE POLICY "Teachers and admins can manage results"
ON public.exam_results FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- FEE RECORDS
DROP POLICY IF EXISTS "Admins can manage fee records" ON public.fee_records;
CREATE POLICY "Admins can manage own school fee records"
ON public.fee_records FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- FEE PAYMENT RECEIPTS
DROP POLICY IF EXISTS "Admins can manage receipts" ON public.fee_payment_receipts;
CREATE POLICY "Admins can manage own school receipts"
ON public.fee_payment_receipts FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- STUDY MATERIALS
DROP POLICY IF EXISTS "Teachers and admins can manage materials" ON public.study_materials;
CREATE POLICY "Teachers and admins can manage materials"
ON public.study_materials FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- TIMETABLE
DROP POLICY IF EXISTS "Admins can manage timetable" ON public.timetable;
CREATE POLICY "Admins can manage own school timetable"
ON public.timetable FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- ANNOUNCEMENTS
DROP POLICY IF EXISTS "Admins and teachers can manage announcements" ON public.announcements;
CREATE POLICY "Admins and teachers can manage announcements"
ON public.announcements FOR ALL
USING (
  (get_user_role(auth.uid()) = 'teacher')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- EVENTS
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;
CREATE POLICY "Admins can manage own school events"
ON public.events FOR ALL
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);

-- ACTIVITY LOGS: scope admin view to own school
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.activity_logs;
CREATE POLICY "Admins can view own school activity logs"
ON public.activity_logs FOR SELECT
USING (
  (get_user_role(auth.uid()) = 'systemadmin')
  OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()))
);

-- PARENT STUDENTS
DROP POLICY IF EXISTS "Admins can manage parent students" ON public.parent_students;
CREATE POLICY "Admins can manage parent students"
ON public.parent_students FOR ALL
USING (get_user_role(auth.uid()) = 'admin');

-- PROFILES: Add policy so admins only update own-school profiles
-- Keep existing SELECT (viewable by all authenticated) and self-update policies
-- Add admin management scoped by school
CREATE POLICY "Admins can update own school profiles"
ON public.profiles FOR UPDATE
USING (
  get_user_role(auth.uid()) = 'admin'
  AND school_id = get_user_school_id(auth.uid())
);
