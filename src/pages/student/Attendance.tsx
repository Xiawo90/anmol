import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { CheckCircle, XCircle, MinusCircle } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'leave';
  remarks: string | null;
}

export default function StudentAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ present: 0, absent: 0, leave: 0, total: 0 });

  useEffect(() => {
    if (user) {
      fetchAttendance();
    }
  }, [user, selectedDate]);

  const fetchAttendance = async () => {
    if (!user) return;
    
    setLoading(true);
    const monthStart = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
    const monthEnd = format(endOfMonth(selectedDate), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', user.id)
      .gte('date', monthStart)
      .lte('date', monthEnd)
      .order('date', { ascending: false });

    if (!error && data) {
      setAttendance(data as AttendanceRecord[]);
      
      const present = data.filter(a => a.status === 'present').length;
      const absent = data.filter(a => a.status === 'absent').length;
      const leave = data.filter(a => a.status === 'leave').length;
      setStats({ present, absent, leave, total: data.length });
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'absent':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'leave':
        return <MinusCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      present: 'default',
      absent: 'destructive',
      leave: 'secondary',
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  // Get attendance dates for calendar highlighting
  const presentDates = attendance.filter(a => a.status === 'present').map(a => parseISO(a.date));
  const absentDates = attendance.filter(a => a.status === 'absent').map(a => parseISO(a.date));
  const leaveDates = attendance.filter(a => a.status === 'leave').map(a => parseISO(a.date));

  const attendancePercentage = stats.total > 0 
    ? Math.round((stats.present / stats.total) * 100) 
    : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">My Attendance</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View your attendance records</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">{stats.present}</div>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-destructive">{stats.absent}</div>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-500">{stats.leave}</div>
                <p className="text-sm text-muted-foreground">Leave</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{attendancePercentage}%</div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <Card>
            <CardHeader>
              <CardTitle>Attendance Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
                modifiers={{
                  present: presentDates,
                  absent: absentDates,
                  leave: leaveDates,
                }}
                modifiersStyles={{
                  present: { backgroundColor: 'hsl(var(--chart-2))', color: 'white', borderRadius: '50%' },
                  absent: { backgroundColor: 'hsl(var(--destructive))', color: 'white', borderRadius: '50%' },
                  leave: { backgroundColor: 'hsl(var(--chart-4))', color: 'white', borderRadius: '50%' },
                }}
              />
              <div className="flex gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-chart-2" />
                  <span>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-chart-4" />
                  <span>Leave</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : attendance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records for this month
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(record.status)}
                        <div>
                          <p className="font-medium">
                            {format(parseISO(record.date), 'EEEE, MMM d, yyyy')}
                          </p>
                          {record.remarks && (
                            <p className="text-sm text-muted-foreground">{record.remarks}</p>
                          )}
                        </div>
                      </div>
                      {getStatusBadge(record.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
