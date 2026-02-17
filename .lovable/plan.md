

# Multi-School Teacher Attendance and Salary Module

## Overview

This plan adds a complete Teacher Attendance and Salary/Payroll module to the existing School Management SaaS. It follows the existing patterns (FeeManagement-style UI, RLS with `school_id`, `get_user_role`/`get_user_school_id` helper functions, DashboardLayout wrapper).

---

## Phase 1: Database Schema (Migration)

### New Tables

**1. `teacher_salaries`** -- stores each teacher's monthly salary amount
- `id` (UUID, PK, default `gen_random_uuid()`)
- `teacher_id` (UUID, NOT NULL) -- references the teacher's user_id
- `school_id` (UUID, NOT NULL)
- `monthly_salary` (NUMERIC, NOT NULL)
- `effective_from` (DATE, NOT NULL, default `CURRENT_DATE`)
- `is_active` (BOOLEAN, default `true`)
- `created_at` (TIMESTAMPTZ, default `now()`)
- `updated_at` (TIMESTAMPTZ, default `now()`)

**2. `teacher_attendance`** -- only records when a teacher is NOT present
- `id` (UUID, PK, default `gen_random_uuid()`)
- `teacher_id` (UUID, NOT NULL)
- `school_id` (UUID, NOT NULL)
- `date` (DATE, NOT NULL)
- `status` (TEXT, NOT NULL, CHECK IN `('absent', 'casual_leave', 'earned_leave')`)
- `reason` (TEXT, nullable)
- `approved_by` (UUID, nullable)
- `is_deductible` (BOOLEAN, default `false`)
- `created_at` (TIMESTAMPTZ, default `now()`)
- UNIQUE constraint on `(teacher_id, date)`
- INDEX on `(teacher_id, date)`

**3. `school_attendance_settings`** -- per-school configurable limits
- `id` (UUID, PK, default `gen_random_uuid()`)
- `school_id` (UUID, NOT NULL, UNIQUE)
- `max_yearly_absences` (INTEGER, default `7`)
- `salary_calculation_type` (TEXT, default `'calendar_days'`, CHECK IN `('calendar_days', 'working_days')`)
- `created_at` (TIMESTAMPTZ, default `now()`)
- `updated_at` (TIMESTAMPTZ, default `now()`)

**4. `teacher_payroll`** -- generated payroll records (like fee_records for teachers)
- `id` (UUID, PK, default `gen_random_uuid()`)
- `teacher_id` (UUID, NOT NULL)
- `school_id` (UUID, NOT NULL)
- `month` (TEXT, NOT NULL) -- e.g. "January"
- `year` (INTEGER, NOT NULL)
- `monthly_salary` (NUMERIC, NOT NULL)
- `total_days_in_month` (INTEGER, NOT NULL)
- `deductible_absences` (INTEGER, default `0`)
- `per_day_salary` (NUMERIC, NOT NULL)
- `total_deduction` (NUMERIC, default `0`)
- `final_salary` (NUMERIC, NOT NULL)
- `status` (TEXT, default `'pending'`, CHECK IN `('pending', 'paid')`)
- `paid_date` (DATE, nullable)
- `remarks` (TEXT, nullable)
- `is_locked` (BOOLEAN, default `false`)
- `created_at` (TIMESTAMPTZ, default `now()`)
- `updated_at` (TIMESTAMPTZ, default `now()`)
- UNIQUE constraint on `(teacher_id, month, year)`

### RLS Policies (all tables)

Follow the existing pattern:
- **Admin** (ALL): `get_user_role(auth.uid()) = 'admin' AND school_id = get_user_school_id(auth.uid())`
- **AdminDirector** (SELECT): `get_user_role(auth.uid()) = 'admindirector'`
- **Teacher** (SELECT own): `auth.uid() = teacher_id` (for `teacher_attendance`, `teacher_salaries`, `teacher_payroll`)

### Indexes
- `teacher_attendance(teacher_id, date)`
- `teacher_payroll(teacher_id, month, year)`

---

## Phase 2: TypeScript Types

### File: `src/types/index.ts`

Add new interfaces:
- `TeacherSalary` -- matches `teacher_salaries` table
- `TeacherAttendanceRecord` -- matches `teacher_attendance` table
- `SchoolAttendanceSettings` -- matches `school_attendance_settings` table
- `TeacherPayroll` -- matches `teacher_payroll` table

---

## Phase 3: Admin Pages

### 3A. Teacher Attendance Page (`src/pages/admin/TeacherAttendance.tsx`)

Route: `/admin/teacher-attendance`

**UI Structure:**
- Header: "Teacher Attendance" with description
- Filters bar: Date picker, Month/Year selectors, Teacher search dropdown, Export button
- Summary cards: Total teachers, Present today (no record = present), Absent today, On Leave today
- Table columns: Teacher Name | Date | Status | Deductible (Yes/No badge) | Reason | Actions
- "Mark Absence" button opens a modal

**Mark Absence Modal:**
- Select Teacher (searchable dropdown of teachers in school)
- Select Date
- Select Absence Type: Absent / Casual Leave / Earned Leave
- Reason (textarea)
- Shows current yearly absence count with color coding:
  - 0-4: Green badge
  - 5-6: Orange badge  
  - 7+: Red badge
- If yearly count >= `max_yearly_absences`: show red AlertDialog warning before saving, auto-set `is_deductible = true`
- On save: insert into `teacher_attendance` with `school_id` from profile, `approved_by` as current admin

### 3B. Teacher Salary Management Page (`src/pages/admin/TeacherSalaryManagement.tsx`)

Route: `/admin/teacher-salaries`

**UI Structure (mirrors Fee Management):**
- Header: "Teacher Salary Management"
- "Add Salary Record" button opens dialog
- Stats cards: Total Teachers with Salary | Average Salary | Total Monthly Expense
- Table: Teacher Name | Monthly Salary | Effective From | Status (Active/Inactive) | Actions (Edit)
- Dialog to add/edit: Select Teacher, Monthly Salary amount, Effective Date

### 3C. Payroll Module Page (`src/pages/admin/TeacherPayroll.tsx`)

Route: `/admin/payroll`

**UI Structure:**
- Header: "Payroll Management"
- Filters: Select Month, Select Year
- "Generate Payroll" button -- calculates for all teachers for selected month
- Stats cards: Total Payable | Total Deductions | Total Paid | Total Pending
- Table: Teacher Name | Monthly Salary | Days in Month | Deductible Days | Per Day Salary | Total Deduction | Final Salary | Status (Pending/Paid) | Actions (Mark Paid)
- "Mark Paid" button updates status to 'paid' and sets `paid_date`
- After payroll is generated, attendance for that month is locked (`is_locked = true`)

**Payroll Generation Logic:**
1. Get all teachers with active salary records for the school
2. For each teacher:
   - Get `monthly_salary` from `teacher_salaries`
   - Calculate `total_days_in_month` (calendar days or working days based on `salary_calculation_type`)
   - Count `deductible_absences` from `teacher_attendance` where `is_deductible = true` for that month
   - `per_day_salary = monthly_salary / total_days_in_month`
   - `total_deduction = per_day_salary * deductible_absences`
   - `final_salary = monthly_salary - total_deduction`
3. Upsert into `teacher_payroll`

### 3D. School Attendance Settings

Add a section inside the existing Settings page or as a card in Teacher Attendance page:
- Max Yearly Absences (number input, default 7)
- Salary Calculation Type (Calendar Days / Working Days)
- Auto-creates a record for the school if none exists

---

## Phase 4: Teacher Pages

### Teacher Attendance View (`src/pages/teacher/MyAttendance.tsx`)

Route: `/teacher/my-attendance`

**UI Structure:**
- Header: "My Attendance"
- Month/Year filter
- Stats: Total Absences This Year | Deductible Days | Remaining Allowed Absences
- Color-coded yearly count (green/orange/red)
- Table: Date | Status | Deductible | Reason
- Read-only -- teachers cannot edit

### Teacher Salary View (`src/pages/teacher/MySalary.tsx`)

Route: `/teacher/my-salary`

**UI Structure:**
- Header: "My Salary"
- Current monthly salary display
- Payroll history table: Month/Year | Monthly Salary | Deductions | Final Salary | Status (Pending/Paid)
- Read-only

---

## Phase 5: Admin Director Dashboard Updates

### File: `src/components/dashboards/AdminDirectorDashboard.tsx`

Add new analytics section:
- **Salary Stats Cards**: Total Salary Paid (all schools) | Total Salary Pending | Total Deductions
- **Salary by School Chart**: Bar chart showing paid vs pending salary per school
- School filter applies to salary data too

---

## Phase 6: Navigation and Routing

### Sidebar (`src/components/layout/Sidebar.tsx`)

Add to admin items:
- "Teacher Attendance" (ClipboardList icon) -> `/admin/teacher-attendance`
- "Teacher Salaries" (DollarSign icon) -> `/admin/teacher-salaries`
- "Payroll" (Receipt icon) -> `/admin/payroll`

Add to teacher items:
- "My Attendance" (ClipboardList icon) -> `/teacher/my-attendance`
- "My Salary" (DollarSign icon) -> `/teacher/my-salary`

### Routes (`src/App.tsx`)

Add new protected routes:
- `/admin/teacher-attendance` -> `TeacherAttendancePage`
- `/admin/teacher-salaries` -> `TeacherSalaryManagement`
- `/admin/payroll` -> `TeacherPayroll`
- `/teacher/my-attendance` -> `TeacherMyAttendance`
- `/teacher/my-salary` -> `TeacherMySalary`

---

## Phase 7: Attendance Locking Logic

When payroll is generated for a month:
- Set `is_locked = true` on the payroll record
- On the Teacher Attendance page, if admin tries to edit/add an absence for a locked month, show a warning: "Attendance for this month is locked as payroll has been generated."
- Check is done by querying `teacher_payroll` for the month/year

---

## Technical Details

### Files to Create (7 new files)
1. `src/pages/admin/TeacherAttendance.tsx` -- Admin attendance marking page
2. `src/pages/admin/TeacherSalaryManagement.tsx` -- Admin salary records page
3. `src/pages/admin/TeacherPayroll.tsx` -- Admin payroll generation page
4. `src/pages/teacher/MyAttendance.tsx` -- Teacher's own attendance view
5. `src/pages/teacher/MySalary.tsx` -- Teacher's own salary/payroll view

### Files to Modify (4 files)
1. `src/App.tsx` -- Add 5 new routes
2. `src/components/layout/Sidebar.tsx` -- Add 5 new nav items
3. `src/types/index.ts` -- Add 4 new interfaces
4. `src/components/dashboards/AdminDirectorDashboard.tsx` -- Add salary analytics

### Database Migration (1 migration)
- Creates 4 new tables with RLS policies, indexes, and constraints

### Key Patterns Followed
- Uses `DashboardLayout` wrapper for all pages
- Uses `useAuth()` to get `profile.school_id` (never sent from frontend)
- Uses `SearchableSelect` for teacher dropdowns
- Uses `sonner` toast for notifications
- Uses existing Card/Table/Dialog/Badge UI components
- RLS uses `get_user_role()` and `get_user_school_id()` security definer functions

