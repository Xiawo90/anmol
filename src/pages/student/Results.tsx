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
import { format, parseISO } from 'date-fns';
import { Trophy, TrendingUp, Award, BookOpen } from 'lucide-react';

interface ExamResult {
  id: string;
  marks_obtained: number | null;
  grade: string | null;
  remarks: string | null;
  exam: {
    name: string;
    total_marks: number;
    exam_date: string | null;
    subject: { name: string } | null;
  } | null;
}

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalExams: 0,
    averagePercentage: 0,
    highestScore: 0,
    passedExams: 0,
  });

  useEffect(() => {
    if (user) {
      fetchResults();
    }
  }, [user]);

  const fetchResults = async () => {
    if (!user) return;
    
    setLoading(true);

    const { data, error } = await supabase
      .from('exam_results')
      .select(`
        *,
        exam:exams(
          name,
          total_marks,
          exam_date,
          subject:subjects(name)
        )
      `)
      .eq('student_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setResults(data as ExamResult[]);
      
      // Calculate stats
      const validResults = data.filter(r => r.marks_obtained !== null && r.exam?.total_marks);
      const totalExams = validResults.length;
      
      if (totalExams > 0) {
        const percentages = validResults.map(r => 
          (r.marks_obtained! / r.exam!.total_marks) * 100
        );
        const averagePercentage = Math.round(percentages.reduce((a, b) => a + b, 0) / totalExams);
        const highestScore = Math.round(Math.max(...percentages));
        const passedExams = percentages.filter(p => p >= 40).length;
        
        setStats({ totalExams, averagePercentage, highestScore, passedExams });
      }
    }
    setLoading(false);
  };

  const getGradeBadge = (grade: string | null, percentage: number) => {
    if (grade) {
      const gradeColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        'A+': 'default',
        'A': 'default',
        'B+': 'secondary',
        'B': 'secondary',
        'C+': 'outline',
        'C': 'outline',
        'D': 'destructive',
        'F': 'destructive',
      };
      return <Badge variant={gradeColors[grade] || 'outline'}>{grade}</Badge>;
    }
    
    // Calculate grade from percentage
    if (percentage >= 90) return <Badge variant="default">A+</Badge>;
    if (percentage >= 80) return <Badge variant="default">A</Badge>;
    if (percentage >= 70) return <Badge variant="secondary">B+</Badge>;
    if (percentage >= 60) return <Badge variant="secondary">B</Badge>;
    if (percentage >= 50) return <Badge variant="outline">C</Badge>;
    if (percentage >= 40) return <Badge variant="outline">D</Badge>;
    return <Badge variant="destructive">F</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">My Results</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View your exam results and performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalExams}</p>
                  <p className="text-sm text-muted-foreground">Total Exams</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.averagePercentage}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.highestScore}%</p>
                  <p className="text-sm text-muted-foreground">Highest Score</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Award className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.passedExams}</p>
                  <p className="text-sm text-muted-foreground">Exams Passed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Results</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No exam results yet</p>
                <p className="text-sm mt-2">Your results will appear here once exams are graded</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead className="text-right">Percentage</TableHead>
                      <TableHead className="text-center">Grade</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => {
                      const percentage = result.exam?.total_marks && result.marks_obtained !== null
                        ? Math.round((result.marks_obtained / result.exam.total_marks) * 100)
                        : 0;
                      
                      return (
                        <TableRow key={result.id}>
                          <TableCell className="font-medium">{result.exam?.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{result.exam?.subject?.name}</Badge>
                          </TableCell>
                          <TableCell>
                            {result.exam?.exam_date 
                              ? format(parseISO(result.exam.exam_date), 'MMM d, yyyy')
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {result.marks_obtained !== null 
                              ? `${result.marks_obtained}/${result.exam?.total_marks}`
                              : '-'}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {percentage}%
                          </TableCell>
                          <TableCell className="text-center">
                            {getGradeBadge(result.grade, percentage)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {result.remarks || '-'}
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
