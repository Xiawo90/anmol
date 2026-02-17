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

interface AnnouncementFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id: string;
    title: string;
    content: string;
    target_role: string | null;
    target_class_id: string | null;
    is_emergency: boolean;
    expires_at: string | null;
  };
}

export function AnnouncementForm({ onSuccess, onCancel, initialData }: AnnouncementFormProps) {
  const { user, role, profile } = useAuth();
  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [targetAudience, setTargetAudience] = useState<'all' | 'class'>('all');
  const [targetClassId, setTargetClassId] = useState(initialData?.target_class_id || '');
  const [isEmergency, setIsEmergency] = useState(initialData?.is_emergency || false);
  const [expiresAt, setExpiresAt] = useState(initialData?.expires_at?.split('T')[0] || '');
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchClasses();
    if (initialData?.target_class_id) {
      setTargetAudience('class');
    }
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
      const announcementData = {
        title: title.trim(),
        content: content.trim(),
        target_class_id: targetAudience === 'class' ? targetClassId : null,
        target_role: null,
        is_emergency: isEmergency,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
        created_by: user?.id,
        school_id: profile?.school_id,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from('announcements')
          .update(announcementData)
          .eq('id', initialData.id);
        if (error) throw error;
        toast.success('Announcement updated');
      } else {
        const { error } = await supabase
          .from('announcements')
          .insert(announcementData);
        if (error) throw error;
        toast.success('Announcement created');
      }

      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save announcement');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Description *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement here..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Target Audience</Label>
        <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as 'all' | 'class')}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="class">Specific Class</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {targetAudience === 'class' && (
        <div className="space-y-2">
          <Label>Select Class *</Label>
          <Select value={targetClassId} onValueChange={setTargetClassId} required>
            <SelectTrigger>
              <SelectValue placeholder="Choose a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="expires">Expiry Date (optional)</Label>
        <Input
          id="expires"
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="emergency">Mark as Urgent</Label>
        <Switch
          id="emergency"
          checked={isEmergency}
          onCheckedChange={setIsEmergency}
        />
      </div>

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
