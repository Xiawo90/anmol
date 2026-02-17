import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { CalendarIcon, Save, Check, X, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';

interface Student {
  id: string;
  full_name: string;
  roll_number: string | null;
}

export default function TeacherAttendance() {
  const { user, isApproved } = useAuth();
  const { uniqueClasses, isLoading: classesLoading, hasAssignments } = useTeacherAssignments();
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'present' | 'absent' | 'leave'>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass, selectedDate]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const classInfo = uniqueClasses.find(c => c.id === selectedClass);
      if (!classInfo) return;

      // Fetch enrollments without join
      let query = supabase
        .from('student_enrollments')
        .select('student_id, roll_number')
        .eq('class_id', classInfo.class_id);

      if (classInfo.section_id) {
        query = query.eq('section_id', classInfo.section_id);
      }

      const { data: enrollments, error } = await query;
      if (error) throw error;

      // Get student IDs to fetch profiles
      const studentIds = (enrollments || []).map((e: any) => e.student_id);
      
      // Fetch profiles separately using user_id
      let profilesMap: Record<string, string> = {};
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);
        
        (profiles || []).forEach((p: any) => {
          profilesMap[p.user_id] = p.full_name;
        });
      }

      const studentList = (enrollments || []).map((e: any) => ({
        id: e.student_id,
        full_name: profilesMap[e.student_id] || 'Unknown',
        roll_number: e.roll_number,
      }));

      setStudents(studentList);

      // Fetch existing attendance
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('class_id', classInfo.class_id)
        .eq('date', format(selectedDate, 'yyyy-MM-dd'));

      const attendanceMap: Record<string, 'present' | 'absent' | 'leave'> = {};
      (existingAttendance || []).forEach((a: any) => {
        attendanceMap[a.student_id] = a.status;
      });

      // Default to present for students without records
      studentList.forEach((s: Student) => {
        if (!attendanceMap[s.id]) {
          attendanceMap[s.id] = 'present';
        }
      });

      setAttendance(attendanceMap);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateAttendance = (studentId: string, status: 'present' | 'absent' | 'leave') => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setIsSaving(true);
    try {
      const classInfo = uniqueClasses.find(c => c.id === selectedClass);
      if (!classInfo) return;

      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Delete existing records for this date and class
      await supabase
        .from('attendance')
        .delete()
        .eq('class_id', classInfo.class_id)
        .eq('date', dateStr);

      // Insert new records
      const records = students.map(student => ({
        student_id: student.id,
        class_id: classInfo.class_id,
        date: dateStr,
        status: attendance[student.id] || 'present',
        marked_by: user?.id,
      }));

      const { error } = await supabase.from('attendance').insert(records);
      if (error) throw error;

      toast.success('Attendance saved successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isApproved) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Your account is pending approval.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const leaveCount = Object.values(attendance).filter(s => s === 'leave').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">Record daily attendance for your classes</p>
        </div>

        {!classesLoading && !hasAssignments && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Classes Assigned</AlertTitle>
            <AlertDescription>
              You don't have any classes assigned yet. Please contact an administrator to assign classes to you.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Select Class & Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={selectedClass} onValueChange={setSelectedClass} disabled={classesLoading || !hasAssignments}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder={classesLoading ? "Loading classes..." : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classesLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : uniqueClasses.length === 0 ? (
                    <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                      No classes assigned
                    </div>
                  ) : (
                    uniqueClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.class_name} {c.section_name ? `- Section ${c.section_name}` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[200px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardContent>
        </Card>

        {selectedClass && students.length > 0 && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold">{presentCount}</span>
                    <span className="text-muted-foreground">Present</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <X className="h-5 w-5 text-red-500" />
                    <span className="text-2xl font-bold">{absentCount}</span>
                    <span className="text-muted-foreground">Absent</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="text-2xl font-bold">{leaveCount}</span>
                    <span className="text-muted-foreground">On Leave</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Student List</CardTitle>
                  <CardDescription>{students.length} students enrolled</CardDescription>
                </div>
                <Button onClick={saveAttendance} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Attendance'}
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll No.</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            Loading students...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell>{student.roll_number || '-'}</TableCell>
                          <TableCell className="font-medium">{student.full_name}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                                onClick={() => updateAttendance(student.id, 'present')}
                                className={attendance[student.id] === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                                onClick={() => updateAttendance(student.id, 'absent')}
                                className={attendance[student.id] === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                              >
                                Absent
                              </Button>
                              <Button
                                size="sm"
                                variant={attendance[student.id] === 'leave' ? 'default' : 'outline'}
                                onClick={() => updateAttendance(student.id, 'leave')}
                                className={attendance[student.id] === 'leave' ? 'bg-yellow-500 hover:bg-yellow-600' : ''}
                              >
                                Leave
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}

        {selectedClass && students.length === 0 && !isLoading && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No students enrolled in this class.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}