import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, isPast } from 'date-fns';
import { Users, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function ParentHomework() {
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

  const { data: enrollment } = useQuery({
    queryKey: ['child-enrollment', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return null;

      const { data } = await supabase
        .from('student_enrollments')
        .select('class_id, section_id')
        .eq('student_id', selectedChild)
        .single();

      return data;
    },
    enabled: !!selectedChild,
  });

  const { data: homeworkData, isLoading } = useQuery({
    queryKey: ['parent-child-homework', selectedChild, enrollment?.class_id],
    queryFn: async () => {
      if (!selectedChild || !enrollment?.class_id) return [];

      // Get homework for the child's class
      const { data: homework, error: homeworkError } = await supabase
        .from('homework')
        .select(`
          *,
          subject:subjects(name)
        `)
        .eq('class_id', enrollment.class_id)
        .order('deadline', { ascending: false })
        .limit(20);

      if (homeworkError) throw homeworkError;

      // Get submissions for this student
      const homeworkIds = homework?.map(h => h.id) || [];
      const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', selectedChild)
        .in('homework_id', homeworkIds);

      // Combine data
      return homework?.map(hw => ({
        ...hw,
        submission: submissions?.find(s => s.homework_id === hw.id),
      }));
    },
    enabled: !!selectedChild && !!enrollment?.class_id,
  });

  const getStatusBadge = (homework: any) => {
    const submission = homework.submission;
    const deadline = new Date(homework.deadline);
    const isOverdue = isPast(deadline);

    if (submission?.status === 'reviewed') {
      return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Reviewed</Badge>;
    }
    if (submission?.status === 'submitted' || submission?.status === 'late') {
      return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Submitted</Badge>;
    }
    if (isOverdue) {
      return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Overdue</Badge>;
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const stats = React.useMemo(() => {
    if (!homeworkData?.length) return { submitted: 0, pending: 0, reviewed: 0, total: 0 };
    return {
      submitted: homeworkData.filter(h => h.submission?.status === 'submitted' || h.submission?.status === 'late').length,
      pending: homeworkData.filter(h => !h.submission).length,
      reviewed: homeworkData.filter(h => h.submission?.status === 'reviewed').length,
      total: homeworkData.length,
    };
  }, [homeworkData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Homework Status</h1>
          <p className="text-muted-foreground">View your children's homework and submission status</p>
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
                      <p className="text-2xl font-bold">{stats.reviewed}</p>
                      <p className="text-sm text-muted-foreground">Reviewed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.submitted}</p>
                      <p className="text-sm text-muted-foreground">Submitted</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.pending}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Homework</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : homeworkData?.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No homework assigned yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {homeworkData?.map((hw) => (
                        <TableRow key={hw.id}>
                          <TableCell className="font-medium">{hw.title}</TableCell>
                          <TableCell>{hw.subject?.name}</TableCell>
                          <TableCell>{format(new Date(hw.deadline), 'PPP')}</TableCell>
                          <TableCell>{getStatusBadge(hw)}</TableCell>
                          <TableCell>{hw.submission?.grade || '-'}</TableCell>
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
