import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Users, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function ParentAttendance() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');

  const { data: children } = useQuery({
    queryKey: ['parent-children-list', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: links } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', user.id);

      if (!links?.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', links.map(l => l.student_id));

      return profiles || [];
    },
    enabled: !!user,
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ['parent-child-attendance', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          class:classes(name)
        `)
        .eq('student_id', selectedChild)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedChild,
  });

  const stats = React.useMemo(() => {
    if (!attendance?.length) return { present: 0, absent: 0, leave: 0, total: 0 };
    return {
      present: attendance.filter(a => a.status === 'present').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      leave: attendance.filter(a => a.status === 'leave').length,
      total: attendance.length,
    };
  }, [attendance]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Present</Badge>;
      case 'absent':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Absent</Badge>;
      case 'leave':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Leave</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">View your children's attendance records</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Child</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children?.map((child) => (
                  <SelectItem key={child.user_id} value={child.user_id}>
                    {child.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedChild && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.present}</p>
                      <p className="text-sm text-muted-foreground">Present</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.absent}</p>
                      <p className="text-sm text-muted-foreground">Absent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.leave}</p>
                      <p className="text-sm text-muted-foreground">Leave</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%
                      </p>
                      <p className="text-sm text-muted-foreground">Attendance</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance (Last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : attendance?.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No attendance records found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>{format(new Date(record.date), 'PPP')}</TableCell>
                          <TableCell>{record.class?.name}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell className="text-muted-foreground">{record.remarks || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedChild && children?.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No children linked to your account.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
