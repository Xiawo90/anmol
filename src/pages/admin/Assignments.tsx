import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ClipboardList, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  created_at: string;
}

interface Profile {
  user_id: string;
  full_name: string;
}

interface Class {
  id: string;
  name: string;
}

interface Section {
  id: string;
  name: string;
  class_id: string;
}

interface Subject {
  id: string;
  name: string;
}

export default function Assignments() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    teacher_id: '',
    class_id: '',
    section_id: '',
    subject_id: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all data in parallel
      const [assignmentsRes, classesRes, sectionsRes, subjectsRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('teacher_assignments').select('*').order('created_at', { ascending: false }),
        supabase.from('classes').select('*').order('name'),
        supabase.from('sections').select('*').order('name'),
        supabase.from('subjects').select('*').order('name'),
        supabase.from('profiles').select('user_id, full_name'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'teacher'),
      ]);

      if (assignmentsRes.error) throw assignmentsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      // Filter profiles to only teachers
      const teacherUserIds = new Set(rolesRes.data?.map(r => r.user_id) || []);
      const teacherProfiles = profilesRes.data?.filter(p => teacherUserIds.has(p.user_id)) || [];

      setAssignments(assignmentsRes.data || []);
      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTeachers(teacherProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('teacher_assignments').insert({
        teacher_id: formData.teacher_id,
        class_id: formData.class_id,
        section_id: formData.section_id || null,
        subject_id: formData.subject_id,
        school_id: profile?.school_id,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Assignment created successfully' });
      setIsDialogOpen(false);
      setFormData({ teacher_id: '', class_id: '', section_id: '', subject_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase.from('teacher_assignments').delete().eq('id', id);
      if (error) throw error;

      toast({ title: 'Success', description: 'Assignment deleted successfully' });
      fetchData();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        variant: 'destructive',
      });
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

  const filteredSections = sections.filter(s => s.class_id === formData.class_id);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Teacher Assignments</h1>
            <p className="text-muted-foreground">Assign teachers to classes and subjects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Teacher</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Teacher</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                  >
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
                  <Select
                    value={formData.class_id}
                    onValueChange={(value) => setFormData({ ...formData, class_id: value, section_id: '' })}
                  >
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
                <div className="space-y-2">
                  <Label>Section (Optional)</Label>
                  <Select
                    value={formData.section_id || "__all__"}
                    onValueChange={(value) => setFormData({ ...formData, section_id: value === "__all__" ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">All Sections</SelectItem>
                      {filteredSections.map((section) => (
                        <SelectItem key={section.id} value={section.id}>
                          {section.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
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
                <Button type="submit" className="w-full" disabled={!formData.teacher_id || !formData.class_id || !formData.subject_id}>
                  Create Assignment
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
              <ClipboardList className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Teachers</CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(assignments.map(a => a.teacher_id)).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>All Assignments</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Assigned On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No assignments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">{getTeacherName(assignment.teacher_id)}</TableCell>
                        <TableCell>{getClassName(assignment.class_id)}</TableCell>
                        <TableCell>{getSectionName(assignment.section_id)}</TableCell>
                        <TableCell>{getSubjectName(assignment.subject_id)}</TableCell>
                        <TableCell>{new Date(assignment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(assignment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
