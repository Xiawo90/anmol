import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isFuture, isPast, isToday } from 'date-fns';
import { CalendarDays, Clock, BookOpen, AlertCircle } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  exam_date: string | null;
  total_marks: number | null;
  subject: { name: string } | null;
  class: { name: string } | null;
}

export default function StudentExams() {
  const { user } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchExams();
    }
  }, [user]);

  const fetchExams = async () => {
    if (!user) return;
    
    setLoading(true);

    // First get student's enrolled classes
    const { data: enrollments } = await supabase
      .from('student_enrollments')
      .select('class_id')
      .eq('student_id', user.id);

    if (!enrollments || enrollments.length === 0) {
      setLoading(false);
      return;
    }

    const classIds = enrollments.map(e => e.class_id);

    // Then fetch exams for those classes
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id,
        name,
        exam_date,
        total_marks,
        subject:subjects(name),
        class:classes(name)
      `)
      .in('class_id', classIds)
      .order('exam_date', { ascending: true });

    if (!error && data) {
      setExams(data as Exam[]);
    }
    setLoading(false);
  };

  const getExamStatus = (examDate: string | null) => {
    if (!examDate) return { label: 'TBD', variant: 'outline' as const };
    
    const date = parseISO(examDate);
    if (isToday(date)) return { label: 'Today', variant: 'destructive' as const };
    if (isFuture(date)) return { label: 'Upcoming', variant: 'default' as const };
    return { label: 'Completed', variant: 'secondary' as const };
  };

  const upcomingExams = exams.filter(e => e.exam_date && (isFuture(parseISO(e.exam_date)) || isToday(parseISO(e.exam_date))));
  const pastExams = exams.filter(e => e.exam_date && isPast(parseISO(e.exam_date)) && !isToday(parseISO(e.exam_date)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">My Exams</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View your upcoming and past exams</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{exams.length}</p>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingExams.length}</p>
                  <p className="text-sm text-muted-foreground">Upcoming Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <BookOpen className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pastExams.length}</p>
                  <p className="text-sm text-muted-foreground">Completed Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <Card className="border-orange-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0" />
                <span>Upcoming Exams</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Marks</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingExams.map((exam) => {
                      const status = getExamStatus(exam.exam_date);
                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{exam.subject?.name || '-'}</Badge>
                          </TableCell>
                          <TableCell>{exam.class?.name || '-'}</TableCell>
                          <TableCell>
                            {exam.exam_date 
                              ? format(parseISO(exam.exam_date), 'MMM d, yyyy')
                              : 'TBD'}
                          </TableCell>
                          <TableCell className="text-right">{exam.total_marks || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Exams */}
        <Card>
          <CardHeader>
            <CardTitle>All Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : exams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exams scheduled yet</p>
                <p className="text-sm mt-2">Exams will appear here once scheduled by your teachers</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Total Marks</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => {
                      const status = getExamStatus(exam.exam_date);
                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">{exam.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{exam.subject?.name || '-'}</Badge>
                          </TableCell>
                          <TableCell>{exam.class?.name || '-'}</TableCell>
                          <TableCell>
                            {exam.exam_date 
                              ? format(parseISO(exam.exam_date), 'MMM d, yyyy')
                              : 'TBD'}
                          </TableCell>
                          <TableCell className="text-right">{exam.total_marks || '-'}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={status.variant}>{status.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
