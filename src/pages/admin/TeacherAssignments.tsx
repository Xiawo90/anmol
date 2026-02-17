import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, UserCheck } from 'lucide-react';
import { Class, Section, Subject, Profile, AppRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  created_at: string;
}

export default function TeacherAssignments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    teacher_id: '',
    class_id: '',
    section_id: '',
    subject_id: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [assignmentsRes, classesRes, sectionsRes, subjectsRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('teacher_assignments').select('*'),
        supabase.from('classes').select('*').order('grade_level'),
        supabase.from('sections').select('*'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('profiles').select('*').eq('approval_status', 'approved'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'teacher')
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const teacherUserIds = rolesRes.data?.map(r => r.user_id) || [];
      const teacherProfiles = profilesRes.data?.filter(p => teacherUserIds.includes(p.user_id)) || [];

      setAssignments(assignmentsRes.data || []);
      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTeachers(teacherProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from('teacher_assignments').insert({
        teacher_id: form.teacher_id,
        class_id: form.class_id,
        section_id: form.section_id || null,
        subject_id: form.subject_id,
        school_id: profile?.school_id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Teacher assigned successfully' });
      setShowDialog(false);
      setForm({ teacher_id: '', class_id: '', section_id: '', subject_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({ title: 'Error', description: 'Failed to assign teacher', variant: 'destructive' });
    }
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to remove this assignment?')) return;

    try {
      const { error } = await supabase.from('teacher_assignments').delete().eq('id', assignmentId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Assignment removed' });
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({ title: 'Error', description: 'Failed to remove assignment', variant: 'destructive' });
    }
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.user_id === teacherId)?.full_name || 'Unknown';
  };

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || 'Unknown';
  };

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return 'All Sections';
    return sections.find(s => s.id === sectionId)?.name || 'Unknown';
  };

  const getSubjectName = (subjectId: string) => {
    return subjects.find(s => s.id === subjectId)?.name || 'Unknown';
  };

  const filteredSections = sections.filter(s => s.class_id === form.class_id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Teacher Assignments</h1>
            <p className="text-muted-foreground">Assign teachers to classes and subjects</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => setForm({ teacher_id: '', class_id: '', section_id: '', subject_id: '' })}>
                <Plus className="h-4 w-4 mr-2" />
                Assign Teacher
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Teacher to Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select value={form.teacher_id} onValueChange={(v) => setForm({ ...form, teacher_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.user_id} value={teacher.user_id}>
                          {teacher.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v, section_id: '' })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.class_id && filteredSections.length > 0 && (
                  <div className="space-y-2">
                    <Label>Section (optional)</Label>
                    <Select value={form.section_id || "all"} onValueChange={(v) => setForm({ ...form, section_id: v === "all" ? "" : v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="All sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {filteredSections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject_id} onValueChange={(v) => setForm({ ...form, subject_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreate}
                  className="w-full"
                  disabled={!form.teacher_id || !form.class_id || !form.subject_id}
                >
                  Assign Teacher
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading assignments...
                    </TableCell>
                  </TableRow>
                ) : assignments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No assignments yet. Click "Assign Teacher" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {getTeacherName(assignment.teacher_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getClassName(assignment.class_id)}</Badge>
                      </TableCell>
                      <TableCell>{getSectionName(assignment.section_id)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getSubjectName(assignment.subject_id)}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
