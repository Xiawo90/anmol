-- ============================================================
-- FULL DATABASE EXPORT - APSS School Management System
-- Generated: 2026-02-14
-- ============================================================
-- IMPORTANT: Run this in a fresh Supabase project's SQL Editor
-- This includes: Tables, Functions, Triggers, RLS Policies, 
-- Storage Buckets, and Data
-- ============================================================

-- ============================================================
-- PART 1: FUNCTIONS (needed before tables/policies)
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- PART 2: TABLES
-- ============================================================

-- Schools table
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

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role = ANY (ARRAY['systemadmin'::text, 'admin'::text, 'admindirector'::text, 'teacher'::text, 'student'::text, 'parent'::text])),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  grade_level INTEGER,
  created_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sections table
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  description TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Teacher assignments
CREATE TABLE public.teacher_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Student enrollments
CREATE TABLE public.student_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  roll_number TEXT,
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Parent-student relationships
CREATE TABLE public.parent_students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'parent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'leave')),
  marked_by UUID REFERENCES auth.users(id),
  remarks TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homework
CREATE TABLE public.homework (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deadline TIMESTAMPTZ NOT NULL,
  allow_late_submission BOOLEAN NOT NULL DEFAULT false,
  allow_resubmission BOOLEAN NOT NULL DEFAULT false,
  allowed_file_types TEXT[] DEFAULT '{}',
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Homework submissions
CREATE TABLE public.homework_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.homework(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  file_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'late', 'reviewed')),
  submitted_at TIMESTAMPTZ,
  teacher_remarks TEXT,
  grade TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Study materials
CREATE TABLE public.study_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exams
CREATE TABLE public.exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  exam_date DATE,
  total_marks INTEGER NOT NULL DEFAULT 100,
  created_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exam results
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marks_obtained NUMERIC,
  grade TEXT,
  remarks TEXT,
  entered_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fee records
CREATE TABLE public.fee_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  year INTEGER NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'unpaid', 'partial')),
  due_date DATE,
  paid_date DATE,
  receipt_number TEXT,
  remarks TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fee payment receipts
CREATE TABLE public.fee_payment_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fee_record_id UUID REFERENCES public.fee_records(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_remarks TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Announcements
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  target_role TEXT,
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  is_emergency BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Messages
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'general',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  target_class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  is_holiday BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Timetable
CREATE TABLE public.timetable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES auth.users(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity logs
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  school_id UUID REFERENCES public.schools(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System settings
CREATE TABLE public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI chat history
CREATE TABLE public.ai_chat_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PART 3: INDEXES
-- ============================================================

CREATE INDEX idx_profiles_school_id ON public.profiles(school_id);
CREATE INDEX idx_classes_school_id ON public.classes(school_id);
CREATE INDEX idx_student_enrollments_school_id ON public.student_enrollments(school_id);
CREATE INDEX idx_attendance_school_id ON public.attendance(school_id);
CREATE INDEX idx_homework_school_id ON public.homework(school_id);

-- ============================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role(uid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.user_roles WHERE user_id = uid LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_school_id(uid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM public.profiles WHERE user_id = uid LIMIT 1;
$$;

-- ============================================================
-- PART 6: RLS POLICIES
-- ============================================================

-- Schools
CREATE POLICY "Systemadmins can manage schools" ON public.schools FOR ALL USING (get_user_role(auth.uid()) = 'systemadmin');
CREATE POLICY "Schools viewable by authenticated" ON public.schools FOR SELECT USING (true);

-- Profiles
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can update own school profiles" ON public.profiles FOR UPDATE USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- User roles
CREATE POLICY "Roles are viewable by authenticated users" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert own role" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Classes
CREATE POLICY "Classes are viewable by authenticated users" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school classes" ON public.classes FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Sections
CREATE POLICY "Sections are viewable by authenticated users" ON public.sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school sections" ON public.sections FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Subjects
CREATE POLICY "Subjects are viewable by authenticated users" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school subjects" ON public.subjects FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Teacher assignments
CREATE POLICY "Teacher assignments are viewable by authenticated" ON public.teacher_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school teacher assignments" ON public.teacher_assignments FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Student enrollments
CREATE POLICY "Student enrollments are viewable by authenticated" ON public.student_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school enrollments" ON public.student_enrollments FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Admindirector can view all enrollments" ON public.student_enrollments FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

-- Parent students
CREATE POLICY "Parent students viewable by authenticated" ON public.parent_students FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage parent students" ON public.parent_students FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- Attendance
CREATE POLICY "Attendance viewable by authenticated" ON public.attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage attendance" ON public.attendance FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Homework
CREATE POLICY "Homework viewable by authenticated" ON public.homework FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage homework" ON public.homework FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Homework submissions
CREATE POLICY "Submissions viewable by authenticated" ON public.homework_submissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can insert own submissions" ON public.homework_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Students can update own submissions" ON public.homework_submissions FOR UPDATE TO authenticated USING (auth.uid() = student_id OR get_user_role(auth.uid()) IN ('admin', 'teacher'));

-- Study materials
CREATE POLICY "Study materials viewable by authenticated" ON public.study_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage materials" ON public.study_materials FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Exams
CREATE POLICY "Exams viewable by authenticated" ON public.exams FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage exams" ON public.exams FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Exam results
CREATE POLICY "Results viewable by authenticated" ON public.exam_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can manage results" ON public.exam_results FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Fee records
CREATE POLICY "Students can view own fee records" ON public.fee_records FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Parents can view children fee records" ON public.fee_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.parent_students WHERE parent_students.parent_id = auth.uid() AND parent_students.student_id = fee_records.student_id));
CREATE POLICY "Admins can manage own school fee records" ON public.fee_records FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Admindirector can view all fee records" ON public.fee_records FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

-- Fee payment receipts
CREATE POLICY "Receipts viewable by authenticated" ON public.fee_payment_receipts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert receipts" ON public.fee_payment_receipts FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Admins can manage own school receipts" ON public.fee_payment_receipts FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));
CREATE POLICY "Admindirector can view all receipts" ON public.fee_payment_receipts FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');

-- Announcements
CREATE POLICY "Announcements viewable by authenticated" ON public.announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and teachers can manage announcements" ON public.announcements FOR ALL USING ((get_user_role(auth.uid()) = 'teacher') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));

-- Notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view own messages" ON public.messages FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);

-- Events
CREATE POLICY "Events viewable by authenticated" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school events" ON public.events FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Timetable
CREATE POLICY "Timetable viewable by authenticated" ON public.timetable FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage own school timetable" ON public.timetable FOR ALL USING (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid()));

-- Activity logs
CREATE POLICY "Admins can view own school activity logs" ON public.activity_logs FOR SELECT USING ((get_user_role(auth.uid()) = 'systemadmin') OR (get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())));
CREATE POLICY "Admindirector can view all activity logs" ON public.activity_logs FOR SELECT USING (get_user_role(auth.uid()) = 'admindirector');
CREATE POLICY "Authenticated users can insert logs" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- System settings
CREATE POLICY "Settings viewable by authenticated" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.system_settings FOR ALL USING (get_user_role(auth.uid()) = 'admin');

-- AI chat history
CREATE POLICY "Users can view own chat history" ON public.ai_chat_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat history" ON public.ai_chat_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat history" ON public.ai_chat_history FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat history" ON public.ai_chat_history FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- PART 7: TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON public.classes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_updated_at BEFORE UPDATE ON public.homework FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_homework_submissions_updated_at BEFORE UPDATE ON public.homework_submissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fee_records_updated_at BEFORE UPDATE ON public.fee_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ai_chat_updated_at BEFORE UPDATE ON public.ai_chat_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART 8: REALTIME
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- PART 9: STORAGE BUCKETS
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('homework-files', 'homework-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('submission-files', 'submission-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('receipt-files', 'receipt-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('study-materials', 'study-materials', true);

-- Storage policies
CREATE POLICY "Anyone can view homework files" ON storage.objects FOR SELECT USING (bucket_id = 'homework-files');
CREATE POLICY "Teachers and admins can upload homework files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'homework-files' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers and admins can update homework files" ON storage.objects FOR UPDATE USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');
CREATE POLICY "Teachers and admins can delete homework files" ON storage.objects FOR DELETE USING (bucket_id = 'homework-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view submission files" ON storage.objects FOR SELECT USING (bucket_id = 'submission-files');
CREATE POLICY "Authenticated users can upload submissions" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'submission-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update submissions" ON storage.objects FOR UPDATE USING (bucket_id = 'submission-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete submissions" ON storage.objects FOR DELETE USING (bucket_id = 'submission-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view receipt files" ON storage.objects FOR SELECT USING (bucket_id = 'receipt-files');
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update receipts" ON storage.objects FOR UPDATE USING (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete receipts" ON storage.objects FOR DELETE USING (bucket_id = 'receipt-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view study materials" ON storage.objects FOR SELECT USING (bucket_id = 'study-materials');
CREATE POLICY "Authenticated users can upload study materials" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'study-materials' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update study materials" ON storage.objects FOR UPDATE USING (bucket_id = 'study-materials' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete study materials" ON storage.objects FOR DELETE USING (bucket_id = 'study-materials' AND auth.role() = 'authenticated');

-- ============================================================
-- PART 10: DATA (Schools)
-- ============================================================

INSERT INTO public.schools (id, name, address, created_at, updated_at) VALUES
('3536aad7-4d47-4514-bec3-ba6e86dd7d61', 'Anmol Abdullah Campus', 'Nisar Colony', '2026-02-14 09:04:58.469244+00', '2026-02-14 09:04:58.469244+00');

-- ============================================================
-- NOTE: User accounts (profiles, user_roles) are tied to auth.users
-- which cannot be exported via SQL. You must recreate users via
-- the Supabase Auth dashboard or the create-user edge function,
-- then their profiles will be auto-created by the trigger.
--
-- Current users in the system:
-- 1. anmol@gmail.com - System Admin (systemadmin) - no school
-- 2. apss-school@gmail.com - System Admin (systemadmin) - no school
-- 3. apssschool@gmail.com - System Admin (systemadmin) - no school
-- 4. director@test.com - Admin Director (admindirector) - no school
-- 5. testdirector2@test.com - Admin Director (admindirector) - no school
-- 6. sirasif@gmail.com - Admin Director (admindirector) - no school
-- 7. amir@gmail.com - Admin (admin) - Anmol Abdullah Campus
--
-- All other tables (classes, sections, subjects, etc.) are currently empty.
-- ============================================================
