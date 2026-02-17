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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { format } from 'date-fns';
import { Plus, Trash2, BookOpen, AlertCircle, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTeacherAssignments } from '@/hooks/useTeacherAssignments';
import { FileUpload } from '@/components/forms/FileUpload';
import { isValidUrl, sanitizeUrl } from '@/lib/url-utils';
import { ResourceLinkButton } from '@/components/materials/ResourceLinkButton';

interface StudyMaterial {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  class_name: string;
  section_name: string | null;
  subject_name: string;
  created_at: string;
}

export default function TeacherMaterials() {
  const { user, isApproved } = useAuth();
  const { assignments: teacherClasses, isLoading: classesLoading, hasAssignments } = useTeacherAssignments();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    file_url: '',
    file_type: 'pdf',
    class_id: '',
  });

  useEffect(() => {
    if (user && isApproved) {
      fetchMaterials();
    }
  }, [user, isApproved]);

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from('study_materials')
        .select(`
          id,
          title,
          description,
          file_url,
          file_type,
          created_at,
          classes:class_id (name),
          sections:section_id (name),
          subjects:subject_id (name)
        `)
        .eq('uploaded_by', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedMaterials = (data || []).map((m: any) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        file_url: m.file_url,
        file_type: m.file_type,
        class_name: m.classes?.name || 'Unknown',
        section_name: m.sections?.name || null,
        subject_name: m.subjects?.name || 'Unknown',
        created_at: m.created_at,
      }));

      setMaterials(formattedMaterials);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Either uploaded file or external URL is required
    const finalFileUrl = uploadedUrls.length > 0 ? uploadedUrls[0] : formData.file_url;
    
    if (!finalFileUrl) {
      toast.error('Please upload a file or provide a URL');
      return;
    }

    // Validate external URL format (skip for uploaded files which are storage URLs)
    if (uploadedUrls.length === 0 && formData.file_url) {
      const sanitized = sanitizeUrl(formData.file_url);
      if (!sanitized) {
        toast.error('Invalid URL format. Only http and https links are allowed.');
        return;
      }
    }

    try {
      const assignment = teacherClasses.find(c => c.id === formData.class_id);
      if (!assignment) return;

      const { error } = await supabase.from('study_materials').insert({
        title: formData.title,
        description: formData.description || null,
        file_url: finalFileUrl,
        file_type: formData.file_type,
        class_id: assignment.class_id,
        section_id: assignment.section_id,
        subject_id: assignment.subject_id,
        uploaded_by: user?.id,
      });

      if (error) throw error;

      toast.success('Material uploaded successfully');
      setIsDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        file_url: '',
        file_type: 'pdf',
        class_id: '',
      });
      setUploadedUrls([]);
      fetchMaterials();
    } catch (error) {
      console.error('Error uploading material:', error);
      toast.error('Failed to upload material');
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
      const { error } = await supabase.from('study_materials').delete().eq('id', id);
      if (error) throw error;
      toast.success('Material deleted');
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      toast.error('Failed to delete material');
    }
  };

  const getFileTypeBadge = (type: string | null) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return <Badge variant="secondary">PDF</Badge>;
      case 'video':
        return <Badge className="bg-purple-500">Video</Badge>;
      case 'doc':
      case 'docx':
        return <Badge className="bg-blue-500">Document</Badge>;
      case 'ppt':
      case 'pptx':
        return <Badge className="bg-orange-500">Presentation</Badge>;
      case 'image':
        return <Badge className="bg-green-500">Image</Badge>;
      default:
        return <Badge variant="outline">{type || 'File'}</Badge>;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold">Study Materials</h1>
            <p className="text-muted-foreground">Upload and manage study materials for your classes</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={classesLoading || !hasAssignments}>
                <Plus className="mr-2 h-4 w-4" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload Study Material</DialogTitle>
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
                    placeholder="e.g., Chapter 1 Notes"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the material..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Upload File</Label>
                  <FileUpload
                    bucket="study-materials"
                    folder="materials"
                    maxFiles={1}
                    acceptedTypes=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif"
                    onUploadComplete={setUploadedUrls}
                    existingFiles={uploadedUrls}
                  />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or provide URL
                    </span>
                  </div>
                </div>

                <div>
                  <Label htmlFor="file_url">External File URL (optional)</Label>
                  <Input
                    id="file_url"
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://..."
                    disabled={uploadedUrls.length > 0}
                  />
                </div>
                
                <div>
                  <Label htmlFor="file_type">File Type</Label>
                  <Select
                    value={formData.file_type}
                    onValueChange={(value) => setFormData({ ...formData, file_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="doc">Document</SelectItem>
                      <SelectItem value="ppt">Presentation</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full" disabled={!formData.class_id || !formData.title}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Material
                </Button>
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
            <CardTitle>All Materials</CardTitle>
            <CardDescription>{materials.length} materials uploaded</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </div>
            ) : materials.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No materials uploaded yet.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {materials.map((material) => (
                    <TableRow key={material.id}>
                      <TableCell className="font-medium">{material.title}</TableCell>
                      <TableCell>
                        {material.class_name} {material.section_name && `- ${material.section_name}`}
                      </TableCell>
                      <TableCell>{material.subject_name}</TableCell>
                      <TableCell>{getFileTypeBadge(material.file_type)}</TableCell>
                      <TableCell>{format(new Date(material.created_at), 'PP')}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <ResourceLinkButton url={material.file_url} title={material.title} compact />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMaterial(material.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}