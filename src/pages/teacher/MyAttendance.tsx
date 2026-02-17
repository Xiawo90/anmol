import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { CalendarOff, AlertTriangle, CheckCircle } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const STATUS_LABELS: Record<string, string> = { absent: 'Absent', casual_leave: 'Casual Leave', earned_leave: 'Earned Leave' };

export default function MyAttendance() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [yearlyCount, setYearlyCount] = useState(0);
  const [deductibleCount, setDeductibleCount] = useState(0);
  const [maxAbsences, setMaxAbsences] = useState(7);
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => { fetchSettings(); fetchYearlyStats(); }, []);
  useEffect(() => { fetchRecords(); }, [filterMonth, filterYear]);

  const fetchSettings = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase.from('school_attendance_settings').select('max_yearly_absences').eq('school_id', profile.school_id).maybeSingle();
    if (data) setMaxAbsences(data.max_yearly_absences);
  };

  const fetchYearlyStats = async () => {
    if (!user) return;
    const year = new Date().getFullYear();
    const { count: total } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    const { count: ded } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true }).eq('teacher_id', user.id).eq('is_deductible', true).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    setYearlyCount(total || 0);
    setDeductibleCount(ded || 0);
  };

  const fetchRecords = async () => {
    if (!user) return;
    setLoading(true);
    const monthIdx = MONTHS.indexOf(filterMonth);
    const year = parseInt(filterYear);
    const start = `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
    const end = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${new Date(year, monthIdx + 1, 0).getDate()}`;
    const { data } = await supabase.from('teacher_attendance').select('*').eq('teacher_id', user.id).gte('date', start).lte('date', end).order('date', { ascending: false });
    setRecords(data || []);
    setLoading(false);
  };

  const remaining = Math.max(0, maxAbsences - yearlyCount);
  const getColor = (count: number) => count >= 7 ? 'destructive' : count >= 5 ? 'secondary' : 'default';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground">View your attendance records</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><CalendarOff className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">{yearlyCount}</p><p className="text-sm text-muted-foreground">Total Absences This Year</p><Badge variant={getColor(yearlyCount)} className="mt-1">{yearlyCount} / {maxAbsences}</Badge></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><AlertTriangle className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">{deductibleCount}</p><p className="text-sm text-muted-foreground">Deductible Days</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><CheckCircle className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">{remaining}</p><p className="text-sm text-muted-foreground">Remaining Allowed</p></div></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterMonth} onValueChange={setFilterMonth}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>{MONTHS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
              <Input className="w-[100px]" value={filterYear} onChange={e => setFilterYear(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deductible</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No absence records for this period. 🎉</TableCell></TableRow>
                ) : records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABELS[r.status] || r.status}</Badge></TableCell>
                    <TableCell>{r.is_deductible ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell>{r.reason || '-'}</TableCell>
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
