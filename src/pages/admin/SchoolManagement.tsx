import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Building2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SchoolData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export default function SchoolManagement() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '', email: '' });

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setSchools(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Error', description: 'School name is required', variant: 'destructive' });
      return;
    }
    setCreateLoading(true);
    try {
      const { error } = await supabase.from('schools').insert({
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      });
      if (error) throw error;
      toast({ title: 'Success', description: 'School created successfully' });
      setCreateOpen(false);
      setForm({ name: '', address: '', phone: '', email: '' });
      fetchSchools();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingSchool || !form.name.trim()) return;
    try {
      const { error } = await supabase.from('schools').update({
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
      }).eq('id', editingSchool.id);
      if (error) throw error;
      toast({ title: 'Success', description: 'School updated successfully' });
      setEditingSchool(null);
      setForm({ name: '', address: '', phone: '', email: '' });
      fetchSchools();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school?')) return;
    try {
      const { error } = await supabase.from('schools').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Success', description: 'School deleted' });
      fetchSchools();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const openEdit = (school: SchoolData) => {
    setEditingSchool(school);
    setForm({ name: school.name, address: school.address || '', phone: school.phone || '', email: school.email || '' });
  };

  const formFields = (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>School Name *</Label>
        <Input placeholder="Enter school name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input placeholder="School address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Phone</Label>
        <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" placeholder="School email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex-between-responsive">
          <div>
            <h1 className="page-title">School Management</h1>
            <p className="page-subtitle">Create and manage schools</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add School</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader><DialogTitle>Create New School</DialogTitle></DialogHeader>
              {formFields}
              <Button onClick={handleCreate} className="w-full" disabled={createLoading}>
                {createLoading ? 'Creating...' : 'Create School'}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Schools</CardTitle>
            <CardDescription>{schools.length} school(s) registered</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : schools.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No schools yet. Create your first school above.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Phone</TableHead>
                      <TableHead className="hidden sm:table-cell">Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schools.map((school) => (
                      <TableRow key={school.id}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">{school.email || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell">{school.phone || '-'}</TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(school.created_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(school)}>
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(school.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4" />
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

        {/* Edit Dialog */}
        <Dialog open={!!editingSchool} onOpenChange={(open) => { if (!open) setEditingSchool(null); }}>
          <DialogContent className="max-w-[90vw] sm:max-w-md">
            <DialogHeader><DialogTitle>Edit School</DialogTitle></DialogHeader>
            {formFields}
            <Button onClick={handleUpdate} className="w-full">Save Changes</Button>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
