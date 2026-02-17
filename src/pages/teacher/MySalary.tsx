import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { DollarSign, TrendingDown } from 'lucide-react';

export default function MySalary() {
  const { user } = useAuth();
  const [salary, setSalary] = useState<any>(null);
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    setLoading(true);
    const [salRes, payRes] = await Promise.all([
      supabase.from('teacher_salaries').select('*').eq('teacher_id', user!.id).eq('is_active', true).maybeSingle(),
      supabase.from('teacher_payroll').select('*').eq('teacher_id', user!.id).order('year', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    setSalary(salRes.data);
    setPayrolls(payRes.data || []);
    setLoading(false);
  };

  const totalDeductions = payrolls.reduce((s, p) => s + Number(p.total_deduction), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Salary</h1>
          <p className="text-muted-foreground">View your salary and payroll history</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><DollarSign className="w-6 h-6 text-primary" /></div><div><p className="text-sm text-muted-foreground">Current Monthly Salary</p><p className="text-2xl font-bold">{salary ? `PKR ${Number(salary.monthly_salary).toLocaleString()}` : 'Not set'}</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><TrendingDown className="w-6 h-6 text-destructive" /></div><div><p className="text-sm text-muted-foreground">Total Deductions (All Time)</p><p className="text-2xl font-bold">PKR {totalDeductions.toLocaleString()}</p></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month/Year</TableHead>
                  <TableHead>Monthly Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Final Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : payrolls.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payroll records yet</TableCell></TableRow>
                ) : payrolls.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.month} {p.year}</TableCell>
                    <TableCell>PKR {Number(p.monthly_salary).toLocaleString()}</TableCell>
                    <TableCell className="text-destructive">{Number(p.total_deduction) > 0 ? `PKR ${Number(p.total_deduction).toLocaleString()}` : '-'}</TableCell>
                    <TableCell className="font-bold">PKR {Number(p.final_salary).toLocaleString()}</TableCell>
                    <TableCell><Badge variant={p.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{p.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
