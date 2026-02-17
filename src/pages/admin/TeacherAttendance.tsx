import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Users, UserX, CalendarOff, Download, Settings, AlertTriangle } from 'lucide-react';
import { format, getDaysInMonth, startOfMonth, endOfMonth } from 'date-fns';
import { Profile } from '@/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const STATUS_LABELS: Record<string, string> = {
  absent: 'Absent',
  casual_leave: 'Casual Leave',
  earned_leave: 'Earned Leave',
};

export default function TeacherAttendance() {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [records, setRecords] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterMonth, setFilterMonth] = useState(MONTHS[new Date().getMonth()]);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [filterTeacher, setFilterTeacher] = useState('all');

  // Mark absence dialog
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ teacher_id: '', date: format(new Date(), 'yyyy-MM-dd'), status: 'absent', reason: '' });
  const [yearlyCount, setYearlyCount] = useState(0);
  const [maxAbsences, setMaxAbsences] = useState(7);
  const [showWarning, setShowWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Settings dialog
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ max_yearly_absences: '7', salary_calculation_type: 'calendar_days' });

  useEffect(() => { fetchTeachers(); fetchSettings(); }, []);
  useEffect(() => { fetchRecords(); checkLock(); }, [filterMonth, filterYear, filterTeacher]);

  const fetchTeachers = async () => {
    const { data: roles } = await supabase.from('user_roles').select('user_id').eq('role', 'teacher');
    if (!roles) return;
    const ids = roles.map(r => r.user_id);
    const { data: profiles } = await supabase.from('profiles').select('*');
    if (profiles) setTeachers(profiles.filter(p => ids.includes(p.user_id)) as Profile[]);
  };

  const fetchSettings = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase.from('school_attendance_settings').select('*').eq('school_id', profile.school_id).maybeSingle();
    if (data) {
      setMaxAbsences(data.max_yearly_absences);
      setSettingsForm({ max_yearly_absences: String(data.max_yearly_absences), salary_calculation_type: data.salary_calculation_type });
    }
  };

  const fetchRecords = async () => {
    setLoading(true);
    const monthIdx = MONTHS.indexOf(filterMonth);
    const year = parseInt(filterYear);
    const start = format(new Date(year, monthIdx, 1), 'yyyy-MM-dd');
    const end = format(new Date(year, monthIdx + 1, 0), 'yyyy-MM-dd');

    let query = supabase.from('teacher_attendance').select('*').gte('date', start).lte('date', end).order('date', { ascending: false });
    if (filterTeacher !== 'all') query = query.eq('teacher_id', filterTeacher);

    const { data } = await query;
    setRecords(data || []);
    setLoading(false);
  };

  const checkLock = async () => {
    if (!profile?.school_id) return;
    const { data } = await supabase.from('teacher_payroll').select('is_locked').eq('school_id', profile.school_id).eq('month', filterMonth).eq('year', parseInt(filterYear)).limit(1);
    setIsLocked(data?.some(d => d.is_locked) || false);
  };

  const fetchYearlyCount = async (teacherId: string) => {
    const year = new Date().getFullYear();
    const { count } = await supabase.from('teacher_attendance').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId).gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
    setYearlyCount(count || 0);
  };

  const openMarkDialog = () => {
    if (isLocked) {
      toast({ title: 'Locked', description: 'Attendance for this month is locked as payroll has been generated.', variant: 'destructive' });
      return;
    }
    setForm({ teacher_id: '', date: format(new Date(), 'yyyy-MM-dd'), status: 'absent', reason: '' });
    setYearlyCount(0);
    setShowDialog(true);
  };

  const handleTeacherChange = async (id: string) => {
    setForm(f => ({ ...f, teacher_id: id }));
    await fetchYearlyCount(id);
  };

  const handleSave = async () => {
    if (yearlyCount >= maxAbsences && !showWarning) {
      setShowWarning(true);
      return;
    }
    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    const isDeductible = yearlyCount >= maxAbsences;
    const { error } = await supabase.from('teacher_attendance').insert({
      teacher_id: form.teacher_id,
      school_id: profile?.school_id,
      date: form.date,
      status: form.status,
      reason: form.reason || null,
      approved_by: user?.id,
      is_deductible: isDeductible,
    });
    setSaving(false);
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Duplicate', description: 'Attendance already recorded for this teacher on this date.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Success', description: 'Absence recorded successfully' });
    setShowDialog(false);
    setShowWarning(false);
    fetchRecords();
  };

  const handleDeleteRecord = async (id: string) => {
    if (isLocked) {
      toast({ title: 'Locked', description: 'Cannot modify locked month.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('teacher_attendance').delete().eq('id', id);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Deleted', description: 'Record removed' });
    fetchRecords();
  };

  const handleSaveSettings = async () => {
    if (!profile?.school_id) return;
    const { data: existing } = await supabase.from('school_attendance_settings').select('id').eq('school_id', profile.school_id).maybeSingle();
    const payload = { school_id: profile.school_id, max_yearly_absences: parseInt(settingsForm.max_yearly_absences), salary_calculation_type: settingsForm.salary_calculation_type };
    let error;
    if (existing) {
      ({ error } = await supabase.from('school_attendance_settings').update(payload).eq('id', existing.id));
    } else {
      ({ error } = await supabase.from('school_attendance_settings').insert(payload));
    }
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Saved', description: 'Settings updated' });
    setMaxAbsences(parseInt(settingsForm.max_yearly_absences));
    setShowSettings(false);
  };

  const getTeacherName = (id: string) => teachers.find(t => t.user_id === id)?.full_name || 'Unknown';

  const getAbsenceColor = (count: number) => {
    if (count >= 7) return 'destructive';
    if (count >= 5) return 'secondary';
    return 'default';
  };

  // Stats
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayRecords = records.filter(r => r.date === todayStr);
  const absentToday = todayRecords.filter(r => r.status === 'absent').length;
  const onLeaveToday = todayRecords.filter(r => r.status !== 'absent').length;
  const presentToday = teachers.length - todayRecords.length;

  const handleExport = () => {
    const csv = ['Teacher,Date,Status,Deductible,Reason'];
    records.forEach(r => csv.push(`"${getTeacherName(r.teacher_id)}",${r.date},${STATUS_LABELS[r.status] || r.status},${r.is_deductible ? 'Yes' : 'No'},"${r.reason || ''}"`));
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-attendance-${filterMonth}-${filterYear}.csv`;
    a.click();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground">Teacher Attendance</h1>
            <p className="text-muted-foreground">Mark and manage teacher absences</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)} title="Settings">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Export</Button>
            <Button onClick={openMarkDialog}><Plus className="h-4 w-4 mr-2" />Mark Absence</Button>
          </div>
        </div>

        {isLocked && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-destructive font-medium text-sm">🔒 Attendance for {filterMonth} {filterYear} is locked (payroll generated).</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-primary/10"><Users className="w-6 h-6 text-primary" /></div><div><p className="text-2xl font-bold">{teachers.length}</p><p className="text-sm text-muted-foreground">Total Teachers</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-green-500/10"><Users className="w-6 h-6 text-green-500" /></div><div><p className="text-2xl font-bold">{presentToday}</p><p className="text-sm text-muted-foreground">Present Today</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-destructive/10"><UserX className="w-6 h-6 text-destructive" /></div><div><p className="text-2xl font-bold">{absentToday}</p><p className="text-sm text-muted-foreground">Absent Today</p></div></CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-3 rounded-lg bg-yellow-500/10"><CalendarOff className="w-6 h-6 text-yellow-500" /></div><div><p className="text-2xl font-bold">{onLeaveToday}</p><p className="text-sm text-muted-foreground">On Leave Today</p></div></CardContent></Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <SearchableSelect
                options={MONTHS.map(m => ({ value: m, label: m }))}
                value={filterMonth}
                onValueChange={setFilterMonth}
                placeholder="Month"
                className="w-full md:w-[160px]"
              />
              <Input className="w-full md:w-[100px]" value={filterYear} onChange={e => setFilterYear(e.target.value)} placeholder="Year" />
              <SearchableSelect
                options={[{ value: 'all', label: 'All Teachers' }, ...teachers.map(t => ({ value: t.user_id, label: `${t.full_name}${(t as any).teacher_code ? ` (${(t as any).teacher_code})` : ''}` }))]}
                value={filterTeacher}
                onValueChange={setFilterTeacher}
                placeholder="All Teachers"
                searchPlaceholder="Search by name or code..."
                className="w-full md:w-[250px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deductible</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
                ) : records.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No absence records for this period. All teachers present!</TableCell></TableRow>
                ) : records.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{getTeacherName(r.teacher_id)}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell><Badge variant="outline">{STATUS_LABELS[r.status] || r.status}</Badge></TableCell>
                    <TableCell>{r.is_deductible ? <Badge variant="destructive">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.reason || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDeleteRecord(r.id)} disabled={isLocked}>Delete</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mark Absence Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Mark Teacher Absence</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Teacher</Label>
              <SearchableSelect
                options={teachers.map(t => ({ value: t.user_id, label: t.full_name }))}
                value={form.teacher_id}
                onValueChange={handleTeacherChange}
                placeholder="Select teacher"
                searchPlaceholder="Search teacher..."
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Absence Type</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="absent">Absent (without informing)</SelectItem>
                  <SelectItem value="casual_leave">Casual Leave</SelectItem>
                  <SelectItem value="earned_leave">Earned Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Enter reason..." />
            </div>
            {form.teacher_id && (
              <div className="p-3 rounded-lg border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Yearly Absences</span>
                  <Badge variant={getAbsenceColor(yearlyCount)}>{yearlyCount} / {maxAbsences}</Badge>
                </div>
                {yearlyCount >= maxAbsences && (
                  <div className="mt-2 flex items-center gap-2 text-destructive text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Limit reached! This absence will be salary deductible.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.teacher_id || saving}>{saving ? 'Saving...' : 'Save Absence'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Warning Dialog */}
      <AlertDialog open={showWarning} onOpenChange={setShowWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" />Yearly Absence Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              This teacher has already reached the yearly absence limit ({maxAbsences}). This absence will be marked as <strong>salary deductible</strong>. Do you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSave} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Yes, Mark Deductible</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader><DialogTitle>Attendance Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Max Yearly Absences (before deduction)</Label>
              <Input type="number" value={settingsForm.max_yearly_absences} onChange={e => setSettingsForm(f => ({ ...f, max_yearly_absences: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Salary Calculation Type</Label>
              <Select value={settingsForm.salary_calculation_type} onValueChange={v => setSettingsForm(f => ({ ...f, salary_calculation_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="calendar_days">Calendar Days</SelectItem>
                  <SelectItem value="working_days">Working Days (excl. Sundays)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
