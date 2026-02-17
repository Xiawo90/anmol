import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TeacherClassAssignment {
  id: string;
  class_id: string;
  section_id: string | null;
  subject_id: string;
  class_name: string;
  section_name: string | null;
  subject_name: string;
}

export interface UniqueClass {
  id: string;
  class_id: string;
  section_id: string | null;
  class_name: string;
  section_name: string | null;
}

export function useTeacherAssignments() {
  const { user, role, isApproved } = useAuth();
  const [assignments, setAssignments] = useState<TeacherClassAssignment[]>([]);
  const [uniqueClasses, setUniqueClasses] = useState<UniqueClass[]>([]);
  const [classIds, setClassIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAssignments, setHasAssignments] = useState(false);

  useEffect(() => {
    if (user && role === 'teacher' && isApproved) {
      fetchAssignments();
    } else {
      setIsLoading(false);
    }
  }, [user, role, isApproved]);

  const fetchAssignments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('teacher_assignments')
        .select(`
          id,
          class_id,
          section_id,
          subject_id,
          classes:class_id(name),
          sections:section_id(name),
          subjects:subject_id(name)
        `)
        .eq('teacher_id', user.id);

      if (data && !error) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          class_id: item.class_id,
          section_id: item.section_id,
          subject_id: item.subject_id,
          class_name: item.classes?.name || '',
          section_name: item.sections?.name || null,
          subject_name: item.subjects?.name || '',
        }));
        setAssignments(formatted);
        setClassIds([...new Set(formatted.map(a => a.class_id))]);
        setHasAssignments(formatted.length > 0);

        // Extract unique classes (for attendance page)
        const classMap = new Map<string, UniqueClass>();
        formatted.forEach(a => {
          const key = `${a.class_id}-${a.section_id || 'all'}`;
          if (!classMap.has(key)) {
            classMap.set(key, {
              id: a.id,
              class_id: a.class_id,
              section_id: a.section_id,
              class_name: a.class_name,
              section_name: a.section_name,
            });
          }
        });
        setUniqueClasses(Array.from(classMap.values()));
      } else {
        setHasAssignments(false);
      }
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      setHasAssignments(false);
    } finally {
      setIsLoading(false);
    }
  };

  return { 
    assignments, 
    uniqueClasses,
    classIds, 
    isLoading, 
    hasAssignments,
    refetch: fetchAssignments 
  };
}
