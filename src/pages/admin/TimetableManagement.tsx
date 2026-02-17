import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';

interface TimetableEntry {
  id: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  teacher_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  class_name?: string;
  section_name?: string;
  subject_name?: string;
  teacher_name?: string;
}

interface BatchEntry {
  subject_id: string;
  teacher_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface ClassItem { id: string; name: string; }
interface Section { id: string; name: string; class_id: string; }
interface Subject { id: string; name: string; }
interface Teacher { user_id: string; full_name: string; }

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCHOOL_DAYS = [1, 2, 3, 4, 5];

const emptyBatchEntry = (): BatchEntry => ({
  subject_id: '', teacher_id: '', day_of_week: '', start_time: '', end_time: '',
});

export default function TimetableManagement() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Batch creation state
  const [batchClassId, setBatchClassId] = useState('');
  const [batchSectionId, setBatchSectionId] = useState('');
  const [batchEntries, setBatchEntries] = useState<BatchEntry[]>([emptyBatchEntry()]);
  const [batchSaving, setBatchSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [classesRes, sectionsRes, subjectsRes, teachersRes, entriesRes] = await Promise.all([
      supabase.from('classes').select('id, name').order('name'),
      supabase.from('sections').select('id, name, class_id').order('name'),
      supabase.from('subjects').select('id, name').order('name'),
      supabase.from('profiles').select('user_id, full_name')
        .in('user_id', (await supabase.from('user_roles').select('user_id').eq('role', 'teacher')).data?.map(r => r.user_id) || []),
      supabase.from('timetable').select('*').order('day_of_week').order('start_time'),
    ]);

    setClasses(classesRes.data || []);
    setSections(sectionsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTeachers(teachersRes.data || []);

    const entriesWithNames = (entriesRes.data || []).map(entry => ({
      ...entry,
      class_name: classesRes.data?.find(c => c.id === entry.class_id)?.name || 'Unknown',
      section_name: sectionsRes.data?.find(s => s.id === entry.section_id)?.name || null,
      subject_name: subjectsRes.data?.find(s => s.id === entry.subject_id)?.name || 'Unknown',
      teacher_name: teachersRes.data?.find(t => t.user_id === entry.teacher_id)?.full_name || null,
    }));

    setEntries(entriesWithNames);
    setLoading(false);
  };

  const addBatchRow = () => {
    setBatchEntries([...batchEntries, emptyBatchEntry()]);
  };

  const removeBatchRow = (index: number) => {
    setBatchEntries(batchEntries.filter((_, i) => i !== index));
  };

  const updateBatchRow = (index: number, field: keyof BatchEntry, value: string) => {
    const updated = [...batchEntries];
    updated[index] = { ...updated[index], [field]: value };
    setBatchEntries(updated);
  };

  const handleBatchCreate = async () => {
    if (!batchClassId) {
      toast.error('Please select a class');
      return;
    }

    const validEntries = batchEntries.filter(
      e => e.subject_id && e.day_of_week && e.start_time && e.end_time
    );

    if (validEntries.length === 0) {
      toast.error('Please add at least one valid entry');
      return;
    }

    setBatchSaving(true);
    try {
      const records = validEntries.map(e => ({
        class_id: batchClassId,
        section_id: batchSectionId || null,
        subject_id: e.subject_id,
        teacher_id: e.teacher_id || null,
        day_of_week: parseInt(e.day_of_week),
        start_time: e.start_time,
        end_time: e.end_time,
        school_id: profile?.school_id,
      }));

      const { error } = await supabase.from('timetable').insert(records);
      if (error) throw error;

      toast.success(`${records.length} timetable entries created`);
      setIsDialogOpen(false);
      setBatchClassId('');
      setBatchSectionId('');
      setBatchEntries([emptyBatchEntry()]);
      fetchData();
    } catch (error) {
      console.error('Error creating entries:', error);
      toast.error('Failed to create timetable entries');
    } finally {
      setBatchSaving(false);
    }
  };

  const deleteEntry = async (id: string) => {
    if (!confirm('Delete this timetable entry?')) return;
    try {
      const { error } = await supabase.from('timetable').delete().eq('id', id);
      if (error) throw error;
      toast.success('Entry deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete entry');
    }
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const filteredSections = sections.filter(s => s.class_id === batchClassId);
  const filteredEntries = selectedClass === 'all' ? entries : entries.filter(e => e.class_id === selectedClass);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Timetable Management</h1>
            <p className="text-muted-foreground">Create and manage class timetables</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Timetable
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Class Timetable</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Class *</Label>
                    <SearchableSelect
                      options={classes.map(c => ({ value: c.id, label: c.name }))}
                      value={batchClassId}
                      onValueChange={(v) => { setBatchClassId(v); setBatchSectionId(''); }}
                      placeholder="Select class"
                      searchPlaceholder="Search class..."
                    />
                  </div>
                  {filteredSections.length > 0 && (
                    <div>
                      <Label>Section</Label>
                      <SearchableSelect
                        options={[{ value: '', label: 'All Sections' }, ...filteredSections.map(s => ({ value: s.id, label: s.name }))]}
                        value={batchSectionId}
                        onValueChange={setBatchSectionId}
                        placeholder="Select section"
                      />
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Periods</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addBatchRow}>
                      <Plus className="h-3 w-3 mr-1" /> Add Period
                    </Button>
                  </div>

                  {batchEntries.map((entry, idx) => (
                    <div key={idx} className="grid grid-cols-6 gap-2 items-end border-b pb-3 last:border-0">
                      <div>
                        <Label className="text-xs">Day</Label>
                        <Select value={entry.day_of_week} onValueChange={(v) => updateBatchRow(idx, 'day_of_week', v)}>
                          <SelectTrigger className="text-xs h-8">
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHOOL_DAYS.map(d => (
                              <SelectItem key={d} value={d.toString()}>{DAYS[d]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Subject</Label>
                        <SearchableSelect
                          options={subjects.map(s => ({ value: s.id, label: s.name }))}
                          value={entry.subject_id}
                          onValueChange={(v) => updateBatchRow(idx, 'subject_id', v)}
                          placeholder="Subject"
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Teacher</Label>
                        <SearchableSelect
                          options={[{ value: '', label: 'None' }, ...teachers.map(t => ({ value: t.user_id, label: t.full_name }))]}
                          value={entry.teacher_id}
                          onValueChange={(v) => updateBatchRow(idx, 'teacher_id', v)}
                          placeholder="Teacher"
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Start</Label>
                        <Input type="time" className="text-xs h-8" value={entry.start_time} onChange={(e) => updateBatchRow(idx, 'start_time', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">End</Label>
                        <Input type="time" className="text-xs h-8" value={entry.end_time} onChange={(e) => updateBatchRow(idx, 'end_time', e.target.value)} />
                      </div>
                      <div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeBatchRow(idx)} disabled={batchEntries.length <= 1}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={handleBatchCreate} className="w-full" disabled={batchSaving || !batchClassId}>
                  {batchSaving ? 'Creating...' : `Create ${batchEntries.filter(e => e.subject_id && e.day_of_week).length} Entries`}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by Class</CardTitle>
          </CardHeader>
          <CardContent>
            <SearchableSelect
              options={[{ value: 'all', label: 'All Classes' }, ...classes.map(c => ({ value: c.id, label: c.name }))]}
              value={selectedClass}
              onValueChange={setSelectedClass}
              placeholder="All Classes"
              className="w-[200px]"
            />
          </CardContent>
        </Card>

        {/* Timetable Entries */}
        <Card>
          <CardHeader>
            <CardTitle>Timetable Entries</CardTitle>
            <CardDescription>{filteredEntries.length} entries</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />Loading...
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No timetable entries yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell><Badge variant="outline">{DAYS[entry.day_of_week]}</Badge></TableCell>
                      <TableCell className="text-sm">{formatTime(entry.start_time)} - {formatTime(entry.end_time)}</TableCell>
                      <TableCell>{entry.class_name}</TableCell>
                      <TableCell>{entry.section_name || '-'}</TableCell>
                      <TableCell><Badge variant="secondary">{entry.subject_name}</Badge></TableCell>
                      <TableCell>{entry.teacher_name || '-'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEntry(entry.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
