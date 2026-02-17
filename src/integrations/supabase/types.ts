export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          school_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          school_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_history: {
        Row: {
          created_at: string
          id: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          content: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_emergency: boolean
          school_id: string | null
          target_class_id: string | null
          target_role: string | null
          title: string
          type: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_emergency?: boolean
          school_id?: string | null
          target_class_id?: string | null
          target_role?: string | null
          title: string
          type?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_emergency?: boolean
          school_id?: string | null
          target_class_id?: string | null
          target_role?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          remarks: string | null
          school_id: string | null
          status: string
          student_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          school_id?: string | null
          status: string
          student_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          remarks?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          created_by: string | null
          grade_level: number | null
          id: string
          name: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          grade_level?: number | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          grade_level?: number | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_type: string
          id: string
          is_holiday: boolean
          location: string | null
          school_id: string | null
          start_date: string
          target_class_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_holiday?: boolean
          location?: string | null
          school_id?: string | null
          start_date: string
          target_class_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_type?: string
          id?: string
          is_holiday?: boolean
          location?: string | null
          school_id?: string | null
          start_date?: string
          target_class_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string
          entered_by: string | null
          exam_id: string
          grade: string | null
          id: string
          marks_obtained: number | null
          remarks: string | null
          school_id: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          entered_by?: string | null
          exam_id: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          entered_by?: string | null
          exam_id?: string
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          remarks?: string | null
          school_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          exam_date: string | null
          id: string
          name: string
          school_id: string | null
          subject_id: string
          total_marks: number
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          id?: string
          name: string
          school_id?: string | null
          subject_id: string
          total_marks?: number
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          exam_date?: string | null
          id?: string
          name?: string
          school_id?: string | null
          subject_id?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payment_receipts: {
        Row: {
          admin_remarks: string | null
          created_at: string
          fee_record_id: string | null
          file_name: string | null
          file_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          student_id: string
          uploaded_by: string
        }
        Insert: {
          admin_remarks?: string | null
          created_at?: string
          fee_record_id?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          student_id: string
          uploaded_by: string
        }
        Update: {
          admin_remarks?: string | null
          created_at?: string
          fee_record_id?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payment_receipts_fee_record_id_fkey"
            columns: ["fee_record_id"]
            isOneToOne: false
            referencedRelation: "fee_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_receipts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_records: {
        Row: {
          amount: number
          created_at: string
          due_date: string | null
          id: string
          invoice_file_name: string | null
          invoice_url: string | null
          month: string
          paid_date: string | null
          receipt_number: string | null
          remarks: string | null
          school_id: string | null
          status: string
          student_id: string
          updated_at: string
          year: number
        }
        Insert: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_file_name?: string | null
          invoice_url?: string | null
          month: string
          paid_date?: string | null
          receipt_number?: string | null
          remarks?: string | null
          school_id?: string | null
          status?: string
          student_id: string
          updated_at?: string
          year: number
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string | null
          id?: string
          invoice_file_name?: string | null
          invoice_url?: string | null
          month?: string
          paid_date?: string | null
          receipt_number?: string | null
          remarks?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fee_records_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          allow_late_submission: boolean
          allow_resubmission: boolean
          allowed_file_types: string[] | null
          attachment_urls: string[] | null
          class_id: string
          created_at: string
          deadline: string
          description: string | null
          id: string
          school_id: string | null
          section_id: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at: string
        }
        Insert: {
          allow_late_submission?: boolean
          allow_resubmission?: boolean
          allowed_file_types?: string[] | null
          attachment_urls?: string[] | null
          class_id: string
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id: string
          teacher_id: string
          title: string
          updated_at?: string
        }
        Update: {
          allow_late_submission?: boolean
          allow_resubmission?: boolean
          allowed_file_types?: string[] | null
          attachment_urls?: string[] | null
          class_id?: string
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id?: string
          teacher_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          content: string | null
          created_at: string
          file_urls: string[] | null
          grade: string | null
          homework_id: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          status: string
          student_id: string
          submitted_at: string | null
          teacher_remarks: string | null
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          file_urls?: string[] | null
          grade?: string | null
          homework_id: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          student_id: string
          submitted_at?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          file_urls?: string[] | null
          grade?: string | null
          homework_id?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          status?: string
          student_id?: string
          submitted_at?: string | null
          teacher_remarks?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          school_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          school_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          school_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          school_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          school_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          school_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          relationship: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          relationship?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          approval_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          school_id: string | null
          teacher_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          school_id?: string | null
          teacher_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approval_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          school_id?: string | null
          teacher_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_attendance_settings: {
        Row: {
          created_at: string
          id: string
          max_yearly_absences: number
          salary_calculation_type: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_yearly_absences?: number
          salary_calculation_type?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          max_yearly_absences?: number
          salary_calculation_type?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_attendance_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          class_id: string
          created_at: string
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          name: string
          school_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_enrollments: {
        Row: {
          academic_year: string
          class_id: string
          created_at: string
          id: string
          roll_number: string | null
          school_id: string | null
          section_id: string | null
          student_id: string
        }
        Insert: {
          academic_year?: string
          class_id: string
          created_at?: string
          id?: string
          roll_number?: string | null
          school_id?: string | null
          section_id?: string | null
          student_id: string
        }
        Update: {
          academic_year?: string
          class_id?: string
          created_at?: string
          id?: string
          roll_number?: string | null
          school_id?: string | null
          section_id?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      study_materials: {
        Row: {
          class_id: string
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          school_id: string | null
          section_id: string | null
          subject_id: string
          title: string
          uploaded_by: string
        }
        Insert: {
          class_id: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id: string
          title: string
          uploaded_by: string
        }
        Update: {
          class_id?: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id?: string
          title?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          school_id?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      teacher_advances: {
        Row: {
          amount: number
          approved_by: string | null
          created_at: string
          deducted_amount: number
          deduction_month: string
          deduction_year: number
          id: string
          remaining_balance: number
          remarks: string | null
          school_id: string
          status: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          created_at?: string
          deducted_amount?: number
          deduction_month: string
          deduction_year: number
          id?: string
          remaining_balance: number
          remarks?: string | null
          school_id: string
          status?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          created_at?: string
          deducted_amount?: number
          deduction_month?: string
          deduction_year?: number
          id?: string
          remaining_balance?: number
          remarks?: string | null
          school_id?: string
          status?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_advances_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assignments: {
        Row: {
          class_id: string
          created_at: string
          id: string
          school_id: string | null
          section_id: string | null
          subject_id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          approved_by: string | null
          created_at: string
          date: string
          id: string
          is_deductible: boolean
          reason: string | null
          school_id: string
          status: string
          teacher_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          date: string
          id?: string
          is_deductible?: boolean
          reason?: string | null
          school_id: string
          status: string
          teacher_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          date?: string
          id?: string
          is_deductible?: boolean
          reason?: string | null
          school_id?: string
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_loans: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          installment_amount: number
          remaining_balance: number
          remarks: string | null
          school_id: string
          start_month: string
          start_year: number
          status: string
          teacher_id: string
          total_loan_amount: number
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          installment_amount: number
          remaining_balance: number
          remarks?: string | null
          school_id: string
          start_month: string
          start_year: number
          status?: string
          teacher_id: string
          total_loan_amount: number
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          installment_amount?: number
          remaining_balance?: number
          remarks?: string | null
          school_id?: string
          start_month?: string
          start_year?: number
          status?: string
          teacher_id?: string
          total_loan_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_loans_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_payroll: {
        Row: {
          advance_deduction: number
          created_at: string
          deductible_absences: number
          final_salary: number
          gross_salary: number
          id: string
          is_locked: boolean
          loan_deduction: number
          month: string
          monthly_salary: number
          net_salary: number
          paid_date: string | null
          per_day_salary: number
          remarks: string | null
          school_id: string
          security_deposit_deduction: number
          status: string
          teacher_id: string
          total_days_in_month: number
          total_deduction: number
          updated_at: string
          year: number
        }
        Insert: {
          advance_deduction?: number
          created_at?: string
          deductible_absences?: number
          final_salary: number
          gross_salary?: number
          id?: string
          is_locked?: boolean
          loan_deduction?: number
          month: string
          monthly_salary: number
          net_salary?: number
          paid_date?: string | null
          per_day_salary: number
          remarks?: string | null
          school_id: string
          security_deposit_deduction?: number
          status?: string
          teacher_id: string
          total_days_in_month: number
          total_deduction?: number
          updated_at?: string
          year: number
        }
        Update: {
          advance_deduction?: number
          created_at?: string
          deductible_absences?: number
          final_salary?: number
          gross_salary?: number
          id?: string
          is_locked?: boolean
          loan_deduction?: number
          month?: string
          monthly_salary?: number
          net_salary?: number
          paid_date?: string | null
          per_day_salary?: number
          remarks?: string | null
          school_id?: string
          security_deposit_deduction?: number
          status?: string
          teacher_id?: string
          total_days_in_month?: number
          total_deduction?: number
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "teacher_payroll_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_salaries: {
        Row: {
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          monthly_salary: number
          school_id: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          monthly_salary: number
          school_id: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          monthly_salary?: number
          school_id?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_salaries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_security_deposits: {
        Row: {
          base_salary: number
          collected_amount: number
          created_at: string
          deposit_percentage: number
          id: string
          installment_amount: number
          remaining_balance: number
          school_id: string
          status: string
          teacher_id: string
          total_deposit: number
          updated_at: string
        }
        Insert: {
          base_salary: number
          collected_amount?: number
          created_at?: string
          deposit_percentage?: number
          id?: string
          installment_amount?: number
          remaining_balance: number
          school_id: string
          status?: string
          teacher_id: string
          total_deposit: number
          updated_at?: string
        }
        Update: {
          base_salary?: number
          collected_amount?: number
          created_at?: string
          deposit_percentage?: number
          id?: string
          installment_amount?: number
          remaining_balance?: number
          school_id?: string
          status?: string
          teacher_id?: string
          total_deposit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_security_deposits_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          school_id: string | null
          section_id: string | null
          start_time: string
          subject_id: string
          teacher_id: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          start_time: string
          subject_id: string
          teacher_id?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          school_id?: string | null
          section_id?: string | null
          start_time?: string
          subject_id?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: { uid: string }; Returns: string }
      get_user_school_id: { Args: { uid: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
