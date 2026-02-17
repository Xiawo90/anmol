import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, ClipboardList, FileText, DollarSign, GraduationCap, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, startOfMonth, endOfMonth } from 'date-fns';

interface ChildInfo {
  id: string;
  student_id: string;
  full_name: string;
  class_name: string;
  section_name?: string;
  attendance_rate: number;
  pending_homework: number;
  unpaid_fees: number;
}

export function ParentDashboard() {
  const { user, profile } = useAuth();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      // Get parent-student relationships
      const { data: relationships } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', user!.id);

      if (relationships && relationships.length > 0) {
        const studentIds = relationships.map(r => r.student_id);

        // Get student profiles and enrollments
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);

        const { data: enrollments } = await supabase
          .from('student_enrollments')
          .select(`
            student_id,
            classes:class_id(name),
            sections:section_id(name)
          `)
          .in('student_id', studentIds);

        const childrenInfo: ChildInfo[] = await Promise.all(
          (profiles || []).map(async (profile) => {
            const enrollment = enrollments?.find(e => e.student_id === profile.user_id);
            
            // Get attendance rate
            const monthStart = startOfMonth(new Date());
            const monthEnd = endOfMonth(new Date());
            const { data: attendance } = await supabase
              .from('attendance')
              .select('status')
              .eq('student_id', profile.user_id)
              .gte('date', format(monthStart, 'yyyy-MM-dd'))
              .lte('date', format(monthEnd, 'yyyy-MM-dd'));

            const attendanceRate = attendance?.length 
              ? Math.round((attendance.filter(a => a.status === 'present').length / attendance.length) * 100)
              : 0;

            // Get pending homework count
            const { count: pendingCount } = await supabase
              .from('homework_submissions')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', profile.user_id)
              .eq('status', 'pending');

            // Get unpaid fees
            const { count: unpaidCount } = await supabase
              .from('fee_records')
              .select('*', { count: 'exact', head: true })
              .eq('student_id', profile.user_id)
              .eq('status', 'unpaid');

            return {
              id: profile.user_id,
              student_id: profile.user_id,
              full_name: profile.full_name,
              class_name: (enrollment?.classes as any)?.name || 'Not Assigned',
              section_name: (enrollment?.sections as any)?.name,
              attendance_rate: attendanceRate,
              pending_homework: pendingCount || 0,
              unpaid_fees: unpaidCount || 0,
            };
          })
        );

        setChildren(childrenInfo);
        if (childrenInfo.length > 0) {
          setSelectedChild(childrenInfo[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Welcome, {profile?.full_name}</h1>
        <p className="page-subtitle">Monitor your children's progress</p>
      </div>

      {children.length === 0 ? (
        <Card className="border-warning bg-warning/5">
          <CardContent className="py-8 text-center">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-warning" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Children Linked</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Contact the school administrator to link your children's accounts to your parent account.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Child Selector */}
          {children.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 overflow-x-auto">
                  {children.map((child) => (
                    <Button
                      key={child.id}
                      variant={selectedChild?.id === child.id ? 'default' : 'outline'}
                      onClick={() => setSelectedChild(child)}
                      className="whitespace-nowrap"
                    >
                      {child.full_name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {selectedChild && (
            <>
              {/* Child Info Header */}
              <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-2xl font-bold">
                        {selectedChild.full_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{selectedChild.full_name}</h2>
                      <p className="text-primary-foreground/80">
                        {selectedChild.class_name}
                        {selectedChild.section_name && ` - Section ${selectedChild.section_name}`}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="stat-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Attendance Rate</p>
                      <ClipboardList className="w-5 h-5 text-success" />
                    </div>
                    <p className="text-3xl font-bold">{selectedChild.attendance_rate}%</p>
                    <Progress value={selectedChild.attendance_rate} className="mt-2 h-2" />
                  </CardContent>
                </Card>

                <Card className="stat-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Pending Homework</p>
                      <FileText className="w-5 h-5 text-warning" />
                    </div>
                    <p className="text-3xl font-bold">{selectedChild.pending_homework}</p>
                    <p className="text-xs text-muted-foreground mt-1">Assignments due</p>
                  </CardContent>
                </Card>

                <Card className="stat-card">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm text-muted-foreground">Unpaid Fees</p>
                      <DollarSign className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-3xl font-bold">{selectedChild.unpaid_fees}</p>
                    <p className="text-xs text-muted-foreground mt-1">Months pending</p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>View your child's information</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Link to="/parent/attendance">
                    <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                      <ClipboardList className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">Attendance</span>
                    </Button>
                  </Link>
                  <Link to="/parent/homework">
                    <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                      <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">Homework</span>
                    </Button>
                  </Link>
                  <Link to="/parent/results">
                    <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                      <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">Results</span>
                    </Button>
                  </Link>
                  <Link to="/parent/fees">
                    <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">Fees</span>
                    </Button>
                  </Link>
                  <Link to="/messages" className="col-span-2">
                    <Button variant="outline" className="w-full justify-start gap-1.5 sm:gap-2 text-xs sm:text-sm h-auto py-2.5 px-2 sm:px-4">
                      <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                      <span className="truncate">Chat with Teacher</span>
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
