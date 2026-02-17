import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, GraduationCap, School } from 'lucide-react';

export default function ParentChildren() {
  const { user } = useAuth();

  const { data: children, isLoading } = useQuery({
    queryKey: ['parent-children', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get linked student IDs
      const { data: links, error: linksError } = await supabase
        .from('parent_students')
        .select('student_id, relationship')
        .eq('parent_id', user.id);

      if (linksError) throw linksError;
      if (!links?.length) return [];

      // Get student profiles
      const studentIds = links.map(l => l.student_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', studentIds);

      if (profilesError) throw profilesError;

      // Get enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          *,
          class:classes(name),
          section:sections(name)
        `)
        .in('student_id', studentIds);

      if (enrollmentsError) throw enrollmentsError;

      // Combine data
      return links.map(link => {
        const profile = profiles?.find(p => p.user_id === link.student_id);
        const enrollment = enrollments?.find(e => e.student_id === link.student_id);
        return {
          ...profile,
          relationship: link.relationship,
          enrollment,
        };
      });
    },
    enabled: !!user,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Children</h1>
          <p className="text-muted-foreground">View your children's profiles and class information</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : children?.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No children linked to your account.</p>
                <p className="text-sm mt-2">Please contact the school administrator to link your children.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {children?.map((child) => (
              <Card key={child.user_id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{child.full_name}</CardTitle>
                      <Badge variant="outline" className="capitalize mt-1">
                        {child.relationship || 'Child'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {child.enrollment?.class?.name || 'Not enrolled'}
                      {child.enrollment?.section?.name && ` - ${child.enrollment.section.name}`}
                    </span>
                  </div>
                  {child.enrollment?.roll_number && (
                    <div className="text-sm text-muted-foreground">
                      Roll No: {child.enrollment.roll_number}
                    </div>
                  )}
                  <div className="text-sm text-muted-foreground">
                    {child.email}
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
