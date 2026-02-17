import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import schoolLogo from '@/assets/school-logo.png';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  MessageSquare,
  Bell,
  Settings,
  FileText,
  DollarSign,
  UserCheck,
  School,
  Layers,
  Bot,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Clock,
  CalendarDays,
  FolderOpen,
  X,
  Receipt,
  Building2,
  Shield,
  Landmark,
  ArrowRightLeft,
  Calculator } from
'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  roles: string[];
}

// Role-specific nav items will be computed dynamically
const getNavItems = (role: string | null): NavItem[] => {
  const baseItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['systemadmin', 'admin', 'admindirector', 'teacher', 'student', 'parent'] }];


  const systemAdminItems: NavItem[] = [
  { label: 'Schools', icon: Building2, href: '/admin/schools', roles: ['systemadmin'] },
  { label: 'Manage Admins', icon: Users, href: '/admin/users', roles: ['systemadmin'] },
  { label: 'Activity Logs', icon: Clock, href: '/admin/logs', roles: ['systemadmin'] }];


  const adminItems: NavItem[] = [
  { label: 'Users', icon: Users, href: '/admin/users', roles: ['admin'] },
  { label: 'Classes', icon: School, href: '/admin/classes', roles: ['admin'] },
  { label: 'Sections', icon: Layers, href: '/admin/sections', roles: ['admin'] },
  { label: 'Subjects', icon: BookOpen, href: '/admin/subjects', roles: ['admin'] },
  { label: 'Teacher Assignments', icon: ClipboardList, href: '/admin/teacher-assignments', roles: ['admin'] },
  { label: 'Student Enrollments', icon: GraduationCap, href: '/admin/student-enrollments', roles: ['admin'] },
  { label: 'Parent-Student Links', icon: Users, href: '/admin/parent-students', roles: ['admin'] },
  { label: 'Assignments', icon: FileText, href: '/admin/assignments', roles: ['admin'] },
  { label: 'Teacher Attendance', icon: ClipboardList, href: '/admin/teacher-attendance', roles: ['admin'] },
  { label: 'Teacher Salaries', icon: DollarSign, href: '/admin/teacher-salaries', roles: ['admin'] },
  { label: 'Security Deposits', icon: Shield, href: '/admin/security-deposits', roles: ['admin'] },
  { label: 'Advance Salary', icon: ArrowRightLeft, href: '/admin/advance-salary', roles: ['admin'] },
  { label: 'Loans', icon: Landmark, href: '/admin/loans', roles: ['admin'] },
  { label: 'Payroll', icon: Receipt, href: '/admin/payroll', roles: ['admin'] },
  { label: 'Fee Management', icon: DollarSign, href: '/admin/fees', roles: ['admin'] },
  { label: 'Fee Receipts', icon: Receipt, href: '/admin/fee-receipts', roles: ['admin'] },
  { label: 'Timetable', icon: Calendar, href: '/admin/timetable', roles: ['admin'] },
  { label: 'Activity Logs', icon: Clock, href: '/admin/logs', roles: ['admin'] }];

  const accountantItems: NavItem[] = [
  { label: 'Payroll', icon: Calculator, href: '/dashboard', roles: ['accountant'] }];


  const teacherItems: NavItem[] = [
  { label: 'My Classes', icon: School, href: '/teacher/classes', roles: ['teacher'] },
  { label: 'Attendance', icon: ClipboardList, href: '/teacher/attendance', roles: ['teacher'] },
  { label: 'My Attendance', icon: CalendarDays, href: '/teacher/my-attendance', roles: ['teacher'] },
  { label: 'Homework', icon: FileText, href: '/teacher/homework', roles: ['teacher'] },
  { label: 'Submissions', icon: FolderOpen, href: '/teacher/submissions', roles: ['teacher'] },
  { label: 'Study Materials', icon: BookOpen, href: '/teacher/materials', roles: ['teacher'] },
  { label: 'Exams', icon: GraduationCap, href: '/teacher/exams', roles: ['teacher'] }];


  const studentItems: NavItem[] = [
  { label: 'My Attendance', icon: ClipboardList, href: '/student/attendance', roles: ['student'] },
  { label: 'Homework', icon: FileText, href: '/student/homework', roles: ['student'] },
  { label: 'My Submissions', icon: FolderOpen, href: '/student/submissions', roles: ['student'] },
  { label: 'Study Materials', icon: BookOpen, href: '/student/materials', roles: ['student'] },
  { label: 'Exams', icon: CalendarDays, href: '/student/exams', roles: ['student'] },
  { label: 'Results', icon: GraduationCap, href: '/student/results', roles: ['student'] },
  { label: 'Timetable', icon: Calendar, href: '/student/timetable', roles: ['student'] },
  { label: 'AI Helper', icon: Bot, href: '/student/ai-helper', roles: ['student'] }];


  const parentItems: NavItem[] = [
  { label: 'My Children', icon: Users, href: '/parent/children', roles: ['parent'] },
  { label: 'Attendance', icon: ClipboardList, href: '/parent/attendance', roles: ['parent'] },
  { label: 'Homework Status', icon: FileText, href: '/parent/homework', roles: ['parent'] },
  { label: 'Fees', icon: DollarSign, href: '/parent/fees', roles: ['parent'] },
  { label: 'Results', icon: GraduationCap, href: '/parent/results', roles: ['parent'] }];


  // Common items with role-prefixed routes
  const getCommonItems = (currentRole: string | null): NavItem[] => {
    const prefix = currentRole ? `/${currentRole === 'systemadmin' || currentRole === 'admindirector' ? 'admin' : currentRole}` : '';
    return [
    { label: 'Announcements', icon: Bell, href: `${prefix}/announcements`, roles: ['admin', 'teacher', 'student', 'parent'] },
    { label: 'Messages', icon: MessageSquare, href: `${prefix}/messages`, roles: ['teacher', 'student', 'parent'] },
    { label: 'Events', icon: CalendarDays, href: `${prefix}/events`, roles: ['admin', 'teacher', 'student', 'parent'] },
    { label: 'Settings', icon: Settings, href: currentRole === 'admin' || currentRole === 'systemadmin' || currentRole === 'admindirector' ? '/admin/settings' : '/settings', roles: ['admin', 'systemadmin'] }];

  };

  return [
  ...baseItems,
  ...systemAdminItems,
  ...adminItems,
  ...accountantItems,
  ...teacherItems,
  ...studentItems,
  ...parentItems,
  ...getCommonItems(role)];

};

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { role, signOut, profile } = useAuth();

  const navItems = getNavItems(role);

  const filteredNavItems = navItems.filter((item) =>
  role && item.roles.includes(role)
  );

  const handleNavClick = () => {
    if (isMobile) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && isMobile &&
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
        onClick={onToggle} />

      }
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-50 h-full bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out",
        // Desktop: always show, toggle between expanded/collapsed
        "lg:translate-x-0",
        isOpen ? "w-64" : "lg:w-20",
        // Mobile: slide in/out
        isMobile && isOpen ? "translate-x-0 w-64" : "",
        isMobile && !isOpen ? "-translate-x-full w-64" : ""
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 border-b border-sidebar-border">
          <Link to="/dashboard" className="flex items-center gap-2 sm:gap-3" onClick={handleNavClick}>
            <img alt="Anmol Public School System" className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0" src="/lovable-uploads/417e3c6c-bcf3-48af-ae3c-597d300630c4.png" />
            {isOpen &&
            <div className="min-w-0">
                <h1 className="font-heading font-bold text-sm sm:text-base truncate leading-tight">Anmol Public</h1>
                <p className="text-[10px] sm:text-xs text-sidebar-foreground/60 truncate">School System</p>
              </div>
            }
          </Link>
          
          {/* Mobile close button */}
          {isMobile && isOpen &&
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">

              <X className="w-5 h-5" />
            </Button>
          }
          
          {/* Desktop collapse button */}
          {!isMobile &&
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8">

              {isOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </Button>
          }
        </div>

        {/* User Info */}
        {isOpen && profile &&
        <div className="p-3 sm:p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-medium">{profile.full_name.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs sm:text-sm truncate">{profile.full_name}</p>
                <p className="text-[10px] sm:text-xs text-sidebar-foreground/60 capitalize">{role}</p>
              </div>
            </div>
          </div>
        }

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)]">
          <nav className="p-2 sm:p-3 space-y-0.5 sm:space-y-1">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={handleNavClick}
                  className={cn(
                    "nav-link text-sm",
                    isActive && "active",
                    !isOpen && "justify-center px-2"
                  )}
                  title={!isOpen ? item.label : undefined}>

                  <item.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Link>);

            })}
          </nav>
        </ScrollArea>

        {/* Logout */}
        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 border-t border-sidebar-border bg-sidebar">
          <button
            onClick={signOut}
            className={cn(
              "nav-link w-full text-destructive hover:bg-destructive/10 text-sm",
              !isOpen && "justify-center px-2"
            )}>

            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
            {isOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>);

}