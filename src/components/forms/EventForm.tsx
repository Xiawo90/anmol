import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface EventFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string | null;
    event_type: string | null;
    is_holiday: boolean;
    location: string | null;
    target_class_id: string | null;
  };
}

export function EventForm({ onSuccess, onCancel, initialData }: EventFormProps) {
  const { user, role, profile } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [eventType, setEventType] = useState(initialData?.event_type || 'event');
  const [isHoliday, setIsHoliday] = useState(initialData?.is_holiday || false);
  const [location, setLocation] = useState(initialData?.location || '');
  const [targetClassId, setTargetClassId] = useState(initialData?.target_class_id || '');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    if (role === 'admin') {
      const { data } = await supabase.from('classes').select('id, name').order('name');
      setClasses(data || []);
    } else if (role === 'teacher') {
      const { data } = await supabase
        .from('teacher_assignments')
        .select('class_id, classes:class_id(id, name)')
        .eq('teacher_id', user?.id);
      
      const uniqueClasses = new Map();
      data?.forEach((item: any) => {
        if (item.classes) {
          uniqueClasses.set(item.classes.id, item.classes);
        }
      });
      setClasses(Array.from(uniqueClasses.values()));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        event_type: eventType,
        is_holiday: isHoliday,
        location: location.trim() || null,
        target_class_id: targetClassId || null,
        created_by: user?.id,
        school_id: profile?.school_id,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Event updated');
      } else {
        const { error } = await supabase
          .from('events')
          .insert(eventData);
        if (error) throw error;
        toast.success('Event created');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter event title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the event..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location (optional)</Label>
        <Input
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter event location"
        />
      </div>

      <div className="space-y-2">
        <Label>Event Type</Label>
        <Select value={eventType} onValueChange={setEventType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="event">General Event</SelectItem>
            <SelectItem value="academic">Academic</SelectItem>
            <SelectItem value="cultural">Cultural</SelectItem>
            <SelectItem value="sports">Sports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Target Class (optional)</Label>
        <Select value={targetClassId || "all"} onValueChange={(v) => setTargetClassId(v === "all" ? "" : v)}>
          <SelectTrigger>
            <SelectValue placeholder="All classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {role === 'admin' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="holiday">Mark as Holiday</Label>
          <Switch
            id="holiday"
            checked={isHoliday}
            onCheckedChange={setIsHoliday}
          />
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
}
