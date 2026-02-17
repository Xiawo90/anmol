import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import UserManagement from "./pages/admin/UserManagement";
import ClassManagement from "./pages/admin/ClassManagement";
import SubjectManagement from "./pages/admin/SubjectManagement";
import TeacherAssignments from "./pages/admin/TeacherAssignments";
import StudentEnrollments from "./pages/admin/StudentEnrollments";
import FeeManagement from "./pages/admin/FeeManagement";
import Approvals from "./pages/admin/Approvals";
import SectionManagement from "./pages/admin/SectionManagement";
import Assignments from "./pages/admin/Assignments";
import ActivityLogs from "./pages/admin/ActivityLogs";
import TimetableManagement from "./pages/admin/TimetableManagement";
import ParentStudentManagement from "./pages/admin/ParentStudentManagement";
import AdminFeeReceipts from "./pages/admin/FeeReceipts";
import SchoolManagement from "./pages/admin/SchoolManagement";
import TeacherAttendancePage from "./pages/admin/TeacherAttendance";
import TeacherSalaryManagement from "./pages/admin/TeacherSalaryManagement";
import TeacherPayroll from "./pages/admin/TeacherPayroll";
import SecurityDeposits from "./pages/admin/SecurityDeposits";
import AdvanceSalary from "./pages/admin/AdvanceSalary";
import LoanManagement from "./pages/admin/LoanManagement";

// Student pages
import StudentAttendance from "./pages/student/Attendance";
import StudentHomework from "./pages/student/Homework";
import StudentSubmissions from "./pages/student/Submissions";
import StudentMaterials from "./pages/student/Materials";
import StudentResults from "./pages/student/Results";
import StudentExams from "./pages/student/Exams";
import StudentTimetable from "./pages/student/Timetable";
import StudentAIHelper from "./pages/student/AIHelper";

// Teacher pages
import TeacherClasses from "./pages/teacher/Classes";
import TeacherAttendance from "./pages/teacher/Attendance";
import TeacherHomework from "./pages/teacher/Homework";
import TeacherSubmissions from "./pages/teacher/Submissions";
import TeacherMaterials from "./pages/teacher/Materials";
import TeacherExams from "./pages/teacher/Exams";
import TeacherMyAttendance from "./pages/teacher/MyAttendance";


// Parent pages
import ParentChildren from "./pages/parent/Children";
import ParentAttendance from "./pages/parent/Attendance";
import ParentHomework from "./pages/parent/Homework";
import ParentResults from "./pages/parent/Results";
import ParentFees from "./pages/parent/Fees";

// Shared pages
import Announcements from "./pages/shared/Announcements";
import Messages from "./pages/shared/Messages";
import Events from "./pages/shared/Events";
import Settings from "./pages/shared/Settings";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/auth" element={<PublicRoute><Auth /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/schools" element={<ProtectedRoute><SchoolManagement /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
            <Route path="/admin/approvals" element={<ProtectedRoute><Approvals /></ProtectedRoute>} />
            <Route path="/admin/classes" element={<ProtectedRoute><ClassManagement /></ProtectedRoute>} />
            <Route path="/admin/sections" element={<ProtectedRoute><SectionManagement /></ProtectedRoute>} />
            <Route path="/admin/subjects" element={<ProtectedRoute><SubjectManagement /></ProtectedRoute>} />
            <Route path="/admin/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />
            <Route path="/admin/teacher-assignments" element={<ProtectedRoute><TeacherAssignments /></ProtectedRoute>} />
            <Route path="/admin/student-enrollments" element={<ProtectedRoute><StudentEnrollments /></ProtectedRoute>} />
            <Route path="/admin/fees" element={<ProtectedRoute><FeeManagement /></ProtectedRoute>} />
            <Route path="/admin/fee-receipts" element={<ProtectedRoute><AdminFeeReceipts /></ProtectedRoute>} />
            <Route path="/admin/logs" element={<ProtectedRoute><ActivityLogs /></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute><TimetableManagement /></ProtectedRoute>} />
            <Route path="/admin/parent-students" element={<ProtectedRoute><ParentStudentManagement /></ProtectedRoute>} />
            <Route path="/admin/teacher-attendance" element={<ProtectedRoute><TeacherAttendancePage /></ProtectedRoute>} />
            <Route path="/admin/teacher-salaries" element={<ProtectedRoute><TeacherSalaryManagement /></ProtectedRoute>} />
            <Route path="/admin/security-deposits" element={<ProtectedRoute><SecurityDeposits /></ProtectedRoute>} />
            <Route path="/admin/advance-salary" element={<ProtectedRoute><AdvanceSalary /></ProtectedRoute>} />
            <Route path="/admin/loans" element={<ProtectedRoute><LoanManagement /></ProtectedRoute>} />
            <Route path="/admin/payroll" element={<ProtectedRoute><TeacherPayroll /></ProtectedRoute>} />
            <Route path="/admin/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/admin/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/admin/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Teacher routes */}
            <Route path="/teacher/classes" element={<ProtectedRoute><TeacherClasses /></ProtectedRoute>} />
            <Route path="/teacher/attendance" element={<ProtectedRoute><TeacherAttendance /></ProtectedRoute>} />
            <Route path="/teacher/homework" element={<ProtectedRoute><TeacherHomework /></ProtectedRoute>} />
            <Route path="/teacher/submissions" element={<ProtectedRoute><TeacherSubmissions /></ProtectedRoute>} />
            <Route path="/teacher/materials" element={<ProtectedRoute><TeacherMaterials /></ProtectedRoute>} />
            <Route path="/teacher/exams" element={<ProtectedRoute><TeacherExams /></ProtectedRoute>} />
            <Route path="/teacher/my-attendance" element={<ProtectedRoute><TeacherMyAttendance /></ProtectedRoute>} />
            
            <Route path="/teacher/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/teacher/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/teacher/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />

            {/* Student routes */}
            <Route path="/student/attendance" element={<ProtectedRoute><StudentAttendance /></ProtectedRoute>} />
            <Route path="/student/homework" element={<ProtectedRoute><StudentHomework /></ProtectedRoute>} />
            <Route path="/student/submissions" element={<ProtectedRoute><StudentSubmissions /></ProtectedRoute>} />
            <Route path="/student/materials" element={<ProtectedRoute><StudentMaterials /></ProtectedRoute>} />
            <Route path="/student/exams" element={<ProtectedRoute><StudentExams /></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute><StudentResults /></ProtectedRoute>} />
            <Route path="/student/timetable" element={<ProtectedRoute><StudentTimetable /></ProtectedRoute>} />
            <Route path="/student/ai-helper" element={<ProtectedRoute><StudentAIHelper /></ProtectedRoute>} />
            <Route path="/student/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/student/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/student/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />

            {/* Parent routes */}
            <Route path="/parent/children" element={<ProtectedRoute><ParentChildren /></ProtectedRoute>} />
            <Route path="/parent/attendance" element={<ProtectedRoute><ParentAttendance /></ProtectedRoute>} />
            <Route path="/parent/homework" element={<ProtectedRoute><ParentHomework /></ProtectedRoute>} />
            <Route path="/parent/results" element={<ProtectedRoute><ParentResults /></ProtectedRoute>} />
            <Route path="/parent/fees" element={<ProtectedRoute><ParentFees /></ProtectedRoute>} />
            <Route path="/parent/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/parent/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/parent/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />

            {/* Legacy shared routes */}
            <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
