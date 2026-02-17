import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, TrendingDown, CheckCircle, Clock, Landmark, Shield, ArrowRightLeft } from 'lucide-react';
import { Profile } from '@/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function AccountantDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Summary stats
  const [loanSummary, setLoanSummary] = useState({ totalLoaned: 0, totalRemaining: 0 });
  const [advanceSummary, setAdvanceSummary] = useState({ total: 0, pending: 0 });
  const [depositSummary, setDepositSummary] = useState({ totalDeposit: 0, collected: 0 });

  useEffect(() => { fetchTeachers(); fetchSummaries(); }, []);
  useEffect(() => { fetchPayrolls(); }, [selectedMonth, selectedYear]);

  const fetchTeachers = async () => {
    const [rolesRes, profilesRes] = await Promise.all([
      supabase.from('user_roles').select('user_id').eq('role', 'teacher'),
      supabase.from('profiles').select('*'),
    ]);
    const ids = rolesRes.data?.map(r => r.user_id) || [];
    setTeachers((profilesRes.data?.filter(p => ids.includes(p.user_id)) || []) as Profile[]);
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    const { data } = await supabase.from('teacher_payroll').select('*')
      .eq('month', selectedMonth).eq('year', parseInt(selectedYear))
      .order('created_at', { ascending: false });
    setPayrolls(data || []);
    setLoading(false);
  };

  const fetchSummaries = async () => {
    const [loansRes, advancesRes, depositsRes] = await Promise.all([
      supabase.from('teacher_loans').select('total_loan_amount, remaining_balance, status'),
      supabase.from('teacher_advances').select('amount, remaining_balance, status'),
      supabase.from('teacher_security_deposits').select('total_deposit, collected_amount, status'),
    ]);

    const loans = loansRes.data || [];
    setLoanSummary({
      totalLoaned: loans.reduce((s, l) => s + Number(l.total_loan_amount), 0),
      totalRemaining: loans.filter(l => l.status === 'active').reduce((s, l) => s + Number(l.remaining_balance), 0),
    });

    const advances = advancesRes.data || [];
    setAdvanceSummary({
      total: advances.reduce((s, a) => s + Number(a.amount), 0),
      pending: advances.filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.remaining_balance), 0),
    });

    const deposits = depositsRes.data || [];
    setDepositSummary({
      totalDeposit: deposits.reduce((s, d) => s + Number(d.total_deposit), 0),
      collected: deposits.reduce((s, d) => s + Number(d.collected_amount), 0),
    });
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('teacher_payroll').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: 'Marked as paid' });
    fetchPayrolls();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';

  const totalPayable = payrolls.reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);
  const totalDeductions = payrolls.reduce((s, p) => s + Number(p.total_deduction) + Number(p.security_deposit_deduction || 0) + Number(p.advance_deduction || 0) + Number(p.loan_deduction || 0), 0);
  const totalPaid = payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);
  const totalPending = payrolls.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Accountant Dashboard</h1>
          <p className="text-muted-foreground">Financial overview and payroll management</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
          <Input className="w-[90px]" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} />
        </div>
      </div>

      {/* Payroll Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><DollarSign className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">PKR {totalPayable.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Payroll</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><TrendingDown className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">PKR {totalDeductions.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Deductions</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">PKR {totalPaid.toLocaleString()}</p><p className="text-sm text-muted-foreground">Paid</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">PKR {totalPending.toLocaleString()}</p><p className="text-sm text-muted-foreground">Pending</p></div></CardContent></Card>
      </div>

      {/* Financial Summaries */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-2/10"><Landmark className="w-6 h-6 text-chart-2" /></div><div><p className="text-lg font-bold">PKR {loanSummary.totalRemaining.toLocaleString()}</p><p className="text-sm text-muted-foreground">Outstanding Loans</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-3/10"><ArrowRightLeft className="w-6 h-6 text-chart-3" /></div><div><p className="text-lg font-bold">PKR {advanceSummary.pending.toLocaleString()}</p><p className="text-sm text-muted-foreground">Pending Advances</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-chart-4/10"><Shield className="w-6 h-6 text-chart-4" /></div><div><p className="text-lg font-bold">PKR {depositSummary.collected.toLocaleString()}</p><p className="text-sm text-muted-foreground">Deposits Collected</p></div></CardContent></Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Payroll - {selectedMonth} {selectedYear}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Teacher</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Attendance Ded.</TableHead>
                <TableHead>Deposit Ded.</TableHead>
                <TableHead>Advance Ded.</TableHead>
                <TableHead>Loan Ded.</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : payrolls.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No payroll records for this month</TableCell></TableRow>
              ) : payrolls.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{getTeacherName(p.teacher_id)}</TableCell>
                  <TableCell>PKR {Number(p.monthly_salary).toLocaleString()}</TableCell>
                  <TableCell className="text-destructive">{Number(p.total_deduction) > 0 ? `PKR ${Number(p.total_deduction).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-destructive">{Number(p.security_deposit_deduction || 0) > 0 ? `PKR ${Number(p.security_deposit_deduction).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-destructive">{Number(p.advance_deduction || 0) > 0 ? `PKR ${Number(p.advance_deduction).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="text-destructive">{Number(p.loan_deduction || 0) > 0 ? `PKR ${Number(p.loan_deduction).toLocaleString()}` : '-'}</TableCell>
                  <TableCell className="font-bold">PKR {Number(p.net_salary || p.final_salary).toLocaleString()}</TableCell>
                  <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{p.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    {p.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => handleMarkPaid(p.id)}>Mark Paid</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
