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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Landmark, DollarSign, CheckCircle, AlertTriangle, Search } from 'lucide-react';
import { Profile } from '@/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function LoanManagement() {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [loans, setLoans] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', total_loan_amount: '', installment_amount: '', start_month: MONTHS[new Date().getMonth()], start_year: new Date().getFullYear().toString(), remarks: '' });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [loanRes, rolesRes, profilesRes] = await Promise.all([
      supabase.from('teacher_loans').select('*').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('profiles').select('*'),
    ]);
    const ids = rolesRes.data?.map(r => r.user_id) || [];
    setTeachers((profilesRes.data?.filter(p => ids.includes(p.user_id)) || []) as Profile[]);
    setLoans(loanRes.data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    const total = parseFloat(form.total_loan_amount);
    const installment = parseFloat(form.installment_amount);
    const { error } = await supabase.from('teacher_loans').insert({
      teacher_id: form.teacher_id,
      school_id: profile?.school_id,
      total_loan_amount: total,
      remaining_balance: total,
      installment_amount: installment,
      start_month: form.start_month,
      start_year: parseInt(form.start_year),
      status: 'active',
      approved_by: user?.id,
      remarks: form.remarks || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: 'Loan created successfully' });
    setShowDialog(false);
    fetchData();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';

  const activeLoans = loans.filter(l => l.status === 'active');
  const totalLoaned = loans.reduce((s, l) => s + Number(l.total_loan_amount), 0);
  const totalRemaining = activeLoans.reduce((s, l) => s + Number(l.remaining_balance), 0);
  const totalRecovered = loans.reduce((s, l) => s + (Number(l.total_loan_amount) - Number(l.remaining_balance)), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Loan Management</h1>
            <p className="text-muted-foreground">Manage teacher loans with installment tracking</p>
          </div>
          <Button onClick={() => { setForm({ teacher_id: '', total_loan_amount: '', installment_amount: '', start_month: MONTHS[new Date().getMonth()], start_year: new Date().getFullYear().toString(), remarks: '' }); setShowDialog(true); }}><Plus className="h-4 w-4 mr-2" />Create Loan</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><Landmark className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{activeLoans.length}</p><p className="text-sm text-muted-foreground">Active Loans</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-2/10"><DollarSign className="w-6 h-6 text-chart-2" /></div><div><p className="text-2xl font-bold">PKR {totalLoaned.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Loaned</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">PKR {totalRecovered.toLocaleString()}</p><p className="text-sm text-muted-foreground">Recovered</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><AlertTriangle className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">PKR {totalRemaining.toLocaleString()}</p><p className="text-sm text-muted-foreground">Outstanding</p></div></CardContent></Card>
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
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Installment</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : loans.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No loan records</TableCell></TableRow>
                ) : loans.filter(l => {
                  if (!searchTerm) return true;
                  const name = getTeacherName(l.teacher_id).toLowerCase();
                  const code = ((teachers.find(t => t.user_id === l.teacher_id) as any)?.teacher_code || '').toLowerCase();
                  return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
                }).map(l => {
                  const paid = Number(l.total_loan_amount) - Number(l.remaining_balance);
                  const pct = Number(l.total_loan_amount) > 0 ? (paid / Number(l.total_loan_amount)) * 100 : 0;
                  const lowBalance = Number(l.remaining_balance) > 0 && Number(l.remaining_balance) < Number(l.installment_amount);
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{getTeacherName(l.teacher_id)}</TableCell>
                      <TableCell>PKR {Number(l.total_loan_amount).toLocaleString()}</TableCell>
                      <TableCell>PKR {Number(l.installment_amount).toLocaleString()}</TableCell>
                      <TableCell className={lowBalance ? 'text-destructive font-medium' : ''}>
                        PKR {Number(l.remaining_balance).toLocaleString()}
                        {lowBalance && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="flex items-center gap-2">
                          <Progress value={pct} className="flex-1" />
                          <span className="text-xs text-muted-foreground">{Math.round(pct)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{l.start_month} {l.start_year}</TableCell>
                      <TableCell><Badge variant={l.status === 'completed' ? 'default' : 'secondary'} className="capitalize">{l.status}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create New Loan</DialogTitle></DialogHeader>
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
              <Label>Total Loan Amount (PKR)</Label>
              <Input type="number" value={form.total_loan_amount} onChange={e => setForm(f => ({ ...f, total_loan_amount: e.target.value }))} placeholder="e.g., 50000" />
            </div>
            <div className="space-y-2">
              <Label>Monthly Installment (PKR)</Label>
              <Input type="number" value={form.installment_amount} onChange={e => setForm(f => ({ ...f, installment_amount: e.target.value }))} placeholder="e.g., 5000" />
            </div>
            {form.total_loan_amount && form.installment_amount && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <strong>Estimated Duration:</strong> {Math.ceil(parseFloat(form.total_loan_amount) / parseFloat(form.installment_amount))} months
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Month</Label>
                <Select value={form.start_month} onValueChange={v => setForm(f => ({ ...f, start_month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Start Year</Label>
                <Input type="number" value={form.start_year} onChange={e => setForm(f => ({ ...f, start_year: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Remarks (optional)</Label>
              <Textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.teacher_id || !form.total_loan_amount || !form.installment_amount}>Create Loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
