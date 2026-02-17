import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Shield, DollarSign, CheckCircle, Pencil, Search } from 'lucide-react';
import { Profile } from '@/types';

export default function SecurityDeposits() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ teacher_id: '', base_salary: '', deposit_percentage: '20', installment_amount: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [depRes, rolesRes, profilesRes] = await Promise.all([
      supabase.from('teacher_security_deposits').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('profiles').select('*'),
    ]);
    const ids = rolesRes.data?.map(r => r.user_id) || [];
    setTeachers((profilesRes.data?.filter(p => ids.includes(p.user_id)) || []) as Profile[]);
    setDeposits(depRes.data || []);
    setLoading(false);
  };

  const calcDeposit = () => {
    const base = parseFloat(form.base_salary) || 0;
    const pct = parseFloat(form.deposit_percentage) || 20;
    return Math.round(base * pct / 100);
  };

  const handleSave = async () => {
    const totalDeposit = calcDeposit();
    const payload: any = {
      teacher_id: form.teacher_id,
      school_id: profile?.school_id,
      base_salary: parseFloat(form.base_salary),
      deposit_percentage: parseFloat(form.deposit_percentage),
      total_deposit: totalDeposit,
      installment_amount: parseFloat(form.installment_amount) || 0,
    };
    let error;
    if (editId) {
      ({ error } = await supabase.from('teacher_security_deposits').update(payload).eq('id', editId));
    } else {
      payload.remaining_balance = totalDeposit;
      payload.collected_amount = 0;
      payload.status = 'active';
      ({ error } = await supabase.from('teacher_security_deposits').insert(payload));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: editId ? 'Deposit updated' : 'Security deposit created' });
    setShowDialog(false);
    setEditId(null);
    fetchData();
  };

  const openEdit = (r: any) => {
    setEditId(r.id);
    setForm({ teacher_id: r.teacher_id, base_salary: String(r.base_salary), deposit_percentage: String(r.deposit_percentage), installment_amount: String(r.installment_amount) });
    setShowDialog(true);
  };

  const openAdd = () => {
    setEditId(null);
    setForm({ teacher_id: '', base_salary: '', deposit_percentage: '20', installment_amount: '' });
    setShowDialog(true);
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';
  const activeDeposits = deposits.filter(d => d.status === 'active');
  const totalDeposit = deposits.reduce((s, d) => s + Number(d.total_deposit), 0);
  const totalCollected = deposits.reduce((s, d) => s + Number(d.collected_amount), 0);
  const totalRemaining = deposits.reduce((s, d) => s + Number(d.remaining_balance), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Security Deposits</h1>
            <p className="text-muted-foreground">Manage teacher security deposits (default 20%)</p>
          </div>
          <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Deposit</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><Shield className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{activeDeposits.length}</p><p className="text-sm text-muted-foreground">Active Deposits</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-2/10"><DollarSign className="w-6 h-6 text-chart-2" /></div><div><p className="text-2xl font-bold">PKR {totalDeposit.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Deposit</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">PKR {totalCollected.toLocaleString()}</p><p className="text-sm text-muted-foreground">Collected</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><DollarSign className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">PKR {totalRemaining.toLocaleString()}</p><p className="text-sm text-muted-foreground">Remaining</p></div></CardContent></Card>
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
                  <TableHead>Base Salary</TableHead>
                  <TableHead>Deposit %</TableHead>
                  <TableHead>Total Deposit</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : deposits.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No security deposit records</TableCell></TableRow>
                ) : deposits.filter(d => {
                  if (!searchTerm) return true;
                  const name = getTeacherName(d.teacher_id).toLowerCase();
                  const code = ((teachers.find(t => t.user_id === d.teacher_id) as any)?.teacher_code || '').toLowerCase();
                  return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
                }).map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{getTeacherName(d.teacher_id)}</TableCell>
                    <TableCell>PKR {Number(d.base_salary).toLocaleString()}</TableCell>
                    <TableCell>{d.deposit_percentage}%</TableCell>
                    <TableCell>PKR {Number(d.total_deposit).toLocaleString()}</TableCell>
                    <TableCell className="text-green-600 font-medium">PKR {Number(d.collected_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-yellow-600 font-medium">PKR {Number(d.remaining_balance).toLocaleString()}</TableCell>
                    <TableCell>PKR {Number(d.installment_amount).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={d.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{d.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openEdit(d)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
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
          <DialogHeader><DialogTitle>{editId ? 'Edit' : 'Add'} Security Deposit</DialogTitle></DialogHeader>
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
              <Label>Base Salary (PKR)</Label>
              <Input type="number" value={form.base_salary} onChange={e => setForm(f => ({ ...f, base_salary: e.target.value }))} placeholder="e.g., 30000" />
            </div>
            <div className="space-y-2">
              <Label>Deposit Percentage (%)</Label>
              <Input type="number" value={form.deposit_percentage} onChange={e => setForm(f => ({ ...f, deposit_percentage: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Monthly Installment (PKR)</Label>
              <Input type="number" value={form.installment_amount} onChange={e => setForm(f => ({ ...f, installment_amount: e.target.value }))} placeholder="Deducted each payroll" />
            </div>
            {form.base_salary && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <strong>Calculated Deposit:</strong> PKR {calcDeposit().toLocaleString()} ({form.deposit_percentage}% of PKR {parseFloat(form.base_salary || '0').toLocaleString()})
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.teacher_id || !form.base_salary}>{editId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
