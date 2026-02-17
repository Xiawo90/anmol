import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Bell, AlertTriangle, Info, Calendar, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AnnouncementForm } from '@/components/forms/AnnouncementForm';
import { useStudentEnrollment } from '@/hooks/useStudentEnrollment';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string | null;
  is_emergency: boolean | null;
  target_role: string | null;
  target_class_id: string | null;
  expires_at: string | null;
  created_at: string | null;
  created_by: string;
  classes?: { name: string } | null;
}

export default function Announcements() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { enrollment, isLoading: enrollmentLoading } = useStudentEnrollment();
  const { classIds: teacherClassIds, isLoading: teacherLoading } = useTeacherAssignments();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);

  const canManage = role === 'admin' || role === 'teacher';

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements', role, enrollment?.class_id, teacherClassIds],
    queryFn: async () => {
      let query = supabase
        .from('announcements')
        .select('*, classes:target_class_id(name)')
        .order('created_at', { ascending: false });

      const currentRole = role;

      // Admin sees all
      if (currentRole === 'admin') {
        // No filter needed
      }
      // Students see: global announcements, announcements for their role, or their class
      else if (currentRole === 'student') {
        const filters = ['target_class_id.is.null', 'target_role.eq.student', 'target_role.is.null'];
        if (enrollment?.class_id) {
          filters.push(`target_class_id.eq.${enrollment.class_id}`);
        }
        query = query.or(filters.join(','));
      }
      // Parents see: global announcements, announcements for their role, or their child's class
      else if (currentRole === 'parent') {
        const filters = ['target_class_id.is.null', 'target_role.eq.parent', 'target_role.is.null'];
        if (enrollment?.class_id) {
          filters.push(`target_class_id.eq.${enrollment.class_id}`);
        }
        query = query.or(filters.join(','));
      }
      // Teachers see: global announcements, announcements for their role, or their assigned classes
      else if (currentRole === 'teacher') {
        const filters = ['target_class_id.is.null', 'target_role.eq.teacher', 'target_role.is.null'];
        teacherClassIds.forEach(id => {
          filters.push(`target_class_id.eq.${id}`);
        });
        query = query.or(filters.join(','));
      }
      // Fallback: show global announcements only
      else {
        query = query.is('target_class_id', null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Announcement[];
    },
    enabled: !!role && (
      role === 'admin' || 
      (role === 'teacher' && !teacherLoading) || 
      ((role === 'student' || role === 'parent') && !enrollmentLoading)
    ),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: () => {
      toast.error('Failed to delete announcement');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingAnnouncement(null);
    queryClient.invalidateQueries({ queryKey: ['announcements'] });
  };

  const canEditAnnouncement = (announcement: Announcement) => {
    if (role === 'admin') return true;
    if (role === 'teacher' && announcement.created_by === user?.id) return true;
    return false;
  };

  const getAnnouncementIcon = (type: string | null, isEmergency: boolean | null) => {
    if (isEmergency) return <AlertTriangle className="w-5 h-5 text-destructive" />;
    if (type === 'info') return <Info className="w-5 h-5 text-info" />;
    return <Bell className="w-5 h-5 text-primary" />;
  };

  const getAnnouncementBadge = (type: string | null, isEmergency: boolean | null) => {
    if (isEmergency) return <Badge variant="destructive">Urgent</Badge>;
    if (type === 'info') return <Badge variant="secondary">Info</Badge>;
    return <Badge>General</Badge>;
  };

  const showLoading = isLoading || enrollmentLoading || teacherLoading;

  return (
    <DashboardLayout>
      <div className="section-container">
        <div className="content-area space-responsive">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="page-header">
              <h1 className="page-title">Announcements</h1>
              <p className="page-subtitle">Stay updated with the latest news and updates</p>
            </div>
            {canManage && (
              <Button onClick={() => { setEditingAnnouncement(null); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Announcement
              </Button>
            )}
          </div>

          {showLoading ? (
            <div className="responsive-grid-2">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="card-base animate-pulse">
                  <CardHeader className="pb-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : announcements && announcements.length > 0 ? (
            <div className="responsive-grid-2">
              {announcements.map((announcement) => (
                <Card
                  key={announcement.id}
                  className={`card-hover ${announcement.is_emergency ? 'border-destructive/50' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {getAnnouncementIcon(announcement.type, announcement.is_emergency)}
                        <CardTitle className="text-base md:text-lg leading-tight truncate">
                          {announcement.title}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        {getAnnouncementBadge(announcement.type, announcement.is_emergency)}
                        {canEditAnnouncement(announcement) && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(announcement)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(announcement.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm md:text-base mb-4 whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {announcement.created_at
                          ? format(new Date(announcement.created_at), 'MMM d, yyyy')
                          : 'Unknown date'}
                      </span>
                      {announcement.classes && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {announcement.classes.name}
                        </Badge>
                      )}
                      {!announcement.target_class_id && (
                        <Badge variant="outline" className="text-xs">
                          All Classes
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="card-base">
              <CardContent className="card-content-responsive text-center py-12">
                <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Announcements</h3>
                <p className="text-muted-foreground text-sm">
                  {(role === 'student' || role === 'parent') && !enrollment?.class_id
                    ? 'You are not assigned to a class yet. Please contact the administrator.'
                    : role === 'teacher' && teacherClassIds.length === 0
                    ? 'You have no assigned classes yet. Please contact the administrator.'
                    : 'There are no announcements for your class at the moment.'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
            </DialogTitle>
          </DialogHeader>
          <AnnouncementForm
            onSuccess={handleFormSuccess}
            onCancel={() => { setIsFormOpen(false); setEditingAnnouncement(null); }}
            initialData={editingAnnouncement ? {
              id: editingAnnouncement.id,
              title: editingAnnouncement.title,
              content: editingAnnouncement.content,
              target_role: editingAnnouncement.target_role,
              target_class_id: editingAnnouncement.target_class_id,
              is_emergency: editingAnnouncement.is_emergency || false,
              expires_at: editingAnnouncement.expires_at,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
