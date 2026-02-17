import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Users, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Profile } from '@/types';

interface ParentStudent {
  id: string;
  parent_id: string;
  student_id: string;
  relationship: string | null;
  created_at: string;
}

const RELATIONSHIP_OPTIONS = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'guardian', label: 'Guardian' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
];

export default function ParentStudentManagement() {
  const { toast } = useToast();
  const [links, setLinks] = useState<ParentStudent[]>([]);
  const [parents, setParents] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({
    parent_id: '',
    student_id: '',
    relationship: 'parent',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [linksRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('parent_students').select('*'),
        supabase.from('profiles').select('*').eq('approval_status', 'approved'),
        supabase.from('user_roles').select('user_id, role'),
      ]);

      if (linksRes.error) throw linksRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const parentUserIds = rolesRes.data?.filter(r => r.role === 'parent').map(r => r.user_id) || [];
      const studentUserIds = rolesRes.data?.filter(r => r.role === 'student').map(r => r.user_id) || [];

      const parentProfiles = profilesRes.data?.filter(p => parentUserIds.includes(p.user_id)) || [];
      const studentProfiles = profilesRes.data?.filter(p => studentUserIds.includes(p.user_id)) || [];

      setLinks(linksRes.data || []);
      setParents(parentProfiles);
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
    // Check if link already exists
    const existingLink = links.find(
      l => l.parent_id === form.parent_id && l.student_id === form.student_id
    );
    if (existingLink) {
      toast({ title: 'Error', description: 'This parent-student link already exists', variant: 'destructive' });
      return;
    }

    try {
      const { error } = await supabase.from('parent_students').insert({
        parent_id: form.parent_id,
        student_id: form.student_id,
        relationship: form.relationship,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Parent linked to student successfully' });
      setShowDialog(false);
      setForm({ parent_id: '', student_id: '', relationship: 'parent' });
      fetchData();
    } catch (error) {
      console.error('Error creating link:', error);
      toast({ title: 'Error', description: 'Failed to link parent to student', variant: 'destructive' });
    }
  };

  const handleDelete = async (linkId: string) => {
    if (!confirm('Are you sure you want to remove this parent-student link?')) return;

    try {
      const { error } = await supabase.from('parent_students').delete().eq('id', linkId);
      if (error) throw error;

      toast({ title: 'Success', description: 'Link removed' });
      fetchData();
    } catch (error) {
      console.error('Error deleting link:', error);
      toast({ title: 'Error', description: 'Failed to remove link', variant: 'destructive' });
    }
  };

  const getParentName = (parentId: string) => {
    return parents.find(p => p.user_id === parentId)?.full_name || 'Unknown';
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.user_id === studentId)?.full_name || 'Unknown';
  };

  const getRelationshipLabel = (relationship: string | null) => {
    if (!relationship) return 'Parent';
    const option = RELATIONSHIP_OPTIONS.find(o => o.value === relationship);
    return option?.label || relationship.charAt(0).toUpperCase() + relationship.slice(1);
  };

  const filteredLinks = links.filter(link => {
    const parentName = getParentName(link.parent_id).toLowerCase();
    const studentName = getStudentName(link.student_id).toLowerCase();
    const search = searchTerm.toLowerCase();
    return parentName.includes(search) || studentName.includes(search);
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Parent-Student Links</h1>
            <p className="text-muted-foreground">Link parents with their children</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Link Parent to Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Link Parent to Student</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Parent</Label>
                  <Select value={form.parent_id} onValueChange={(v) => setForm({ ...form, parent_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent>
                      {parents.length === 0 ? (
                        <SelectItem value="no-parents" disabled>No parents available</SelectItem>
                      ) : (
                        parents.map((parent) => (
                          <SelectItem key={parent.user_id} value={parent.user_id}>
                            {parent.full_name} ({parent.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Student (Child)</Label>
                  <Select value={form.student_id} onValueChange={(v) => setForm({ ...form, student_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.length === 0 ? (
                        <SelectItem value="no-students" disabled>No students available</SelectItem>
                      ) : (
                        students.map((student) => (
                          <SelectItem key={student.user_id} value={student.user_id}>
                            {student.full_name} ({student.email})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Relationship</Label>
                  <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIP_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={handleCreate}
                  className="w-full"
                  disabled={!form.parent_id || !form.student_id}
                >
                  Link Parent to Student
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{links.length}</p>
                  <p className="text-sm text-muted-foreground">Total Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{parents.length}</p>
                  <p className="text-sm text-muted-foreground">Parents</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{students.length}</p>
                  <p className="text-sm text-muted-foreground">Students</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by parent or student name..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Links Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parent</TableHead>
                  <TableHead>Student (Child)</TableHead>
                  <TableHead>Relationship</TableHead>
                  <TableHead>Linked On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading links...
                    </TableCell>
                  </TableRow>
                ) : filteredLinks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No parent-student links found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLinks.map((link) => (
                    <TableRow key={link.id}>
                      <TableCell className="font-medium">
                        {getParentName(link.parent_id)}
                      </TableCell>
                      <TableCell>{getStudentName(link.student_id)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRelationshipLabel(link.relationship)}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(link.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(link.id)}
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
