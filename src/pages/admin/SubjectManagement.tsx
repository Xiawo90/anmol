import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import { Subject } from '@/types';

export default function SubjectManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', code: '', description: '' });

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast({ title: 'Error', description: 'Failed to fetch subjects', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from('subjects').insert({
        name: form.name,
        code: form.code || null,
        description: form.description || null,
        school_id: profile?.school_id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Subject created successfully' });
      setShowDialog(false);
      setForm({ name: '', code: '', description: '' });
      fetchSubjects();
    } catch (error) {
      console.error('Error creating subject:', error);
      toast({ title: 'Error', description: 'Failed to create subject', variant: 'destructive' });
    }
  };

  const handleUpdate = async () => {
    if (!editingSubject) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: form.name,
          code: form.code || null,
          description: form.description || null,
          school_id: profile?.school_id
        })
        .eq('id', editingSubject.id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Subject updated successfully' });
      setEditingSubject(null);
      setShowDialog(false);
      setForm({ name: '', code: '', description: '' });
      fetchSubjects();
    } catch (error) {
      console.error('Error updating subject:', error);
      toast({ title: 'Error', description: 'Failed to update subject', variant: 'destructive' });
    }
  };

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', subjectId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Subject deleted successfully' });
      fetchSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({ title: 'Error', description: 'Failed to delete subject', variant: 'destructive' });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subject Management</h1>
            <p className="text-muted-foreground">Manage all subjects in the school</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingSubject(null);
                setForm({ name: '', code: '', description: '' });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubject ? 'Edit Subject' : 'Create New Subject'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Subject Name</Label>
                  <Input
                    placeholder="e.g., Mathematics, English"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject Code (optional)</Label>
                  <Input
                    placeholder="e.g., MATH, ENG"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Brief description of the subject"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <Button
                  onClick={editingSubject ? handleUpdate : handleCreate}
                  className="w-full"
                >
                  {editingSubject ? 'Update Subject' : 'Create Subject'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <Card className="card-gradient">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{subjects.length}</p>
                <p className="text-sm text-muted-foreground">Total Subjects</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subjects Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      Loading subjects...
                    </TableCell>
                  </TableRow>
                ) : subjects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No subjects created yet. Click "Add Subject" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>{subject.code || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {subject.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setEditingSubject(subject);
                              setForm({
                                name: subject.name,
                                code: subject.code || '',
                                description: subject.description || ''
                              });
                              setShowDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
