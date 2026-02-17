import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarDays, Clock, MapPin, Calendar, PartyPopper, GraduationCap, Users, Plus, Edit, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isPast, isFuture, isToday } from 'date-fns';
import { toast } from 'sonner';
import { EventForm } from '@/components/forms/EventForm';
import { useStudentEnrollment } from '@/hooks/useStudentEnrollment';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  event_type: string | null;
  is_holiday: boolean | null;
  location?: string | null;
  target_class_id: string | null;
  created_by: string | null;
  classes?: { name: string } | null;
}

export default function Events() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const { enrollment } = useStudentEnrollment();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  const canManage = role === 'admin' || role === 'teacher';

  const { data: events, isLoading } = useQuery({
    queryKey: ['events', role, enrollment?.class_id],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*, classes:target_class_id(name)')
        .order('start_date', { ascending: true });

      // Students and parents only see events for their class or global
      if (role === 'student' || role === 'parent') {
        if (enrollment?.class_id) {
          query = query.or(`target_class_id.is.null,target_class_id.eq.${enrollment.class_id}`);
        } else {
          query = query.is('target_class_id', null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Event[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
    onError: () => {
      toast.error('Failed to delete event');
    },
  });

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
    queryClient.invalidateQueries({ queryKey: ['events'] });
  };

  const canEditEvent = (event: Event) => {
    if (role === 'admin') return true;
    if (role === 'teacher' && event.created_by === user?.id) return true;
    return false;
  };

  const upcomingEvents = events?.filter(event => 
    isFuture(new Date(event.start_date)) || isToday(new Date(event.start_date))
  );
  
  const pastEvents = events?.filter(event => 
    isPast(new Date(event.start_date)) && !isToday(new Date(event.start_date))
  );

  const getEventIcon = (type: string | null) => {
    switch (type) {
      case 'academic':
        return <GraduationCap className="w-5 h-5" />;
      case 'cultural':
        return <PartyPopper className="w-5 h-5" />;
      case 'sports':
        return <Users className="w-5 h-5" />;
      default:
        return <CalendarDays className="w-5 h-5" />;
    }
  };

  const getEventBadgeColor = (type: string | null, isHoliday: boolean | null) => {
    if (isHoliday) return 'destructive';
    switch (type) {
      case 'academic':
        return 'default';
      case 'cultural':
        return 'secondary';
      case 'sports':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const renderEventCards = (eventList: typeof events) => {
    if (!eventList || eventList.length === 0) {
      return (
        <Card className="card-base">
          <CardContent className="card-content-responsive text-center py-12">
            <CalendarDays className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Events</h3>
            <p className="text-muted-foreground text-sm">
              There are no events to display in this category.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="responsive-grid-3">
        {eventList.map((event) => (
          <Card key={event.id} className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    event.is_holiday ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                  }`}>
                    {getEventIcon(event.event_type)}
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base leading-tight truncate">
                      {event.title}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground capitalize mt-0.5">
                      {event.event_type || 'General'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant={getEventBadgeColor(event.event_type, event.is_holiday)}>
                    {event.is_holiday ? 'Holiday' : event.event_type || 'Event'}
                  </Badge>
                  {canEditEvent(event) && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(event)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(event.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {event.description && (
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {event.description}
                </p>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>
                    {format(new Date(event.start_date), 'EEE, MMM d, yyyy')}
                  </span>
                </div>
                {event.end_date && event.end_date !== event.start_date && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>
                      Until {format(new Date(event.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.classes && (
                  <Badge variant="outline" className="mt-2">
                    {event.classes.name}
                  </Badge>
                )}
              </div>
              
              {isToday(new Date(event.start_date)) && (
                <Badge className="mt-4" variant="default">
                  Today
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="section-container">
        <div className="content-area space-responsive">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="page-header">
              <h1 className="page-title">Events & Calendar</h1>
              <p className="page-subtitle">View upcoming events, holidays, and important dates</p>
            </div>
            {canManage && (
              <Button onClick={() => { setEditingEvent(null); setIsFormOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{events?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Total Events</p>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{upcomingEvents?.length || 0}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <PartyPopper className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {events?.filter(e => e.is_holiday).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Holidays</p>
                </div>
              </div>
            </Card>
            <Card className="stat-card">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-info/10 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {events?.filter(e => e.event_type === 'academic').length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Academic</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Events Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="upcoming" className="flex-1 sm:flex-none">
                Upcoming ({upcomingEvents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="past" className="flex-1 sm:flex-none">
                Past ({pastEvents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 sm:flex-none">
                All ({events?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="mt-6">
              {isLoading ? (
                <div className="responsive-grid-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="card-base animate-pulse">
                      <CardHeader>
                        <div className="h-5 bg-muted rounded w-3/4" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="h-4 bg-muted rounded w-full" />
                          <div className="h-4 bg-muted rounded w-1/2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                renderEventCards(upcomingEvents)
              )}
            </TabsContent>

            <TabsContent value="past" className="mt-6">
              {renderEventCards(pastEvents)}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              {renderEventCards(events)}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Create Event'}
            </DialogTitle>
          </DialogHeader>
          <EventForm
            onSuccess={handleFormSuccess}
            onCancel={() => { setIsFormOpen(false); setEditingEvent(null); }}
            initialData={editingEvent ? {
              id: editingEvent.id,
              title: editingEvent.title,
              description: editingEvent.description,
              start_date: editingEvent.start_date,
              end_date: editingEvent.end_date,
              event_type: editingEvent.event_type,
              is_holiday: editingEvent.is_holiday || false,
              location: editingEvent.location,
              target_class_id: editingEvent.target_class_id,
            } : undefined}
          />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
