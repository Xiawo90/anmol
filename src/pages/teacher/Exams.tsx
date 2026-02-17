import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Plus, GraduationCap, Trash2, Users, AlertCircle, Loader2, Pencil, X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface Exam {
  id: string;
  name: string;
  exam_date: string | null;
  total_marks: number;
  class_name: string;
  subject_name: string;
  results_count: number;
}

interface DraftExam {
  key: string;
  name: string;
  exam_date: string;
  total_marks: string;
  class_id: string;
}

const createDraft = (): DraftExam => ({
  key: crypto.randomUUID(),
  name: '',
  exam_date: '',
  total_marks: '100',
  class_id: '',
});

export default function TeacherExams() {
  const { user, isApproved } = useAuth();
  const { assignments: teacherClasses, isLoading: classesLoading, hasAssignments } = useTeacherAssignments();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isResultsDialogOpen, setIsResultsDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<Record<string, { marks: string; grade: string }>>({});
  const [showBatchCreator, setShowBatchCreator] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [draftExams, setDraftExams] = useState<DraftExam[]>([]);

  useEffect(() => {
    if (user && isApproved) {
      fetchExams();
    }
  }, [user, isApproved]);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select(`
          id, name, exam_date, total_marks, class_id, subject_id,
          classes:class_id (name),
          subjects:subject_id (name)
        `)
        .eq('created_by', user?.id)
        .order('exam_date', { ascending: false });

      if (error) throw error;

      const examsWithCounts = await Promise.all(
        (data || []).map(async (exam: any) => {
          const { count } = await supabase
            .from('exam_results')
            .select('*', { count: 'exact', head: true })
            .eq('exam_id', exam.id);

          return {
            id: exam.id,
            name: exam.name,
            exam_date: exam.exam_date,
            total_marks: exam.total_marks || 100,
            class_name: exam.classes?.name || 'Unknown',
            subject_name: exam.subjects?.name || 'Unknown',
            results_count: count || 0,
          };
        })
      );

      setExams(examsWithCounts);
    } catch (error) {
      console.error('Error fetching exams:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Batch creation
  const openBatchCreator = () => {
    setDraftExams([createDraft()]);
    setShowBatchCreator(true);
  };

  const addDraftRow = () => {
    setDraftExams(prev => [...prev, createDraft()]);
  };

  const updateDraft = (key: string, field: keyof DraftExam, value: string) => {
    setDraftExams(prev => prev.map(d => d.key === key ? { ...d, [field]: value } : d));
  };

  const removeDraft = (key: string) => {
    setDraftExams(prev => prev.filter(d => d.key !== key));
  };

  const saveBatch = async () => {
    const valid = draftExams.filter(d => d.name.trim() && d.class_id);
    if (valid.length === 0) {
      toast.error('Add at least one exam with a name and class');
      return;
    }

    setIsSavingBatch(true);
    try {
      const records = valid.map(d => {
        const assignment = teacherClasses.find(c => c.id === d.class_id);
        return {
          name: d.name.trim(),
          exam_date: d.exam_date || null,
          total_marks: parseInt(d.total_marks) || 100,
          class_id: assignment!.class_id,
          subject_id: assignment!.subject_id,
          created_by: user?.id,
        };
      });

      const { error } = await supabase.from('exams').insert(records);
      if (error) throw error;

      toast.success(`${records.length} exam(s) created successfully`);
      setShowBatchCreator(false);
      setDraftExams([]);
      fetchExams();
    } catch (error) {
      console.error('Error creating exams:', error);
      toast.error('Failed to create exams');
    } finally {
      setIsSavingBatch(false);
    }
  };

  const deleteExam = async (id: string) => {
    if (!confirm('Are you sure you want to delete this exam?')) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      toast.success('Exam deleted');
      fetchExams();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast.error('Failed to delete exam');
    }
  };

  const openResultsDialog = async (exam: Exam) => {
    setSelectedExam(exam);
    setIsResultsDialogOpen(true);
    setStudents([]);
    setResults({});

    try {
      const { data: examData } = await supabase
        .from('exams')
        .select('class_id')
        .eq('id', exam.id)
        .single();

      if (!examData) return;

      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('student_id, roll_number')
        .eq('class_id', examData.class_id);

      if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        return;
      }

      if (!enrollments || enrollments.length === 0) return;

      const studentIds = enrollments.map(e => e.student_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', studentIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

      setStudents(enrollments.map((e: any) => ({
        id: e.student_id,
        name: profileMap.get(e.student_id) || 'Unknown',
        roll_number: e.roll_number,
      })));

      const { data: existingResults } = await supabase
        .from('exam_results')
        .select('student_id, marks_obtained, grade')
        .eq('exam_id', exam.id);

      const resultsMap: Record<string, { marks: string; grade: string }> = {};
      (existingResults || []).forEach((r: any) => {
        resultsMap[r.student_id] = {
          marks: r.marks_obtained?.toString() || '',
          grade: r.grade || '',
        };
      });

      setResults(resultsMap);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const updateResult = (studentId: string, field: 'marks' | 'grade', value: string) => {
    setResults(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const saveResults = async () => {
    if (!selectedExam) return;
    try {
      await supabase.from('exam_results').delete().eq('exam_id', selectedExam.id);

      const records = students
        .filter(s => results[s.id]?.marks)
        .map(s => ({
          exam_id: selectedExam.id,
          student_id: s.id,
          marks_obtained: parseFloat(results[s.id].marks),
          grade: results[s.id].grade || null,
          entered_by: user?.id,
        }));

      if (records.length > 0) {
        const { error } = await supabase.from('exam_results').insert(records);
        if (error) throw error;
      }

      toast.success('Results saved');
      setIsResultsDialogOpen(false);
      fetchExams();
    } catch (error) {
      console.error('Error saving results:', error);
      toast.error('Failed to save results');
    }
  };

  if (!isApproved) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Your account is pending approval.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold">Exams</h1>
            <p className="text-sm text-muted-foreground">Create exams and manage results</p>
          </div>
          {!showBatchCreator && (
            <Button onClick={openBatchCreator} disabled={classesLoading || !hasAssignments}>
              <Plus className="mr-2 h-4 w-4" />
              Create Exams
            </Button>
          )}
        </div>

        {!classesLoading && !hasAssignments && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Classes Assigned</AlertTitle>
            <AlertDescription>
              You don't have any classes assigned yet. Please contact an administrator.
            </AlertDescription>
          </Alert>
        )}

        {/* Batch Creator */}
        {showBatchCreator && (
          <Card className="border-primary/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Create Exams
                  </CardTitle>
                  <CardDescription>Add multiple exams, edit them, then save all at once</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowBatchCreator(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Class & Subject *</TableHead>
                      <TableHead className="min-w-[160px]">Exam Name *</TableHead>
                      <TableHead className="min-w-[140px]">Date</TableHead>
                      <TableHead className="min-w-[90px]">Marks</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {draftExams.map((draft) => (
                      <TableRow key={draft.key}>
                        <TableCell className="p-2">
                          <Select
                            value={draft.class_id}
                            onValueChange={(v) => updateDraft(draft.key, 'class_id', v)}
                          >
                            <SelectTrigger className="h-9 text-xs sm:text-sm">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {teacherClasses.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.class_name} {c.section_name ? `- ${c.section_name}` : ''} ({c.subject_name})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-9 text-xs sm:text-sm"
                            placeholder="e.g., Mid-term"
                            value={draft.name}
                            onChange={(e) => updateDraft(draft.key, 'name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-9 text-xs sm:text-sm"
                            type="date"
                            value={draft.exam_date}
                            onChange={(e) => updateDraft(draft.key, 'exam_date', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            className="h-9 w-20 text-xs sm:text-sm"
                            type="number"
                            value={draft.total_marks}
                            onChange={(e) => updateDraft(draft.key, 'total_marks', e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeDraft(draft.key)}
                            disabled={draftExams.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" onClick={addDraftRow}>
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Row
                </Button>
                <Button onClick={saveBatch} disabled={isSavingBatch} size="sm">
                  {isSavingBatch ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3.5 w-3.5" />
                  )}
                  Save All ({draftExams.filter(d => d.name.trim() && d.class_id).length})
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Exams */}
        <Card>
          <CardHeader>
            <CardTitle>All Exams</CardTitle>
            <CardDescription>{exams.length} exams created</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : exams.length === 0 ? (
              <div className="text-center py-8">
                <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No exams created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Name</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Results</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">{exam.name}</TableCell>
                        <TableCell>{exam.class_name}</TableCell>
                        <TableCell>{exam.subject_name}</TableCell>
                        <TableCell>
                          {exam.exam_date ? format(new Date(exam.exam_date), 'PP') : '-'}
                        </TableCell>
                        <TableCell>{exam.total_marks}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{exam.results_count} entered</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openResultsDialog(exam)}>
                              <Users className="mr-1 h-4 w-4" />
                              Results
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => deleteExam(exam.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Dialog */}
        <Dialog open={isResultsDialogOpen} onOpenChange={setIsResultsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enter Results - {selectedExam?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No students enrolled in this class.
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Roll No.</TableHead>
                        <TableHead>Student Name</TableHead>
                        <TableHead>Marks (/{selectedExam?.total_marks})</TableHead>
                        <TableHead>Grade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.roll_number || '-'}</TableCell>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              max={selectedExam?.total_marks}
                              min={0}
                              className="w-20"
                              value={results[student.id]?.marks || ''}
                              onChange={(e) => updateResult(student.id, 'marks', e.target.value)}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              className="w-16"
                              placeholder="A+"
                              value={results[student.id]?.grade || ''}
                              onChange={(e) => updateResult(student.id, 'grade', e.target.value)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Button onClick={saveResults} className="w-full">Save Results</Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
