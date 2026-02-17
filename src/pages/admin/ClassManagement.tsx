import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, GraduationCap, Layers } from 'lucide-react';
import { Class, Section } from '@/types';

export default function ClassManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [classes, setClasses] = useState<Class[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [showClassDialog, setShowClassDialog] = useState(false);
  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classForm, setClassForm] = useState({ name: '', grade_level: '' });
  const [sectionForm, setSectionForm] = useState({ name: '', class_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classesRes, sectionsRes] = await Promise.all([
        supabase.from('classes').select('*').order('grade_level', { ascending: true }),
        supabase.from('sections').select('*').order('name', { ascending: true })
      ]);

      if (classesRes.error) throw classesRes.error;
      if (sectionsRes.error) throw sectionsRes.error;

      setClasses(classesRes.data || []);
      setSections(sectionsRes.data || []);
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

  const handleCreateClass = async () => {
    try {
      const { error } = await supabase.from('classes').insert({
        name: classForm.name,
        grade_level: classForm.grade_level ? parseInt(classForm.grade_level) : null,
        school_id: profile?.school_id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Class created successfully' });
      setShowClassDialog(false);
      setClassForm({ name: '', grade_level: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating class:', error);
      toast({ title: 'Error', description: 'Failed to create class', variant: 'destructive' });
    }
  };

  const handleUpdateClass = async () => {
    if (!editingClass) return;

    try {
      const { error } = await supabase
        .from('classes')
        .update({
          name: classForm.name,
          grade_level: classForm.grade_level ? parseInt(classForm.grade_level) : null,
          school_id: profile?.school_id
        })
        .eq('id', editingClass.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Class updated successfully' });
      setEditingClass(null);
      setShowClassDialog(false);
      setClassForm({ name: '', grade_level: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating class:', error);
      toast({ title: 'Error', description: 'Failed to update class', variant: 'destructive' });
    }
  };

  const handleDeleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? This will also delete all sections, events, homework, attendance records, and other related data for this class.')) return;

    try {
      // Delete all related records first to avoid foreign key constraint errors
      await Promise.all([
        supabase.from('events').delete().eq('target_class_id', classId),
        supabase.from('homework').delete().eq('class_id', classId),
        supabase.from('attendance').delete().eq('class_id', classId),
        supabase.from('exams').delete().eq('class_id', classId),
        supabase.from('study_materials').delete().eq('class_id', classId),
        supabase.from('timetable').delete().eq('class_id', classId),
        supabase.from('teacher_assignments').delete().eq('class_id', classId),
        supabase.from('student_enrollments').delete().eq('class_id', classId),
        supabase.from('announcements').delete().eq('target_class_id', classId),
        supabase.from('sections').delete().eq('class_id', classId),
      ]);

      // Now delete the class itself
      const { error } = await supabase.from('classes').delete().eq('id', classId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Class and all related data deleted successfully' });
      fetchData();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({ title: 'Error', description: 'Failed to delete class. Some related records may still exist.', variant: 'destructive' });
    }
  };

  const handleCreateSection = async () => {
    if (!selectedClassId) return;

    try {
      const { error } = await supabase.from('sections').insert({
        name: sectionForm.name,
        class_id: selectedClassId,
        school_id: profile?.school_id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Section created successfully' });
      setShowSectionDialog(false);
      setSectionForm({ name: '', class_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating section:', error);
      toast({ title: 'Error', description: 'Failed to create section', variant: 'destructive' });
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase.from('sections').delete().eq('id', sectionId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Section deleted successfully' });
      fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast({ title: 'Error', description: 'Failed to delete section', variant: 'destructive' });
    }
  };

  const getSectionsForClass = (classId: string) => {
    return sections.filter(s => s.class_id === classId);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Class Management</h1>
            <p className="text-muted-foreground">Manage classes and sections</p>
          </div>
          <Dialog open={showClassDialog} onOpenChange={setShowClassDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingClass(null);
                setClassForm({ name: '', grade_level: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingClass ? 'Edit Class' : 'Create New Class'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input
                    placeholder="e.g., Class 1, Grade 5"
                    value={classForm.name}
                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade Level (optional)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 1, 2, 3"
                    value={classForm.grade_level}
                    onChange={(e) => setClassForm({ ...classForm, grade_level: e.target.value })}
                  />
                </div>
                <Button
                  onClick={editingClass ? handleUpdateClass : handleCreateClass}
                  className="w-full"
                >
                  {editingClass ? 'Update Class' : 'Create Class'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{classes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Classes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Layers className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">{sections.length}</p>
                  <p className="text-sm text-muted-foreground">Total Sections</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                Loading classes...
              </CardContent>
            </Card>
          ) : classes.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center text-muted-foreground">
                No classes created yet. Click "Add Class" to create one.
              </CardContent>
            </Card>
          ) : (
            classes.map((cls) => (
              <Card key={cls.id} className="card-gradient hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setEditingClass(cls);
                          setClassForm({
                            name: cls.name,
                            grade_level: cls.grade_level?.toString() || ''
                          });
                          setShowClassDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleDeleteClass(cls.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {cls.grade_level && (
                    <Badge variant="outline">Grade {cls.grade_level}</Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Sections</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedClassId(cls.id);
                          setSectionForm({ name: '', class_id: cls.id });
                          setShowSectionDialog(true);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {getSectionsForClass(cls.id).map((section) => (
                        <Badge
                          key={section.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {section.name}
                          <button
                            onClick={() => handleDeleteSection(section.id)}
                            className="ml-1 hover:text-destructive"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                      {getSectionsForClass(cls.id).length === 0 && (
                        <span className="text-xs text-muted-foreground">No sections</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Section Dialog */}
        <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Section</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Section Name</Label>
                <Input
                  placeholder="e.g., A, B, C"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                />
              </div>
              <Button onClick={handleCreateSection} className="w-full">
                Create Section
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
