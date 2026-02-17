import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { School, ClipboardList, FileText, BookOpen, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { TeacherAssignment, HomeworkSubmission } from '@/types';

export function TeacherDashboard() {
  const { user, profile, isApproved } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && isApproved) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [user, isApproved]);

  const fetchData = async () => {
    try {
      // Get teacher assignments
      const { data: assignData } = await supabase
        .from('teacher_assignments')
        .select(`
          *,
          classes:class_id(name),
          subjects:subject_id(name),
          sections:section_id(name)
        `)
        .eq('teacher_id', user!.id);

      setAssignments((assignData || []) as unknown as TeacherAssignment[]);

      // Count pending submissions for teacher's homework
      const { data: homework } = await supabase
        .from('homework')
        .select('id')
        .eq('teacher_id', user!.id);

      if (homework && homework.length > 0) {
        const homeworkIds = homework.map(h => h.id);
        const { count } = await supabase
          .from('homework_submissions')
          .select('*', { count: 'exact', head: true })
          .in('homework_id', homeworkIds)
          .eq('status', 'submitted');

        setPendingSubmissions(count || 0);
      }
    } catch (error) {
      console.error('Error fetching teacher data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isApproved) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-title">Welcome, {profile?.full_name}</h1>
          <p className="page-subtitle">Your account is pending approval</p>
        </div>
        
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Pending Approval</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your teacher account is awaiting approval from the administrator. 
              You'll have full access once approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Welcome, {profile?.full_name}</h1>
        <p className="page-subtitle">Manage your classes and students</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">My Classes</p>
                <p className="text-3xl font-bold mt-1">{assignments.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10 text-info">
                <School className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Reviews</p>
                <p className="text-3xl font-bold mt-1">{pendingSubmissions}</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10 text-warning">
                <FolderOpen className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Subjects</p>
                <p className="text-3xl font-bold mt-1">
                  {new Set(assignments.map(a => a.subject_id)).size}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & My Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for teachers</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link to="/teacher/attendance">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Attendance</span>
              </Button>
            </Link>
            <Link to="/teacher/homework">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Homework</span>
              </Button>
            </Link>
            <Link to="/teacher/submissions">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <FolderOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Submissions</span>
              </Button>
            </Link>
            <Link to="/teacher/materials">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Materials</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* My Classes */}
        <Card>
          <CardHeader>
            <CardTitle>My Assigned Classes</CardTitle>
            <CardDescription>Classes and subjects you teach</CardDescription>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No classes assigned yet
              </p>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 5).map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">{assignment.classes?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {assignment.subjects?.name}
                        {assignment.sections?.name && ` • Section ${assignment.sections.name}`}
                      </p>
                    </div>
                    <Link to="/teacher/attendance">
                      <Button variant="ghost" size="sm">
                        <ClipboardList className="w-4 h-4" />
                      </Button>
                    </Link>
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
