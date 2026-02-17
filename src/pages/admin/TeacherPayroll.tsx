import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, CheckCircle, Clock, TrendingDown, Loader2, Lock, FileText, Search } from 'lucide-react';
import { getDaysInMonth, getDay } from 'date-fns';
import { Profile } from '@/types';
import { generatePayrollPDF, PayrollRecord } from '@/lib/payroll-pdf';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function TeacherPayroll() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedMonth, setSelectedMonth] = useState(MONTHS[new Date().getMonth()]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  useEffect(() => { fetchTeachers(); }, []);
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
    const { data } = await supabase.from('teacher_payroll').select('*').eq('month', selectedMonth).eq('year', parseInt(selectedYear)).order('created_at', { ascending: false });
    setPayrolls(data || []);
    setLoading(false);
  };

  const getWorkingDays = (year: number, monthIdx: number) => {
    const totalDays = getDaysInMonth(new Date(year, monthIdx));
    let working = 0;
    for (let d = 1; d <= totalDays; d++) {
      const day = getDay(new Date(year, monthIdx, d));
      if (day !== 0) working++;
    }
    return working;
  };

  const handleGenerate = async () => {
    if (!profile?.school_id) return;

    const { data: existingPayroll } = await supabase.from('teacher_payroll').select('is_locked').eq('school_id', profile.school_id).eq('month', selectedMonth).eq('year', parseInt(selectedYear)).limit(1);
    if (existingPayroll?.some(p => p.is_locked)) {
      toast({ title: 'Locked', description: 'Payroll for this month is already locked. Cannot regenerate.', variant: 'destructive' });
      return;
    }

    setGenerating(true);
    try {
      const { data: settings } = await supabase.from('school_attendance_settings').select('*').eq('school_id', profile.school_id).maybeSingle();
      const calcType = settings?.salary_calculation_type || 'calendar_days';

      const { data: salaries } = await supabase.from('teacher_salaries').select('*').eq('school_id', profile.school_id).eq('is_active', true);
      if (!salaries?.length) {
        toast({ title: 'No Data', description: 'No active salary records found', variant: 'destructive' });
        setGenerating(false);
        return;
      }

      const year = parseInt(selectedYear);
      const monthIdx = MONTHS.indexOf(selectedMonth);
      const totalDays = calcType === 'working_days' ? getWorkingDays(year, monthIdx) : getDaysInMonth(new Date(year, monthIdx));
      const startDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${getDaysInMonth(new Date(year, monthIdx))}`;

      const [depositsRes, advancesRes, loansRes] = await Promise.all([
        supabase.from('teacher_security_deposits').select('*').eq('school_id', profile.school_id).eq('status', 'active'),
        supabase.from('teacher_advances').select('*').eq('school_id', profile.school_id).eq('status', 'approved').eq('deduction_month', selectedMonth).eq('deduction_year', year),
        supabase.from('teacher_loans').select('*').eq('school_id', profile.school_id).eq('status', 'active'),
      ]);

      const depositsMap = new Map((depositsRes.data || []).map(d => [d.teacher_id, d]));
      const advancesMap = new Map<string, any[]>();
      (advancesRes.data || []).forEach(a => {
        if (!advancesMap.has(a.teacher_id)) advancesMap.set(a.teacher_id, []);
        advancesMap.get(a.teacher_id)!.push(a);
      });
      const loansMap = new Map<string, any[]>();
      (loansRes.data || []).forEach(l => {
        if (!loansMap.has(l.teacher_id)) loansMap.set(l.teacher_id, []);
        loansMap.get(l.teacher_id)!.push(l);
      });

      // Fetch previous month's unpaid payroll for salary rollover
      const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1;
      const prevYear = monthIdx === 0 ? year - 1 : year;
      const { data: prevPayrolls } = await supabase.from('teacher_payroll').select('*')
        .eq('school_id', profile.school_id)
        .eq('month', MONTHS[prevMonthIdx])
        .eq('year', prevYear)
        .eq('status', 'pending');
      
      const unpaidMap = new Map<string, number>();
      (prevPayrolls || []).forEach(p => {
        unpaidMap.set(p.teacher_id, Number(p.net_salary || p.final_salary));
      });

      const records = [];
      for (const sal of salaries) {
        const { count } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true })
          .eq('teacher_id', sal.teacher_id).eq('is_deductible', true).gte('date', startDate).lte('date', endDate);

        const deductible = count || 0;
        const monthlySalary = Number(sal.monthly_salary);
        const carryForward = unpaidMap.get(sal.teacher_id) || 0;
        const grossSalary = monthlySalary + carryForward;
        const perDay = monthlySalary / totalDays;
        const attendanceDeduction = perDay * deductible;

        const deposit = depositsMap.get(sal.teacher_id);
        let depositDeduction = 0;
        if (deposit && Number(deposit.remaining_balance) > 0) {
          depositDeduction = Math.min(Number(deposit.installment_amount), Number(deposit.remaining_balance));
        }

        const teacherAdvances = advancesMap.get(sal.teacher_id) || [];
        let advanceDeduction = 0;
        for (const adv of teacherAdvances) {
          advanceDeduction += Number(adv.remaining_balance);
        }

        const teacherLoans = loansMap.get(sal.teacher_id) || [];
        let loanDeduction = 0;
        for (const loan of teacherLoans) {
          const installment = Math.min(Number(loan.installment_amount), Number(loan.remaining_balance));
          loanDeduction += installment;
        }

        const totalAllDeductions = attendanceDeduction + depositDeduction + advanceDeduction + loanDeduction;
        const netSalary = grossSalary - totalAllDeductions;

        records.push({
          teacher_id: sal.teacher_id,
          school_id: profile.school_id,
          month: selectedMonth,
          year,
          monthly_salary: monthlySalary,
          total_days_in_month: totalDays,
          deductible_absences: deductible,
          per_day_salary: Math.round(perDay * 100) / 100,
          total_deduction: Math.round(attendanceDeduction * 100) / 100,
          final_salary: Math.round((grossSalary - attendanceDeduction) * 100) / 100,
          security_deposit_deduction: Math.round(depositDeduction * 100) / 100,
          advance_deduction: Math.round(advanceDeduction * 100) / 100,
          loan_deduction: Math.round(loanDeduction * 100) / 100,
          gross_salary: Math.round(grossSalary * 100) / 100,
          net_salary: Math.round(netSalary * 100) / 100,
          status: 'pending',
          is_locked: true,
        });
      }

      const { error } = await supabase.from('teacher_payroll').upsert(records, { onConflict: 'teacher_id,month,year' });
      if (error) throw error;

      // Update deposits, advances, loans balances
      for (const sal of salaries) {
        const deposit = depositsMap.get(sal.teacher_id);
        if (deposit && Number(deposit.remaining_balance) > 0) {
          const deducted = Math.min(Number(deposit.installment_amount), Number(deposit.remaining_balance));
          const newCollected = Number(deposit.collected_amount) + deducted;
          const newRemaining = Number(deposit.total_deposit) - newCollected;
          await supabase.from('teacher_security_deposits').update({
            collected_amount: newCollected,
            remaining_balance: Math.max(newRemaining, 0),
            status: newRemaining <= 0 ? 'completed' : 'active',
          }).eq('id', deposit.id);
        }

        const teacherAdvances = advancesMap.get(sal.teacher_id) || [];
        for (const adv of teacherAdvances) {
          await supabase.from('teacher_advances').update({
            deducted_amount: Number(adv.amount),
            remaining_balance: 0,
            status: 'deducted',
          }).eq('id', adv.id);
        }

        const teacherLoans = loansMap.get(sal.teacher_id) || [];
        for (const loan of teacherLoans) {
          const installment = Math.min(Number(loan.installment_amount), Number(loan.remaining_balance));
          const newBalance = Number(loan.remaining_balance) - installment;
          await supabase.from('teacher_loans').update({
            remaining_balance: Math.max(newBalance, 0),
            status: newBalance <= 0 ? 'completed' : 'active',
          }).eq('id', loan.id);
        }
      }

      toast({ title: 'Success', description: `Payroll generated for ${records.length} teachers with all deductions applied` });
      fetchPayrolls();

      // Auto-download PDF
      const pdfRecords: PayrollRecord[] = records.map(r => ({
        teacher_name: getTeacherName(r.teacher_id),
        monthly_salary: r.gross_salary,
        total_days_in_month: r.total_days_in_month,
        deductible_absences: r.deductible_absences,
        total_deduction: r.total_deduction,
        security_deposit_deduction: r.security_deposit_deduction,
        advance_deduction: r.advance_deduction,
        loan_deduction: r.loan_deduction,
        net_salary: r.net_salary,
        status: r.status,
      }));
      generatePayrollPDF(pdfRecords, selectedMonth, selectedYear);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdfRecords: PayrollRecord[] = payrolls.map(p => ({
      teacher_name: getTeacherName(p.teacher_id),
      monthly_salary: Number(p.gross_salary || p.monthly_salary),
      total_days_in_month: p.total_days_in_month,
      deductible_absences: p.deductible_absences,
      total_deduction: Number(p.total_deduction),
      security_deposit_deduction: Number(p.security_deposit_deduction || 0),
      advance_deduction: Number(p.advance_deduction || 0),
      loan_deduction: Number(p.loan_deduction || 0),
      net_salary: Number(p.net_salary || p.final_salary),
      status: p.status,
    }));
    generatePayrollPDF(pdfRecords, selectedMonth, selectedYear);
  };

  const handleMarkPaid = async (id: string) => {
    const { error } = await supabase.from('teacher_payroll').update({ status: 'paid', paid_date: new Date().toISOString().split('T')[0] }).eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Success', description: 'Marked as paid' });
    fetchPayrolls();
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';
  const getTeacherCode = (id: string) => (teachers.find(t => t.user_id === id) as any)?.teacher_code || '';
  const isLocked = payrolls.some(p => p.is_locked);

  const filteredPayrolls = payrolls.filter(p => {
    if (!searchTerm) return true;
    const name = getTeacherName(p.teacher_id).toLowerCase();
    const code = getTeacherCode(p.teacher_id).toLowerCase();
    const term = searchTerm.toLowerCase();
    return name.includes(term) || code.includes(term);
  });

  const totalPayable = payrolls.reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);
  const totalDeductions = payrolls.reduce((s, p) => s + Number(p.total_deduction) + Number(p.security_deposit_deduction || 0) + Number(p.advance_deduction || 0) + Number(p.loan_deduction || 0), 0);
  const totalPaid = payrolls.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);
  const totalPending = payrolls.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.net_salary || p.final_salary), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Payroll Management</h1>
            <p className="text-muted-foreground">Generate and manage teacher payroll with full deduction breakdown</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <SearchableSelect
              options={MONTHS.map(m => ({ value: m, label: m }))}
              value={selectedMonth}
              onValueChange={setSelectedMonth}
              placeholder="Month"
              className="w-[140px]"
            />
            <Input className="w-[90px]" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} />
            {payrolls.length > 0 && (
              <Button variant="outline" onClick={handleDownloadPDF}>
                <FileText className="h-4 w-4 mr-2" />PDF
              </Button>
            )}
            <Button onClick={handleGenerate} disabled={generating || isLocked}>
              {generating ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</> : isLocked ? <><Lock className="h-4 w-4 mr-2" />Locked</> : 'Generate Payroll'}
            </Button>
          </div>
        </div>

        {isLocked && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium text-sm">🔒 Payroll for {selectedMonth} {selectedYear} is locked. Attendance and payroll cannot be modified.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><DollarSign className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">PKR {totalPayable.toLocaleString()}</p><p className="text-sm text-muted-foreground">Net Payable</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><TrendingDown className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">PKR {totalDeductions.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Deductions</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">PKR {totalPaid.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Paid</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><Clock className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">PKR {totalPending.toLocaleString()}</p><p className="text-sm text-muted-foreground">Total Pending</p></div></CardContent></Card>
        </div>

        {/* Search */}
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Gross Salary</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Absent Ded.</TableHead>
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
                    <TableRow><TableCell colSpan={10} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : filteredPayrolls.length === 0 ? (
                    <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No payroll records. Click "Generate Payroll" to calculate.</TableCell></TableRow>
                  ) : filteredPayrolls.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{getTeacherName(p.teacher_id)}</span>
                          {getTeacherCode(p.teacher_id) && <span className="text-xs text-muted-foreground ml-1">({getTeacherCode(p.teacher_id)})</span>}
                        </div>
                      </TableCell>
                      <TableCell>PKR {Number(p.gross_salary || p.monthly_salary).toLocaleString()}</TableCell>
                      <TableCell>{p.deductible_absences > 0 ? <Badge variant="destructive">{p.deductible_absences} ded.</Badge> : <span className="text-muted-foreground">{p.total_days_in_month}</span>}</TableCell>
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
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
