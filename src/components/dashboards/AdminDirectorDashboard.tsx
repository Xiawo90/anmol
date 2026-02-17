import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { Building2, DollarSign, Users, GraduationCap, TrendingUp, Shield, Landmark, ArrowRightLeft } from 'lucide-react';

interface School {
  id: string;
  name: string;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdminDirectorDashboard() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [stats, setStats] = useState({ totalStudents: 0, totalTeachers: 0, totalFeeCollected: 0, totalFeePending: 0, totalSalaryPaid: 0, totalSalaryPending: 0, totalSalaryDeductions: 0, totalLoansOutstanding: 0, totalAdvancesPending: 0, totalDepositsCollected: 0 });
  const [feeByMonth, setFeeByMonth] = useState<any[]>([]);
  const [feeByMethod, setFeeByMethod] = useState<any[]>([]);
  const [schoolPerformance, setSchoolPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchData();
  }, [selectedSchoolId]);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    if (data) setSchools(data);
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchFeeData(), fetchSchoolPerformance()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    // Students count
    let studentQuery = supabase.from('student_enrollments').select('id', { count: 'exact', head: true });
    if (selectedSchoolId !== 'all') studentQuery = studentQuery.eq('school_id', selectedSchoolId);
    const { count: studentCount } = await studentQuery;

    // Teachers count
    let teacherQuery = supabase.from('teacher_assignments').select('teacher_id', { count: 'exact', head: true });
    if (selectedSchoolId !== 'all') teacherQuery = teacherQuery.eq('school_id', selectedSchoolId);
    const { count: teacherCount } = await teacherQuery;

    // Fee records
    let feeQuery = supabase.from('fee_records').select('amount, status');
    if (selectedSchoolId !== 'all') feeQuery = feeQuery.eq('school_id', selectedSchoolId);
    const { data: feeData } = await feeQuery;

    let totalCollected = 0;
    let totalPending = 0;
    feeData?.forEach((f) => {
      if (f.status === 'paid') totalCollected += Number(f.amount);
      else totalPending += Number(f.amount);
    });

    // Salary/Payroll stats
    let payrollQuery = supabase.from('teacher_payroll').select('final_salary, total_deduction, status, net_salary');
    if (selectedSchoolId !== 'all') payrollQuery = payrollQuery.eq('school_id', selectedSchoolId);
    const { data: payrollData } = await payrollQuery;

    let salaryPaid = 0, salaryPending = 0, salaryDeductions = 0;
    payrollData?.forEach((p) => {
      const net = Number(p.net_salary || p.final_salary);
      if (p.status === 'paid') salaryPaid += net;
      else salaryPending += net;
      salaryDeductions += Number(p.total_deduction);
    });

    // HR module stats
    let loansQuery = supabase.from('teacher_loans').select('remaining_balance, status');
    if (selectedSchoolId !== 'all') loansQuery = loansQuery.eq('school_id', selectedSchoolId);
    const { data: loansData } = await loansQuery;
    const loansOutstanding = (loansData || []).filter(l => l.status === 'active').reduce((s, l) => s + Number(l.remaining_balance), 0);

    let advancesQuery = supabase.from('teacher_advances').select('remaining_balance, status');
    if (selectedSchoolId !== 'all') advancesQuery = advancesQuery.eq('school_id', selectedSchoolId);
    const { data: advancesData } = await advancesQuery;
    const advancesPending = (advancesData || []).filter(a => a.status === 'approved').reduce((s, a) => s + Number(a.remaining_balance), 0);

    let depositsQuery = supabase.from('teacher_security_deposits').select('collected_amount');
    if (selectedSchoolId !== 'all') depositsQuery = depositsQuery.eq('school_id', selectedSchoolId);
    const { data: depositsData } = await depositsQuery;
    const depositsCollected = (depositsData || []).reduce((s, d) => s + Number(d.collected_amount), 0);

    setStats({
      totalStudents: studentCount || 0,
      totalTeachers: teacherCount || 0,
      totalFeeCollected: totalCollected,
      totalFeePending: totalPending,
      totalSalaryPaid: salaryPaid,
      totalSalaryPending: salaryPending,
      totalSalaryDeductions: salaryDeductions,
      totalLoansOutstanding: loansOutstanding,
      totalAdvancesPending: advancesPending,
      totalDepositsCollected: depositsCollected,
    });
  };

  const fetchFeeData = async () => {
    let query = supabase.from('fee_records').select('month, year, amount, status, receipt_number');
    if (selectedSchoolId !== 'all') query = query.eq('school_id', selectedSchoolId);
    const { data } = await query;

    if (data) {
      // Monthly fee breakdown
      const monthMap: Record<string, { paid: number; unpaid: number }> = {};
      data.forEach((r) => {
        const key = `${r.month} ${r.year}`;
        if (!monthMap[key]) monthMap[key] = { paid: 0, unpaid: 0 };
        if (r.status === 'paid') monthMap[key].paid += Number(r.amount);
        else monthMap[key].unpaid += Number(r.amount);
      });
      const monthData = Object.entries(monthMap).map(([name, vals]) => ({ name, ...vals }));
      setFeeByMonth(monthData.slice(-12));

      // Fee collection method breakdown
      let bankCount = 0, receiptCount = 0, cashCount = 0;
      data.filter(r => r.status === 'paid').forEach((r) => {
        if (r.receipt_number && r.receipt_number.toLowerCase().includes('bank')) bankCount += Number(r.amount);
        else if (r.receipt_number) receiptCount += Number(r.amount);
        else cashCount += Number(r.amount);
      });
      setFeeByMethod([
        { name: 'Bank', value: bankCount || 0 },
        { name: 'Receipt', value: receiptCount || 0 },
        { name: 'Cash', value: cashCount || 0 },
      ].filter(m => m.value > 0));
    }
  };

  const fetchSchoolPerformance = async () => {
    if (selectedSchoolId !== 'all') {
      setSchoolPerformance([]);
      return;
    }
    const perfData: any[] = [];
    for (const school of schools) {
      const { count: students } = await supabase.from('student_enrollments').select('id', { count: 'exact', head: true }).eq('school_id', school.id);
      const { data: fees } = await supabase.from('fee_records').select('amount, status').eq('school_id', school.id);
      const collected = fees?.filter(f => f.status === 'paid').reduce((s, f) => s + Number(f.amount), 0) || 0;
      const pending = fees?.filter(f => f.status !== 'paid').reduce((s, f) => s + Number(f.amount), 0) || 0;
      perfData.push({ name: school.name, students: students || 0, collected, pending });
    }
    setSchoolPerformance(perfData);
  };

  const formatCurrency = (val: number) => `PKR ${val.toLocaleString()}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">Director Dashboard</h1>
          <p className="text-muted-foreground">Overview of all school analytics</p>
        </div>
        <Select value={selectedSchoolId} onValueChange={setSelectedSchoolId}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Select School" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Schools</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><GraduationCap className="w-6 h-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Students</p>
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-2/10"><Users className="w-6 h-6 text-chart-2" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Teachers</p>
              <p className="text-2xl font-bold">{stats.totalTeachers}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-3/10"><DollarSign className="w-6 h-6 text-chart-3" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Fee Collected</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalFeeCollected)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10"><TrendingUp className="w-6 h-6 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Fee Pending</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalFeePending)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Salary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/10"><DollarSign className="w-6 h-6 text-green-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Salary Paid</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSalaryPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/10"><DollarSign className="w-6 h-6 text-yellow-500" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Salary Pending</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSalaryPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10"><TrendingUp className="w-6 h-6 text-destructive" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Total Deductions</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalSalaryDeductions)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* HR Module Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-4/10"><Landmark className="w-6 h-6 text-chart-4" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Loans</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalLoansOutstanding)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-chart-5/10"><ArrowRightLeft className="w-6 h-6 text-chart-5" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Advances</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalAdvancesPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10"><Shield className="w-6 h-6 text-primary" /></div>
            <div>
              <p className="text-sm text-muted-foreground">Deposits Collected</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalDepositsCollected)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Fee Collection */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Monthly Fee Collection</CardTitle></CardHeader>
          <CardContent>
            {feeByMonth.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={feeByMonth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} angle={-30} textAnchor="end" height={60} />
                  <YAxis fontSize={12} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="paid" fill="hsl(var(--primary))" name="Paid" radius={[4,4,0,0]} />
                  <Bar dataKey="unpaid" fill="hsl(var(--destructive))" name="Unpaid" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No fee data available</p>
            )}
          </CardContent>
        </Card>

        {/* Fee Collection Method */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Fee Collection Breakdown</CardTitle></CardHeader>
          <CardContent>
            {feeByMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={feeByMethod} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {feeByMethod.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-center py-12">No payment data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* School Performance Comparison (only when "All Schools" selected) */}
      {selectedSchoolId === 'all' && schoolPerformance.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">School Performance Comparison</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={schoolPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `PKR ${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number, name: string) => name === 'students' ? v : formatCurrency(v)} />
                <Legend />
                <Bar dataKey="collected" fill="hsl(var(--primary))" name="Collected" radius={[4,4,0,0]} />
                <Bar dataKey="pending" fill="hsl(var(--destructive))" name="Pending" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Student count table */}
            <div className="mt-4 border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">School</th>
                    <th className="text-right p-3 font-medium">Students</th>
                    <th className="text-right p-3 font-medium">Collected</th>
                    <th className="text-right p-3 font-medium">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolPerformance.map((s, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-3">{s.name}</td>
                      <td className="text-right p-3">{s.students}</td>
                      <td className="text-right p-3 text-primary font-medium">{formatCurrency(s.collected)}</td>
                      <td className="text-right p-3 text-destructive font-medium">{formatCurrency(s.pending)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
