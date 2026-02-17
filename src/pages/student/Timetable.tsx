import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock } from 'lucide-react';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: { name: string } | null;
  teacher_id: string | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SCHOOL_DAYS = [1, 2, 3, 4, 5]; // Monday to Friday

export default function StudentTimetable() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDay, setCurrentDay] = useState(new Date().getDay());

  useEffect(() => {
    if (user) {
      fetchTimetable();
    }
  }, [user]);

  const fetchTimetable = async () => {
    if (!user) return;
    
    setLoading(true);

    // Get student's enrollment
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('class_id, section_id')
      .eq('student_id', user.id)
      .maybeSingle();

    if (!enrollment) {
      setLoading(false);
      return;
    }

    // Get timetable for student's class
    const { data, error } = await supabase
      .from('timetable')
      .select(`
        *,
        subject:subjects(name)
      `)
      .eq('class_id', enrollment.class_id)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error && data) {
      setTimetable(data as TimetableEntry[]);
    }
    setLoading(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTodaySchedule = () => {
    return timetable.filter(entry => entry.day_of_week === currentDay);
  };

  const getScheduleByDay = (day: number) => {
    return timetable.filter(entry => entry.day_of_week === day);
  };

  const todaySchedule = getTodaySchedule();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">My Timetable</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View your class schedule</p>
        </div>

        {/* Today's Schedule */}
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
              <span className="truncate">Today - {DAYS[currentDay]}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : todaySchedule.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {currentDay === 0 || currentDay === 6 
                  ? "It's the weekend! No classes today."
                  : "No classes scheduled for today"}
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {todaySchedule.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-muted-foreground sm:min-w-[140px]">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs sm:text-sm">
                        {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                      </span>
                    </div>
                    <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
                      {entry.subject?.name}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Schedule */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : timetable.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No timetable available yet
              </div>
            ) : (
              <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
                {SCHOOL_DAYS.map((day) => {
                  const daySchedule = getScheduleByDay(day);
                  const isToday = day === currentDay;
                  
                    return (
                      <div
                        key={day}
                        className={`rounded-lg border p-3 sm:p-4 ${
                          isToday ? 'border-primary bg-primary/5' : ''
                        }`}
                      >
                        <h3 className={`font-semibold mb-2 sm:mb-3 text-sm sm:text-base ${isToday ? 'text-primary' : ''}`}>
                          {DAYS[day].slice(0, 3)}
                          <span className="hidden sm:inline">{DAYS[day].slice(3)}</span>
                          {isToday && (
                            <Badge variant="default" className="ml-1 sm:ml-2 text-[10px] sm:text-xs">
                              Today
                            </Badge>
                          )}
                        </h3>
                        {daySchedule.length === 0 ? (
                          <p className="text-xs sm:text-sm text-muted-foreground">No classes</p>
                        ) : (
                          <div className="space-y-1.5 sm:space-y-2">
                            {daySchedule.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-1.5 sm:p-2 rounded bg-muted text-xs sm:text-sm"
                              >
                                <p className="font-medium truncate">{entry.subject?.name}</p>
                                <p className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatTime(entry.start_time)}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
