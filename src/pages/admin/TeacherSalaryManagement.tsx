import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, DollarSign, Users, TrendingUp, Pencil, Search } from 'lucide-react';
import { Profile } from '@/types';

export default function TeacherSalaryManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [salaries, setSalaries] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ teacher_id: '', monthly_salary: '', effective_from: new Date().toISOString().split('T')[0] });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [salRes, rolesRes, profilesRes] = await Promise.all([
      supabase.from('teacher_salaries').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('profiles').select('*'),
    ]);
    const teacherIds = rolesRes.data?.map(r => r.user_id) || [];
    setTeachers((profilesRes.data?.filter(p => teacherIds.includes(p.user_id)) || []) as Profile[]);
    setSalaries(salRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    const payload = {
      teacher_id: form.teacher_id,
      school_id: profile?.school_id,
      monthly_salary: parseFloat(form.monthly_salary),
      effective_from: form.effective_from,
      is_active: true,
    };
    let error;
    if (editId) {
      ({ error } = await supabase.from('teacher_salaries').update(payload).eq('id', editId));
    } else {
      ({ error } = await supabase.from('teacher_salaries').insert(payload));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: editId ? 'Salary updated' : 'Salary record created' });
    setShowDialog(false);
    setEditId(null);
    setForm({ teacher_id: '', monthly_salary: '', effective_from: new Date().toISOString().split('T')[0] });
    fetchData();
  };

  const openEdit = (record: any) => {
    setEditId(record.id);
    setForm({ teacher_id: record.teacher_id, monthly_salary: String(record.monthly_salary), effective_from: record.effective_from });
    setShowDialog(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ teacher_id: '', monthly_salary: '', effective_from: new Date().toISOString().split('T')[0] });
    setShowDialog(true);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from('teacher_salaries').update({ is_active: !current }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    fetchData();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';
  const activeSalaries = salaries.filter(s => s.is_active);
  const avgSalary = activeSalaries.length ? activeSalaries.reduce((s, r) => s + Number(r.monthly_salary), 0) / activeSalaries.length : 0;
  const totalExpense = activeSalaries.reduce((s, r) => s + Number(r.monthly_salary), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Teacher Salary Management</h1>
            <p className="text-muted-foreground">Manage teacher salary records</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Salary Record</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><Users className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{activeSalaries.length}</p><p className="text-sm text-muted-foreground">Teachers with Salary</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-2/10"><TrendingUp className="w-6 h-6 text-chart-2" /></div><div><p className="text-2xl font-bold">PKR {Math.round(avgSalary).toLocaleString()}</p><p className="text-sm text-muted-foreground">Average Salary</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-3/10"><DollarSign className="w-6 h-6 text-chart-3" /></div><div><p className="text-2xl font-bold">PKR {totalExpense.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Monthly Expense</p></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by teacher name or code..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : salaries.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No salary records</TableCell></TableRow>
                ) : salaries.filter(r => {
                  if (!searchTerm) return true;
                  const name = getTeacherName(r.teacher_id).toLowerCase();
                  const code = ((teachers.find(t => t.user_id === r.teacher_id) as any)?.teacher_code || '').toLowerCase();
                  return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
                }).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{getTeacherName(r.teacher_id)}</TableCell>
                    <TableCell>PKR {Number(r.monthly_salary).toLocaleString()}</TableCell>
                    <TableCell>{r.effective_from}</TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => toggleActive(r.id, r.is_active)}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Salary Record</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <SearchableSelect
                options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
                value={form.teacher_id}
                onValueChange={v => setForm(f => ({ ...f, teacher_id: v }))}
                placeholder="Select teacher"
                disabled={!!editId}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Salary (PKR)</Label>
              <Input type="number" placeholder="e.g., 30000" value={form.monthly_salary} onChange={e => setForm(f => ({ ...f, monthly_salary: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.teacher_id || !form.monthly_salary}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
