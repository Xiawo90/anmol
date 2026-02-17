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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, DollarSign, Clock, CheckCircle, ArrowRightLeft, Search } from 'lucide-react';
import { Profile } from '@/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function AdvanceSalary() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [advances, setAdvances] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', amount: '', deduction_month: MONTHS[new Date().getMonth()], deduction_year: new Date().getFullYear().toString(), remarks: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [advRes, rolesRes, profilesRes] = await Promise.all([
      supabase.from('teacher_advances').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('profiles').select('*'),
    ]);
    const ids = rolesRes.data?.map(r => r.user_id) || [];
    setTeachers((profilesRes.data?.filter(p => ids.includes(p.user_id)) || []) as Profile[]);
    setAdvances(advRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.amount);
    const { error } = await supabase.from('teacher_advances').insert({
      teacher_id: form.teacher_id,
      school_id: profile?.school_id,
      amount,
      deduction_month: form.deduction_month,
      deduction_year: parseInt(form.deduction_year),
      remaining_balance: amount,
      status: 'approved',
      approved_by: user?.id,
      remarks: form.remarks || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: 'Advance approved and created' });
    setShowDialog(false);
    fetchData();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';

  const statusColor = (s: string) => {
    if (s === 'deducted') return 'default';
    if (s === 'approved') return 'secondary';
    if (s === 'carried_forward') return 'destructive';
    return 'outline';
  };

  const totalAdvances = advances.reduce((s, a) => s + Number(a.amount), 0);
  const totalDeducted = advances.reduce((s, a) => s + Number(a.deducted_amount), 0);
  const totalPending = advances.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.remaining_balance), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Advance Salary</h1>
            <p className="text-muted-foreground">Manage teacher salary advances</p>
          </div>
          <Button onClick={() => { setForm({ teacher_id: '', amount: '', deduction_month: MONTHS[new Date().getMonth()], deduction_year: new Date().getFullYear().toString(), remarks: '' }); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" />Grant Advance</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><DollarSign className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">PKR {totalAdvances.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Advances</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">PKR {totalDeducted.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Deducted</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">PKR {totalPending.toLocaleString()}</p><p className="text-sm text-muted-foreground">Pending Deduction</p></div></CardContent></Card>
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Deduction Month</TableHead>
                  <TableHead>Deducted</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : advances.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No advance records</TableCell></TableRow>
                ) : advances.filter(a => {
                  if (!searchTerm) return true;
                  const name = getTeacherName(a.teacher_id).toLowerCase();
                  const code = ((teachers.find(t => t.user_id === a.teacher_id) as any)?.teacher_code || '').toLowerCase();
                  return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
                }).map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{getTeacherName(a.teacher_id)}</TableCell>
                    <TableCell>PKR {Number(a.amount).toLocaleString()}</TableCell>
                    <TableCell>{a.deduction_month} {a.deduction_year}</TableCell>
                    <TableCell className="text-green-600 font-medium">PKR {Number(a.deducted_amount).toLocaleString()}</TableCell>
                    <TableCell className="text-yellow-600 font-medium">PKR {Number(a.remaining_balance).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={statusColor(a.status)} className="capitalize">{a.status.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="max-w-[150px] truncate">{a.remarks || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Grant Advance Salary</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <SearchableSelect
                options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
                value={form.teacher_id}
                onValueChange={v => setForm(f => ({ ...f, teacher_id: v }))}
                placeholder="Select teacher"
              />
            </div>
            <div className="space-y-2">
              <Label>Advance Amount (PKR)</Label>
              <Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g., 5000" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Deduction Month</Label>
                <Select value={form.deduction_month} onValueChange={v => setForm(f => ({ ...f, deduction_month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deduction Year</Label>
                <Input type="number" value={form.deduction_year} onChange={e => setForm(f => ({ ...f, deduction_year: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.teacher_id || !form.amount}>Approve & Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
