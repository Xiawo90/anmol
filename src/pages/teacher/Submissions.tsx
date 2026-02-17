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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Eye, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  homework_id: string;
  homework_title: string;
  student_id: string;
  student_name: string;
  content: string | null;
  file_urls: string[] | null;
  status: string;
  submitted_at: string | null;
  grade: string | null;
  teacher_remarks: string | null;
}

export default function TeacherSubmissions() {
  const { user, isApproved } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [selectedHomework, setSelectedHomework] = useState<string>('__all__');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewData, setReviewData] = useState({ grade: '', remarks: '' });

  useEffect(() => {
    if (user && isApproved) {
      fetchHomework();
    }
  }, [user, isApproved]);

  useEffect(() => {
    if (user && isApproved) {
      fetchSubmissions();
    }
  }, [selectedHomework, statusFilter, user, isApproved]);

  const fetchHomework = async () => {
    try {
      const { data, error } = await supabase
        .from('homework')
        .select('id, title')
        .eq('teacher_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHomework(data || []);
    } catch (error) {
      console.error('Error fetching homework:', error);
    }
  };

  const fetchSubmissions = async () => {
    setIsLoading(true);
    try {
      // Get homework IDs for this teacher
      const { data: teacherHomework } = await supabase
        .from('homework')
        .select('id, title')
        .eq('teacher_id', user?.id);

      const homeworkIds = (teacherHomework || []).map(h => h.id);
      if (homeworkIds.length === 0) {
        setSubmissions([]);
        setIsLoading(false);
        return;
      }

      // Create a map of homework id to title
      const homeworkMap = new Map((teacherHomework || []).map(h => [h.id, h.title]));

      let query = supabase
        .from('homework_submissions')
        .select(`
          id,
          homework_id,
          student_id,
          content,
          file_urls,
          status,
          submitted_at,
          grade,
          teacher_remarks
        `)
        .in('homework_id', homeworkIds)
        .order('submitted_at', { ascending: false });

      if (selectedHomework !== '__all__') {
        query = query.eq('homework_id', selectedHomework);
      }

      if (statusFilter !== '__all__') {
        query = query.eq('status', statusFilter as 'pending' | 'submitted' | 'late' | 'reviewed');
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get unique student IDs and fetch their profiles separately
      const studentIds = [...new Set((data || []).map(s => s.student_id))];
      
      let profilesMap = new Map<string, string>();
      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', studentIds);
        
        profilesMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));
      }

      const formattedSubmissions = (data || []).map((s: any) => ({
        id: s.id,
        homework_id: s.homework_id,
        homework_title: homeworkMap.get(s.homework_id) || 'Unknown',
        student_id: s.student_id,
        student_name: profilesMap.get(s.student_id) || 'Unknown',
        content: s.content,
        file_urls: s.file_urls,
        status: s.status,
        submitted_at: s.submitted_at,
        grade: s.grade,
        teacher_remarks: s.teacher_remarks,
      }));

      setSubmissions(formattedSubmissions);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [signedUrls, setSignedUrls] = useState<string[]>([]);

  const openReview = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setReviewData({
      grade: submission.grade || '',
      remarks: submission.teacher_remarks || '',
    });

    // Generate signed URLs for private bucket files
    if (submission.file_urls && submission.file_urls.length > 0) {
      const urls: string[] = [];
      for (const url of submission.file_urls) {
        try {
          // Extract the path from the full URL
          const pathMatch = url.match(/\/submissions\/(.+)$/);
          if (pathMatch) {
            const filePath = pathMatch[1];
            const { data, error } = await supabase.storage
              .from('submissions')
              .createSignedUrl(filePath, 3600); // 1 hour expiry
            
            if (data && !error) {
              urls.push(data.signedUrl);
            } else {
              console.error('Error creating signed URL:', error);
              urls.push(url); // Fallback to original URL
            }
          } else {
            urls.push(url);
          }
        } catch (err) {
          console.error('Error processing URL:', err);
          urls.push(url);
        }
      }
      setSignedUrls(urls);
    } else {
      setSignedUrls([]);
    }
  };

  const submitReview = async () => {
    if (!selectedSubmission) return;

    try {
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          grade: reviewData.grade,
          teacher_remarks: reviewData.remarks,
          status: 'reviewed',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      toast.success('Submission reviewed');
      setSelectedSubmission(null);
      fetchSubmissions();
    } catch (error) {
      console.error('Error reviewing submission:', error);
      toast.error('Failed to submit review');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default">Submitted</Badge>;
      case 'late':
        return <Badge variant="secondary">Late</Badge>;
      case 'reviewed':
        return <Badge className="bg-green-500">Reviewed</Badge>;
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
        <div>
          <h1 className="text-3xl font-heading font-bold">Submissions</h1>
          <p className="text-muted-foreground">Review and grade student submissions</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Select value={selectedHomework} onValueChange={setSelectedHomework}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Filter by homework" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Homework</SelectItem>
                  {homework.map((hw) => (
                    <SelectItem key={hw.id} value={hw.id}>{hw.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>{submissions.length} submissions found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No submissions found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Homework</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell className="font-medium">{submission.student_name}</TableCell>
                      <TableCell>{submission.homework_title}</TableCell>
                      <TableCell>
                        {submission.submitted_at
                          ? format(new Date(submission.submitted_at), 'PPp')
                          : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(submission.status)}</TableCell>
                      <TableCell>{submission.grade || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openReview(submission)}
                        >
                          <Eye className="mr-1 h-4 w-4" />
                          Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Review Submission</DialogTitle>
            </DialogHeader>
            {selectedSubmission && (
              <div className="space-y-4">
                <div>
                  <Label>Student</Label>
                  <p className="font-medium">{selectedSubmission.student_name}</p>
                </div>
                <div>
                  <Label>Homework</Label>
                  <p className="font-medium">{selectedSubmission.homework_title}</p>
                </div>
                <div>
                  <Label>Submission Content</Label>
                  <p className="p-3 bg-muted rounded-md">
                    {selectedSubmission.content || 'No text content provided'}
                  </p>
                </div>
                {signedUrls.length > 0 && (
                  <div>
                    <Label>Attached Files</Label>
                    <div className="space-y-1">
                      {signedUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-primary hover:underline"
                        >
                          File {idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={reviewData.grade}
                    onChange={(e) => setReviewData({ ...reviewData, grade: e.target.value })}
                    placeholder="e.g., A+, 85/100"
                  />
                </div>
                <div>
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea
                    id="remarks"
                    value={reviewData.remarks}
                    onChange={(e) => setReviewData({ ...reviewData, remarks: e.target.value })}
                    rows={3}
                    placeholder="Feedback for the student..."
                  />
                </div>
                <Button onClick={submitReview} className="w-full">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Submit Review
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
