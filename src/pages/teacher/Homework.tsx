import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format, isPast } from 'date-fns';
import { Plus, FileText, Trash2, Download, Paperclip, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/forms/FileUpload';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  class_name: string;
  section_name: string | null;
  subject_name: string;
  allow_late_submission: boolean;
  submissions_count: number;
  attachment_urls: string[];
}

export default function TeacherHomework() {
  const { user, isApproved } = useAuth();
  const { assignments: teacherClasses, isLoading: classesLoading, hasAssignments } = useTeacherAssignments();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    deadline: '',
    class_id: '',
    section_id: '',
    subject_id: '',
    allow_late_submission: false,
    allow_resubmission: false,
  });

  useEffect(() => {
    if (user && isApproved) {
      fetchHomework();
    }
  }, [user, isApproved]);

  const fetchHomework = async () => {
    try {
      const { data, error } = await supabase
        .from('homework')
        .select(`
          id,
          title,
          description,
          deadline,
          allow_late_submission,
          attachment_urls,
          class_id,
          section_id,
          subject_id,
          classes:class_id (name),
          sections:section_id (name),
          subjects:subject_id (name)
        `)
        .eq('teacher_id', user?.id)
        .order('deadline', { ascending: false });

      if (error) throw error;

      const homeworkWithCounts = await Promise.all(
        (data || []).map(async (hw: any) => {
          const { count } = await supabase
            .from('homework_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('homework_id', hw.id);

          return {
            id: hw.id,
            title: hw.title,
            description: hw.description,
            deadline: hw.deadline,
            class_name: hw.classes?.name || 'Unknown',
            section_name: hw.sections?.name || null,
            subject_name: hw.subjects?.name || 'Unknown',
            allow_late_submission: hw.allow_late_submission,
            submissions_count: count || 0,
            attachment_urls: hw.attachment_urls || [],
          };
        })
      );

      setHomework(homeworkWithCounts);
    } catch (error) {
      console.error('Error fetching homework:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const assignment = teacherClasses.find(c => c.id === formData.class_id);
      if (!assignment) return;

      const { error } = await supabase.from('homework').insert({
        title: formData.title,
        description: formData.description || null,
        deadline: new Date(formData.deadline).toISOString(),
        class_id: assignment.class_id,
        section_id: assignment.section_id,
        subject_id: assignment.subject_id,
        teacher_id: user?.id,
        allow_late_submission: formData.allow_late_submission,
        allow_resubmission: formData.allow_resubmission,
        attachment_urls: attachmentUrls,
      });

      if (error) throw error;

      toast.success('Assignment created successfully');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        deadline: '',
        class_id: '',
        section_id: '',
        subject_id: '',
        allow_late_submission: false,
        allow_resubmission: false,
      });
      setAttachmentUrls([]);
      fetchHomework();
    } catch (error) {
      console.error('Error creating homework:', error);
      toast.error('Failed to create assignment');
    }
  };

  const deleteHomework = async (id: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase.from('homework').delete().eq('id', id);
      if (error) throw error;
      toast.success('Assignment deleted');
      fetchHomework();
    } catch (error) {
      console.error('Error deleting homework:', error);
      toast.error('Failed to delete assignment');
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Assignments</h1>
            <p className="text-muted-foreground">Create and manage homework assignments</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={classesLoading || !hasAssignments}>
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="class">Class & Subject *</Label>
                  <Select
                    value={formData.class_id}
                    onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={classesLoading ? "Loading classes..." : "Select class"} />
                    </SelectTrigger>
                    <SelectContent>
                      {classesLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : teacherClasses.length === 0 ? (
                        <div className="py-4 px-2 text-sm text-muted-foreground text-center">
                          No classes assigned
                        </div>
                      ) : (
                        teacherClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.class_name} {c.section_name ? `- ${c.section_name}` : ''} ({c.subject_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Assignment title"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Instructions</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide detailed instructions for students..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="deadline">Due Date *</Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    required
                  />
                </div>
                
                <div>
                  <Label>Attachments</Label>
                  <FileUpload
                    bucket="assignments"
                    folder="homework"
                    maxFiles={5}
                    onUploadComplete={setAttachmentUrls}
                    existingFiles={attachmentUrls}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="late">Allow Late Submission</Label>
                  <Switch
                    id="late"
                    checked={formData.allow_late_submission}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_late_submission: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="resubmit">Allow Resubmission</Label>
                  <Switch
                    id="resubmit"
                    checked={formData.allow_resubmission}
                    onCheckedChange={(checked) => setFormData({ ...formData, allow_resubmission: checked })}
                  />
                </div>
                <Button type="submit" className="w-full">Create Assignment</Button>
              </form>
            </DialogContent>
          </Dialog>
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
            <CardTitle>All Assignments</CardTitle>
            <CardDescription>{homework.length} assignment(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : homework.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No assignments created yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead className="hidden md:table-cell">Class</TableHead>
                      <TableHead className="hidden sm:table-cell">Subject</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="hidden sm:table-cell">Submissions</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {homework.map((hw) => (
                      <TableRow key={hw.id}>
                        <TableCell>
                          <div className="font-medium">{hw.title}</div>
                          {hw.attachment_urls.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <Paperclip className="w-3 h-3" />
                              {hw.attachment_urls.length} file(s)
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {hw.class_name} {hw.section_name && `- ${hw.section_name}`}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{hw.subject_name}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(hw.deadline), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{hw.submissions_count}</TableCell>
                        <TableCell>
                          {isPast(new Date(hw.deadline)) ? (
                            <Badge variant="secondary">Closed</Badge>
                          ) : (
                            <Badge variant="default">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {hw.attachment_urls.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                              >
                                <a href={hw.attachment_urls[0]} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteHomework(hw.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
