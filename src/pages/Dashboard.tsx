import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminDashboard } from '@/components/dashboards/AdminDashboard';
import { TeacherDashboard } from '@/components/dashboards/TeacherDashboard';
import { StudentDashboard } from '@/components/dashboards/StudentDashboard';
import { ParentDashboard } from '@/components/dashboards/ParentDashboard';
import { SystemAdminDashboard } from '@/components/dashboards/SystemAdminDashboard';
import { AdminDirectorDashboard } from '@/components/dashboards/AdminDirectorDashboard';
import { AccountantDashboard } from '@/components/dashboards/AccountantDashboard';

export default function Dashboard() {
  const { role } = useAuth();

  const renderDashboard = () => {
    switch (role) {
      case 'systemadmin':
        return <SystemAdminDashboard />;
      case 'admindirector':
        return <AdminDirectorDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'teacher':
        return <TeacherDashboard />;
      case 'student':
        return <StudentDashboard />;
      case 'parent':
        return <ParentDashboard />;
      case 'accountant':
        return <AccountantDashboard />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      {renderDashboard()}
    </DashboardLayout>
  );
}
