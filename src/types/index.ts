export type AppRole = 'systemadmin' | 'admin' | 'admindirector' | 'teacher' | 'student' | 'parent' | 'accountant';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | string;
export type AttendanceStatus = 'present' | 'absent' | 'leave' | string;
export type SubmissionStatus = 'pending' | 'submitted' | 'late' | 'reviewed' | string;
export type FeeStatus = 'paid' | 'unpaid' | 'partial' | string;

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  approval_status: ApprovalStatus;
  is_active: boolean;
  school_id?: string;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  grade_level?: number;
  created_by?: string;
  school_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Section {
  id: string;
  name: string;
  class_id: string;
  school_id?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  description?: string;
  school_id?: string;
  created_at: string;
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  school_id?: string;
  created_at: string;
  classes?: Class;
  subjects?: Subject;
  sections?: Section;
  profiles?: Profile;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  section_id?: string;
  roll_number?: string;
  academic_year: string;
  school_id?: string;
  created_at: string;
  classes?: Class;
  sections?: Section;
  profiles?: Profile;
}

export interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by?: string;
  remarks?: string;
  created_at: string;
  profiles?: Profile;
}

export interface Homework {
  id: string;
  title: string;
  description?: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  teacher_id: string;
  deadline: string;
  allow_late_submission: boolean;
  allow_resubmission: boolean;
  allowed_file_types: string[];
  created_at: string;
  updated_at: string;
  classes?: Class;
  subjects?: Subject;
  sections?: Section;
  profiles?: Profile;
}

export interface HomeworkSubmission {
  id: string;
  homework_id: string;
  student_id: string;
  content?: string;
  file_urls?: string[];
  status: SubmissionStatus;
  submitted_at?: string;
  teacher_remarks?: string;
  grade?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
  homework?: Homework;
  profiles?: Profile;
}

export interface StudyMaterial {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type?: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  uploaded_by: string;
  created_at: string;
  classes?: Class;
  subjects?: Subject;
  profiles?: Profile;
}

export interface Exam {
  id: string;
  name: string;
  class_id: string;
  subject_id: string;
  exam_date?: string;
  total_marks: number;
  created_by?: string;
  created_at: string;
  classes?: Class;
  subjects?: Subject;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  student_id: string;
  marks_obtained?: number;
  grade?: string;
  remarks?: string;
  entered_by?: string;
  created_at: string;
  exams?: Exam;
  profiles?: Profile;
}

export interface FeeRecord {
  id: string;
  student_id: string;
  month: string;
  year: number;
  amount: number;
  status: FeeStatus;
  due_date?: string;
  paid_date?: string;
  receipt_number?: string;
  remarks?: string;
  invoice_url?: string;
  invoice_file_name?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  target_role?: AppRole;
  target_class_id?: string;
  is_emergency: boolean;
  created_by: string;
  expires_at?: string;
  created_at: string;
  profiles?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: string;
  start_date: string;
  end_date?: string;
  is_holiday: boolean;
  created_by?: string;
  created_at: string;
}

export interface Timetable {
  id: string;
  class_id: string;
  section_id?: string;
  subject_id: string;
  teacher_id?: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
  classes?: Class;
  subjects?: Subject;
  profiles?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
  profiles?: Profile;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: unknown;
  updated_by?: string;
  updated_at: string;
}

export interface AIChatHistory {
  id: string;
  user_id: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  created_at: string;
  updated_at: string;
}

export type TeacherAbsenceStatus = 'absent' | 'casual_leave' | 'earned_leave';

export interface TeacherSalary {
  id: string;
  teacher_id: string;
  school_id: string;
  monthly_salary: number;
  effective_from: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TeacherAttendanceRecord {
  id: string;
  teacher_id: string;
  school_id: string;
  date: string;
  status: TeacherAbsenceStatus;
  reason?: string;
  approved_by?: string;
  is_deductible: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface SchoolAttendanceSettings {
  id: string;
  school_id: string;
  max_yearly_absences: number;
  salary_calculation_type: 'calendar_days' | 'working_days';
  created_at: string;
  updated_at: string;
}

export interface TeacherPayroll {
  id: string;
  teacher_id: string;
  school_id: string;
  month: string;
  year: number;
  monthly_salary: number;
  total_days_in_month: number;
  deductible_absences: number;
  per_day_salary: number;
  total_deduction: number;
  final_salary: number;
  status: 'pending' | 'paid';
  paid_date?: string;
  remarks?: string;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TeacherSecurityDeposit {
  id: string;
  teacher_id: string;
  school_id: string;
  base_salary: number;
  deposit_percentage: number;
  total_deposit: number;
  collected_amount: number;
  remaining_balance: number;
  installment_amount: number;
  status: 'active' | 'completed';
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TeacherAdvance {
  id: string;
  teacher_id: string;
  school_id: string;
  amount: number;
  deduction_month: string;
  deduction_year: number;
  deducted_amount: number;
  remaining_balance: number;
  status: 'pending' | 'approved' | 'deducted' | 'carried_forward';
  approved_by?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface TeacherLoan {
  id: string;
  teacher_id: string;
  school_id: string;
  total_loan_amount: number;
  remaining_balance: number;
  installment_amount: number;
  start_month: string;
  start_year: number;
  status: 'active' | 'completed';
  approved_by?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}
