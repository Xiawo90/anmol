import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, GraduationCap, School, BookOpen, UserCheck, Clock, DollarSign, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  totalSubjects: number;
  pendingApprovals: number;
  recentActivities: Array<{
    id: string;
    action: string;
    created_at: string;
    profiles?: { full_name: string };
  }>;
}

export function AdminDashboard() {
  const { profile } = useAuth();
  const schoolId = profile?.school_id;
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalSubjects: 0,
    pendingApprovals: 0,
    recentActivities: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (schoolId) {
      fetchStats();
    }
  }, [schoolId]);

  const fetchStats = async () => {
    if (!schoolId) return;
    try {
      // Count students by joining profiles (school_id) with user_roles
      const { data: studentProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('school_id', schoolId);

      const schoolUserIds = (studentProfiles || []).map(p => p.user_id);

      let studentsCount = 0;
      let teachersCount = 0;

      if (schoolUserIds.length > 0) {
        const { data: roles } = await supabase
          .from('user_roles')
          .select('user_id, role')
          .in('user_id', schoolUserIds);

        studentsCount = (roles || []).filter(r => r.role === 'student').length;
        teachersCount = (roles || []).filter(r => r.role === 'teacher').length;
      }

      // Count classes for this school
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      // Count subjects for this school
      const { count: subjectsCount } = await supabase
        .from('subjects')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId);

      // Count pending approvals for this school
      const { count: pendingCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('approval_status', 'pending');

      // Recent activities for this school
      const { data: activities } = await supabase
        .from('activity_logs')
        .select('id, action, created_at, profiles:user_id(full_name)')
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalStudents: studentsCount,
        totalTeachers: teachersCount,
        totalClasses: classesCount || 0,
        totalSubjects: subjectsCount || 0,
        pendingApprovals: pendingCount || 0,
        recentActivities: (activities || []) as any,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Students', value: stats.totalStudents, icon: GraduationCap, color: 'text-info', href: '/admin/users' },
    { label: 'Total Teachers', value: stats.totalTeachers, icon: Users, color: 'text-success', href: '/admin/users' },
    { label: 'Classes', value: stats.totalClasses, icon: School, color: 'text-warning', href: '/admin/classes' },
    { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen, color: 'text-accent', href: '/admin/subjects' },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Welcome to Anmol Public School System</p>
      </div>

      {/* Pending Approvals Alert */}
      {stats.pendingApprovals > 0 && (
        <Card className="border-warning bg-warning/5">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-warning" />
              <span>You have <strong>{stats.pendingApprovals}</strong> pending user approvals</span>
            </div>
            <Link to="/admin/approvals">
              <Button variant="outline" size="sm">Review Now</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((stat) => (
          <Link key={stat.label} to={stat.href}>
            <Card className="stat-card card-hover">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold mt-1">{isLoading ? '-' : stat.value}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-xl bg-muted ${stat.color}`}>
                    <stat.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link to="/admin/classes">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <School className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Classes</span>
              </Button>
            </Link>
            <Link to="/admin/subjects">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Subjects</span>
              </Button>
            </Link>
            <Link to="/admin/users">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Users</span>
              </Button>
            </Link>
            <Link to="/admin/fees">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Fees</span>
              </Button>
            </Link>
            <Link to="/announcements">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Announce</span>
              </Button>
            </Link>
            <Link to="/admin/logs">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Logs</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activity</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.recentActivities.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No recent activity</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <Clock className="w-4 h-4 text-muted-foreground mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.profiles?.full_name} • {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
