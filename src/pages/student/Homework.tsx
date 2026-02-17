import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { FileText, Clock, AlertCircle, CheckCircle, Download, Upload, Paperclip, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { FileUpload } from '@/components/forms/FileUpload';
import { useStudentEnrollment } from '@/hooks/useStudentEnrollment';

interface Homework {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  attachment_urls?: string[];
  subject: { name: string } | null;
  submission?: { id: string; status: string; file_urls: string[] } | null;
}

export default function StudentHomework() {
  const { user } = useAuth();
  const { enrollment } = useStudentEnrollment();
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all');
  const [submitDialog, setSubmitDialog] = useState<{ open: boolean; homework: Homework | null }>({ open: false, homework: null });
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; homework: Homework | null }>({ open: false, homework: null });
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && enrollment) {
      fetchHomework();
    }
  }, [user, enrollment]);

  const fetchHomework = async () => {
    if (!user || !enrollment) return;
    setLoading(true);

    const { data: homeworkData, error } = await supabase
      .from('homework')
      .select(`*, subject:subjects(name)`)
      .eq('class_id', enrollment.class_id)
      .order('deadline', { ascending: true });

    if (!error && homeworkData) {
      const { data: submissions } = await supabase
        .from('homework_submissions')
        .select('id, homework_id, status, file_urls')
        .eq('student_id', user.id);

      const submissionMap = new Map(submissions?.map(s => [s.homework_id, s]) || []);

      const homeworkWithSubmissions = homeworkData.map(hw => ({
        ...hw,
        submission: submissionMap.get(hw.id) || null,
      }));

      setHomework(homeworkWithSubmissions as unknown as Homework[]);
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!submitDialog.homework || !user) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('homework_submissions').insert({
        homework_id: submitDialog.homework.id,
        student_id: user.id,
        content: submissionContent || null,
        file_urls: submissionFiles,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      });

      if (error) throw error;
      toast.success('Assignment submitted successfully!');
      setSubmitDialog({ open: false, homework: null });
      setSubmissionContent('');
      setSubmissionFiles([]);
      fetchHomework();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDeadlineStatus = (deadline: string) => {
    const deadlineDate = parseISO(deadline);
    if (isPast(deadlineDate) && !isToday(deadlineDate)) {
      return { label: 'Overdue', variant: 'destructive' as const, icon: AlertCircle };
    }
    if (isToday(deadlineDate)) {
      return { label: 'Due Today', variant: 'secondary' as const, icon: Clock };
    }
    return { label: 'Upcoming', variant: 'outline' as const, icon: Clock };
  };

  const filteredHomework = homework.filter(hw => {
    if (filter === 'pending') return !hw.submission || hw.submission.status === 'pending';
    if (filter === 'submitted') return hw.submission && hw.submission.status !== 'pending';
    return true;
  });

  const pendingCount = homework.filter(hw => !hw.submission || hw.submission.status === 'pending').length;
  const submittedCount = homework.filter(hw => hw.submission && hw.submission.status !== 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">Homework</h1>
          <p className="text-sm sm:text-base text-muted-foreground">View and submit your assignments</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer" onClick={() => setFilter('all')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{homework.length}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setFilter('pending')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setFilter('submitted')}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{submittedCount}</p>
                  <p className="text-sm text-muted-foreground">Submitted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle>Assignments</CardTitle>
              <div className="flex gap-2">
                {['all', 'pending', 'submitted'].map((f) => (
                  <Badge
                    key={f}
                    variant={filter === f ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => setFilter(f as any)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredHomework.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No assignments found</div>
            ) : (
              <div className="space-y-4">
                {filteredHomework.map((hw) => {
                  const status = getDeadlineStatus(hw.deadline);
                  const StatusIcon = status.icon;
                  return (
                    <div 
                      key={hw.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setDetailsDialog({ open: true, homework: hw })}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{hw.title}</h3>
                          <Badge variant="secondary">{hw.subject?.name}</Badge>
                          {hw.submission && (
                            <Badge variant={hw.submission.status === 'reviewed' ? 'default' : 'outline'}>
                              {hw.submission.status}
                            </Badge>
                          )}
                          {hw.attachment_urls?.length > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Paperclip className="w-3 h-3" />
                              {hw.attachment_urls.length}
                            </Badge>
                          )}
                        </div>
                        {hw.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{hw.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                          <StatusIcon className="w-4 h-4" />
                          <span>Due: {format(parseISO(hw.deadline), 'MMM d, yyyy h:mm a')}</span>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsDialog({ open: true, homework: hw });
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {!hw.submission ? (
                          <Button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubmitDialog({ open: true, homework: hw });
                            }}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Submit
                          </Button>
                        ) : (
                          <Badge variant="outline">Submitted</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={submitDialog.open} onOpenChange={(open) => setSubmitDialog({ open, homework: open ? submitDialog.homework : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit: {submitDialog.homework?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Your Answer (optional)</Label>
              <Textarea
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                placeholder="Write your answer here..."
                rows={4}
              />
            </div>
            <div>
              <Label>Upload Files</Label>
              <FileUpload
                bucket="submissions"
                folder={submitDialog.homework?.id}
                maxFiles={3}
                onUploadComplete={setSubmissionFiles}
                existingFiles={submissionFiles}
              />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Submitting...' : 'Submit Assignment'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, homework: open ? detailsDialog.homework : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {detailsDialog.homework?.title}
            </DialogTitle>
            <DialogDescription>
              {detailsDialog.homework?.subject?.name} • Due: {detailsDialog.homework?.deadline && format(parseISO(detailsDialog.homework.deadline), 'MMM d, yyyy h:mm a')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Description */}
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {detailsDialog.homework?.description || 'No description provided'}
              </p>
            </div>

            {/* Attachments */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <Paperclip className="w-4 h-4" />
                Attachments
              </Label>
              {detailsDialog.homework?.attachment_urls?.length ? (
                <div className="space-y-2 mt-2">
                  {detailsDialog.homework.attachment_urls.map((url, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">Attachment {i + 1}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          if (url.startsWith('data:')) {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `attachment-${i + 1}`;
                            link.click();
                          } else {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <Download className="w-3 h-3 mr-1" />
                        {url.startsWith('data:') ? 'Download' : 'Open'}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">No attachments</p>
              )}
            </div>

            {/* Status */}
            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-1">
                {detailsDialog.homework?.submission ? (
                  <Badge variant={detailsDialog.homework.submission.status === 'reviewed' ? 'default' : 'secondary'}>
                    {detailsDialog.homework.submission.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">Not submitted</Badge>
                )}
              </div>
            </div>

            {/* Action Button */}
            {!detailsDialog.homework?.submission && (
              <Button 
                className="w-full"
                onClick={() => {
                  setDetailsDialog({ open: false, homework: null });
                  setSubmitDialog({ open: true, homework: detailsDialog.homework });
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Submit Assignment
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
