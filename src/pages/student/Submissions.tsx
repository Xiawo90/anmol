import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { FileText, Upload, Eye, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Submission {
  id: string;
  homework_id: string;
  content: string | null;
  status: string;
  grade: string | null;
  teacher_remarks: string | null;
  submitted_at: string | null;
  homework: {
    title: string;
    deadline: string;
    subject: { name: string } | null;
  } | null;
}

interface PendingHomework {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  subject: { name: string } | null;
}

export default function StudentSubmissions() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pendingHomework, setPendingHomework] = useState<PendingHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHomework, setSelectedHomework] = useState<PendingHomework | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);

    // Get student's enrollment
    const { data: enrollment } = await supabase
      .from('student_enrollments')
      .select('class_id, section_id')
      .eq('student_id', user.id)
      .maybeSingle();

    if (!enrollment) {
      setLoading(false);
      return;
    }

    // Get all submissions
    const { data: submissionData } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        homework:homework(
          title,
          deadline,
          subject:subjects(name)
        )
      `)
      .eq('student_id', user.id)
      .order('submitted_at', { ascending: false });

    if (submissionData) {
      setSubmissions(submissionData as Submission[]);
    }

    // Get homework for student's class that hasn't been submitted yet
    const { data: homeworkData } = await supabase
      .from('homework')
      .select(`
        *,
        subject:subjects(name)
      `)
      .eq('class_id', enrollment.class_id)
      .order('deadline', { ascending: true });

    if (homeworkData && submissionData) {
      const submittedIds = new Set(submissionData.map(s => s.homework_id));
      const pending = homeworkData.filter(hw => !submittedIds.has(hw.id));
      setPendingHomework(pending as PendingHomework[]);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user || !selectedHomework || !submissionContent.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your submission content',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from('homework_submissions').insert({
      homework_id: selectedHomework.id,
      student_id: user.id,
      content: submissionContent,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit homework',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Homework submitted successfully',
      });
      setDialogOpen(false);
      setSubmissionContent('');
      setSelectedHomework(null);
      fetchData();
    }

    setSubmitting(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'reviewed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'late':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <FileText className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      reviewed: 'default',
      submitted: 'secondary',
      late: 'destructive',
      pending: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">My Submissions</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Submit and track your homework assignments</p>
        </div>

        {/* Pending Submissions */}
        {pendingHomework.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Upload className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>Pending Submissions ({pendingHomework.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingHomework.map((hw) => (
                  <div
                    key={hw.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{hw.title}</h3>
                        <Badge variant="secondary">{hw.subject?.name}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due: {format(parseISO(hw.deadline), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <Dialog open={dialogOpen && selectedHomework?.id === hw.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (!open) {
                        setSelectedHomework(null);
                        setSubmissionContent('');
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => setSelectedHomework(hw)}>
                          <Upload className="w-4 h-4 mr-2" />
                          Submit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Submit: {hw.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          {hw.description && (
                            <div className="p-3 rounded-lg bg-muted">
                              <p className="text-sm">{hw.description}</p>
                            </div>
                          )}
                          <div>
                            <label className="text-sm font-medium">Your Answer</label>
                            <Textarea
                              placeholder="Enter your answer or notes..."
                              value={submissionContent}
                              onChange={(e) => setSubmissionContent(e.target.value)}
                              className="mt-2"
                              rows={6}
                            />
                          </div>
                          <Button
                            onClick={handleSubmit}
                            disabled={submitting || !submissionContent.trim()}
                            className="w-full"
                          >
                            {submitting ? 'Submitting...' : 'Submit Homework'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Submitted Homework */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Submitted Homework</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No submissions yet
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-card gap-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusIcon(submission.status)}
                        <h3 className="font-semibold">{submission.homework?.title}</h3>
                        <Badge variant="secondary">{submission.homework?.subject?.name}</Badge>
                        {getStatusBadge(submission.status)}
                      </div>
                      {submission.submitted_at && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Submitted: {format(parseISO(submission.submitted_at), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                      {submission.grade && (
                        <p className="text-sm font-medium mt-1">
                          Grade: <span className="text-primary">{submission.grade}</span>
                        </p>
                      )}
                      {submission.teacher_remarks && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Remarks: {submission.teacher_remarks}
                        </p>
                      )}
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{submission.homework?.title}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div>
                            <label className="text-sm font-medium">Your Submission</label>
                            <div className="mt-2 p-3 rounded-lg bg-muted">
                              <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                            </div>
                          </div>
                          {submission.teacher_remarks && (
                            <div>
                              <label className="text-sm font-medium">Teacher Remarks</label>
                              <div className="mt-2 p-3 rounded-lg bg-muted">
                                <p className="text-sm">{submission.teacher_remarks}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-4">
                            <div>
                              <label className="text-sm font-medium">Status</label>
                              <p className="mt-1">{getStatusBadge(submission.status)}</p>
                            </div>
                            {submission.grade && (
                              <div>
                                <label className="text-sm font-medium">Grade</label>
                                <p className="mt-1 font-bold text-primary">{submission.grade}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
