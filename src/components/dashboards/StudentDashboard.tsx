import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, FileText, BookOpen, GraduationCap, Bot, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentEnrollment, Homework, Attendance } from '@/types';
import { format, startOfMonth, endOfMonth } from 'date-fns';

export function StudentDashboard() {
  const { user, profile, isApproved } = useAuth();
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [pendingHomework, setPendingHomework] = useState<Homework[]>([]);
  const [attendanceRate, setAttendanceRate] = useState(0);
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
      // Get student enrollment
      const { data: enrollData } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          classes:class_id(name),
          sections:section_id(name)
        `)
        .eq('student_id', user!.id)
        .maybeSingle();

      if (enrollData) {
        setEnrollment(enrollData as unknown as StudentEnrollment);

        // Get pending homework for student's class
        const { data: hwData } = await supabase
          .from('homework')
          .select('*')
          .eq('class_id', enrollData.class_id)
          .gte('deadline', new Date().toISOString())
          .order('deadline', { ascending: true })
          .limit(5);

        // Filter out homework that student has submitted
        if (hwData) {
          const { data: submissions } = await supabase
            .from('homework_submissions')
            .select('homework_id')
            .eq('student_id', user!.id)
            .in('homework_id', hwData.map(h => h.id));

          const submittedIds = new Set(submissions?.map(s => s.homework_id) || []);
          setPendingHomework(hwData.filter(h => !submittedIds.has(h.id)) as Homework[]);
        }

        // Calculate attendance rate for current month
        const monthStart = startOfMonth(new Date());
        const monthEnd = endOfMonth(new Date());

        const { data: attendanceData } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', user!.id)
          .gte('date', format(monthStart, 'yyyy-MM-dd'))
          .lte('date', format(monthEnd, 'yyyy-MM-dd'));

        if (attendanceData && attendanceData.length > 0) {
          const presentCount = attendanceData.filter(a => a.status === 'present').length;
          setAttendanceRate(Math.round((presentCount / attendanceData.length) * 100));
        }
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
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
              <Clock className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Account Pending Approval</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your student account is awaiting approval and class assignment from the administrator.
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
        <p className="page-subtitle">
          {enrollment 
            ? `${enrollment.classes?.name}${enrollment.sections?.name ? ` - Section ${enrollment.sections.name}` : ''}`
            : 'Not assigned to a class yet'
          }
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Attendance Rate</p>
              <ClipboardList className="w-5 h-5 text-success" />
            </div>
            <p className="text-3xl font-bold">{attendanceRate}%</p>
            <Progress value={attendanceRate} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted-foreground">Pending Homework</p>
              <FileText className="w-5 h-5 text-warning" />
            </div>
            <p className="text-3xl font-bold">{pendingHomework.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Due this week</p>
          </CardContent>
        </Card>

        <Link to="/student/ai-helper">
          <Card className="stat-card card-hover bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-muted-foreground">AI Helper</p>
                <Bot className="w-5 h-5 text-accent" />
              </div>
              <p className="text-lg font-semibold">Need Help?</p>
              <p className="text-xs text-muted-foreground mt-1">Ask AI for homework help</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions & Pending Homework */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to important sections</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
            <Link to="/student/homework">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Homework</span>
              </Button>
            </Link>
            <Link to="/student/submissions">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Submissions</span>
              </Button>
            </Link>
            <Link to="/student/materials">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Materials</span>
              </Button>
            </Link>
            <Link to="/student/results">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Results</span>
              </Button>
            </Link>
            <Link to="/student/timetable">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">Timetable</span>
              </Button>
            </Link>
            <Link to="/student/ai-helper">
              <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4 border-accent/50 text-accent hover:bg-accent/10">
                <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="truncate">AI Helper</span>
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pending Homework */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Homework</CardTitle>
            <CardDescription>Assignments due soon</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingHomework.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No pending homework 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {pendingHomework.map((hw) => (
                  <div key={hw.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="font-medium">{hw.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(new Date(hw.deadline), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Link to="/student/homework">
                      <Button variant="outline" size="sm">Submit</Button>
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
