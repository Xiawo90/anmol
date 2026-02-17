import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Users, Search } from 'lucide-react';
import { Class, Section, Profile } from '@/types';

interface StudentEnrollment {
  id: string;
  student_id: string;
  class_id: string;
  section_id: string | null;
  roll_number: string | null;
  academic_year: string | null;
  created_at: string;
}

export default function StudentEnrollments() {
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<StudentEnrollment[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [form, setForm] = useState({
    student_id: '',
    class_id: '',
    section_id: '',
    roll_number: '',
    academic_year: new Date().getFullYear().toString()
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollmentsRes, classesRes, sectionsRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('student_enrollments').select('*'),
        supabase.from('classes').select('*').order('grade_level'),
        supabase.from('sections').select('*'),
        supabase.from('profiles').select('*').eq('approval_status', 'approved'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'student')
      ]);

      if (enrollmentsRes.error) throw enrollmentsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const studentUserIds = rolesRes.data?.map(r => r.user_id) || [];
      const studentProfiles = profilesRes.data?.filter(p => studentUserIds.includes(p.user_id)) || [];

      setEnrollments(enrollmentsRes.data || []);
      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
      setStudents(studentProfiles);
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
      const { error } = await supabase.from('student_enrollments').insert({
        student_id: form.student_id,
        class_id: form.class_id,
        section_id: form.section_id || null,
        roll_number: form.roll_number || null,
        academic_year: form.academic_year
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Student enrolled successfully' });
      setShowDialog(false);
      setForm({
        student_id: '',
        class_id: '',
        section_id: '',
        roll_number: '',
        academic_year: new Date().getFullYear().toString()
      });
      fetchData();
    } catch (error) {
      console.error('Error creating enrollment:', error);
      toast({ title: 'Error', description: 'Failed to enroll student', variant: 'destructive' });
    }
  };

  const handleDelete = async (enrollmentId: string) => {
    if (!confirm('Are you sure you want to remove this enrollment?')) return;

    try {
      const { error } = await supabase.from('student_enrollments').delete().eq('id', enrollmentId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Enrollment removed' });
      fetchData();
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      toast({ title: 'Error', description: 'Failed to remove enrollment', variant: 'destructive' });
    }
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.user_id === studentId)?.full_name || 'Unknown';
  };

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || 'Unknown';
  };

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return '-';
    return sections.find(s => s.id === sectionId)?.name || 'Unknown';
  };

  const filteredSections = sections.filter(s => s.class_id === form.class_id);

  // Get students not enrolled yet
  const enrolledStudentIds = enrollments.map(e => e.student_id);
  const availableStudents = students.filter(s => !enrolledStudentIds.includes(s.user_id));

  const filteredEnrollments = enrollments.filter(enrollment => {
    const studentName = getStudentName(enrollment.student_id).toLowerCase();
    const matchesSearch = studentName.includes(searchTerm.toLowerCase());
    const matchesClass = classFilter === 'all' || enrollment.class_id === classFilter;
    return matchesSearch && matchesClass;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Student Enrollments</h1>
            <p className="text-muted-foreground">Enroll students in classes</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Enroll Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Student in Class</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableStudents.length === 0 ? (
                        <SelectItem value="no-students" disabled>No available students</SelectItem>
                      ) : (
                        availableStudents.map((student) => (
                          <SelectItem key={student.user_id} value={student.user_id}>
                            {student.full_name}
                          </SelectItem>
                        ))
                      )}
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
                    <Select value={form.section_id} onValueChange={(v) => setForm({ ...form, section_id: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
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
                  <Label>Roll Number (optional)</Label>
                  <Input
                    placeholder="e.g., 01, 15"
                    value={form.roll_number}
                    onChange={(e) => setForm({ ...form, roll_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    value={form.academic_year}
                    onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  className="w-full"
                  disabled={!form.student_id || !form.class_id}
                >
                  Enroll Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{enrollments.length}</p>
                <p className="text-sm text-muted-foreground">Total Enrollments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enrollments Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading enrollments...
                    </TableCell>
                  </TableRow>
                ) : filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {getStudentName(enrollment.student_id)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getClassName(enrollment.class_id)}</Badge>
                      </TableCell>
                      <TableCell>{getSectionName(enrollment.section_id)}</TableCell>
                      <TableCell>{enrollment.roll_number || '-'}</TableCell>
                      <TableCell>{enrollment.academic_year}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(enrollment.id)}
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
