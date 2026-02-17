import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface StudentEnrollment {
  class_id: string;
  section_id: string | null;
  class_name: string;
  section_name: string | null;
}

export function useStudentEnrollment() {
  const { user, role } = useAuth();
  const [enrollment, setEnrollment] = useState<StudentEnrollment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && (role === 'student' || role === 'parent')) {
      fetchEnrollment();
    } else {
      setIsLoading(false);
    }
  }, [user, role]);

  const fetchEnrollment = async () => {
    if (!user) return;

    try {
      let studentId = user.id;

      // If parent, get linked student
      if (role === 'parent') {
        const { data: parentStudent } = await supabase
          .from('parent_students')
          .select('student_id')
          .eq('parent_id', user.id)
          .maybeSingle();

        if (parentStudent) {
          studentId = parentStudent.student_id;
        }
      }

      const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
          class_id,
          section_id,
          classes:class_id(name),
          sections:section_id(name)
        `)
        .eq('student_id', studentId)
        .maybeSingle();

      if (data && !error) {
        setEnrollment({
          class_id: data.class_id,
          section_id: data.section_id,
          class_name: (data.classes as any)?.name || '',
          section_name: (data.sections as any)?.name || null,
        });
      }
    } catch (error) {
      console.error('Error fetching enrollment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { enrollment, isLoading, refetch: fetchEnrollment };
}
