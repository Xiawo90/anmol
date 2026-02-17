import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { School, Users, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TeacherClass {
  id: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  class_name: string;
  section_name: string | null;
  subject_name: string;
  student_count: number;
}

export default function TeacherClasses() {
  const { user, isApproved } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && isApproved) {
      fetchClasses();
    }
  }, [user, isApproved]);

  const fetchClasses = async () => {
    try {
      const { data: assignments, error } = await supabase
        .from('teacher_assignments')
        .select(`
          id,
          class_id,
          section_id,
          subject_id,
          classes:class_id (name),
          sections:section_id (name),
          subjects:subject_id (name)
        `)
        .eq('teacher_id', user?.id);

      if (error) throw error;

      const classesWithCounts = await Promise.all(
        (assignments || []).map(async (assignment: any) => {
          const { count } = await supabase
            .from('student_enrollments')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', assignment.class_id)
            .eq('section_id', assignment.section_id || '');

          return {
            id: assignment.id,
            class_id: assignment.class_id,
            section_id: assignment.section_id,
            subject_id: assignment.subject_id,
            class_name: assignment.classes?.name || 'Unknown',
            section_name: assignment.sections?.name || null,
            subject_name: assignment.subjects?.name || 'Unknown',
            student_count: count || 0,
          };
        })
      );

      setClasses(classesWithCounts);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setIsLoading(false);
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold">My Classes</h1>
          <p className="text-muted-foreground">View and manage your assigned classes</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted" />
                <CardContent className="h-20" />
              </Card>
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <School className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No classes assigned yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((classItem) => (
              <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <School className="h-5 w-5 text-primary" />
                        {classItem.class_name}
                      </CardTitle>
                      {classItem.section_name && (
                        <CardDescription>Section {classItem.section_name}</CardDescription>
                      )}
                    </div>
                    <Badge variant="secondary">{classItem.subject_name}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>{classItem.student_count} students</span>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/teacher/attendance?class=${classItem.class_id}&section=${classItem.section_id || ''}`}>
                        Mark Attendance <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
