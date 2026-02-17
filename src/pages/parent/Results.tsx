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
import { Users, GraduationCap, Award, TrendingUp } from 'lucide-react';

export default function ParentResults() {
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

  const { data: results, isLoading } = useQuery({
    queryKey: ['parent-child-results', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exam:exams(
            name,
            total_marks,
            exam_date,
            subject:subjects(name),
            class:classes(name)
          )
        `)
        .eq('student_id', selectedChild)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedChild,
  });

  const stats = React.useMemo(() => {
    if (!results?.length) return { average: 0, highest: 0, lowest: 0, total: 0 };

    const percentages = results
      .filter(r => r.marks_obtained !== null && r.exam?.total_marks)
      .map(r => (r.marks_obtained! / r.exam!.total_marks!) * 100);

    if (!percentages.length) return { average: 0, highest: 0, lowest: 0, total: 0 };

    return {
      average: Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length),
      highest: Math.round(Math.max(...percentages)),
      lowest: Math.round(Math.min(...percentages)),
      total: results.length,
    };
  }, [results]);

  const getGradeBadge = (grade: string | null, percentage: number | null) => {
    if (grade) {
      const colors: Record<string, string> = {
        'A+': 'bg-green-500',
        'A': 'bg-green-500',
        'B+': 'bg-blue-500',
        'B': 'bg-blue-500',
        'C+': 'bg-yellow-500',
        'C': 'bg-yellow-500',
        'D': 'bg-orange-500',
        'F': 'bg-destructive',
      };
      return <Badge className={colors[grade] || 'bg-secondary'}>{grade}</Badge>;
    }

    if (percentage !== null) {
      if (percentage >= 90) return <Badge className="bg-green-500">Excellent</Badge>;
      if (percentage >= 75) return <Badge className="bg-blue-500">Good</Badge>;
      if (percentage >= 60) return <Badge className="bg-yellow-500">Average</Badge>;
      if (percentage >= 40) return <Badge className="bg-orange-500">Pass</Badge>;
      return <Badge variant="destructive">Fail</Badge>;
    }

    return <Badge variant="outline">-</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Exam Results</h1>
          <p className="text-muted-foreground">View your children's exam results and grades</p>
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
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.average}%</p>
                      <p className="text-sm text-muted-foreground">Average</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Award className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.highest}%</p>
                      <p className="text-sm text-muted-foreground">Highest</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.lowest}%</p>
                      <p className="text-sm text-muted-foreground">Lowest</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                      <p className="text-sm text-muted-foreground">Total Exams</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Exam Results</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : results?.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No exam results found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Marks</TableHead>
                        <TableHead>Grade</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results?.map((result) => {
                        const percentage = result.marks_obtained !== null && result.exam?.total_marks
                          ? (result.marks_obtained / result.exam.total_marks) * 100
                          : null;
                        return (
                          <TableRow key={result.id}>
                            <TableCell className="font-medium">{result.exam?.name}</TableCell>
                            <TableCell>{result.exam?.subject?.name}</TableCell>
                            <TableCell>
                              {result.exam?.exam_date 
                                ? format(new Date(result.exam.exam_date), 'PPP')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {result.marks_obtained !== null
                                ? `${result.marks_obtained}/${result.exam?.total_marks}`
                                : '-'}
                            </TableCell>
                            <TableCell>{getGradeBadge(result.grade, percentage)}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {result.remarks || '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })}
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
