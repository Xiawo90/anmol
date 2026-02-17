import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { FileText, Search, Filter, BookOpen, File, Image, Video, Eye } from 'lucide-react';
import { ResourceLinkButton } from '@/components/materials/ResourceLinkButton';

interface Material {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string | null;
  created_at: string;
  subject: { id: string; name: string } | null;
}

interface Subject {
  id: string;
  name: string;
}

export default function StudentMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('__all__');
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; material: Material | null }>({ open: false, material: null });
  const [rollNumber, setRollNumber] = useState<string | null>(null);

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
      .select('class_id, section_id, roll_number')
      .eq('student_id', user.id)
      .maybeSingle();

    if (enrollment?.roll_number) {
      setRollNumber(enrollment.roll_number);
    }

    if (!enrollment) {
      setLoading(false);
      return;
    }

    // Get materials for student's class
    const { data: materialsData } = await supabase
      .from('study_materials')
      .select(`
        *,
        subject:subjects(id, name)
      `)
      .eq('class_id', enrollment.class_id)
      .order('created_at', { ascending: false });

    if (materialsData) {
      setMaterials(materialsData as Material[]);
      
      // Extract unique subjects
      const uniqueSubjects = new Map<string, Subject>();
      materialsData.forEach((m: any) => {
        if (m.subject) {
          uniqueSubjects.set(m.subject.id, m.subject);
        }
      });
      setSubjects(Array.from(uniqueSubjects.values()));
    }

    setLoading(false);
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-5 h-5" />;
    
    if (fileType.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (fileType.includes('image')) return <Image className="w-5 h-5 text-blue-500" />;
    if (fileType.includes('video')) return <Video className="w-5 h-5 text-purple-500" />;
    if (fileType.includes('doc')) return <FileText className="w-5 h-5 text-blue-500" />;
    
    return <File className="w-5 h-5" />;
  };

  const filteredMaterials = materials.filter(material => {
    const matchesSearch = material.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      material.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubject === '__all__' || material.subject?.id === selectedSubject;
    return matchesSearch && matchesSubject;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold">Study Materials</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Access learning resources shared by your teachers
            {rollNumber && <span className="ml-2 font-medium">(Roll No: {rollNumber})</span>}
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, description, or roll number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Materials Grid */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredMaterials.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No study materials found</p>
                {searchQuery || selectedSubject !== '__all__' ? (
                  <p className="text-sm mt-2">Try adjusting your filters</p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredMaterials.map((material) => (
              <Card 
                key={material.id} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setDetailsDialog({ open: true, material })}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      {getFileIcon(material.file_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate">{material.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {material.subject?.name}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {material.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {material.description}
                    </p>
                  )}
                    <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(parseISO(material.created_at), 'MMM d, yyyy')}
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailsDialog({ open: true, material });
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                      <div onClick={(e) => e.stopPropagation()}>
                        <ResourceLinkButton url={material.file_url} title={material.title} compact />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats */}
        {!loading && filteredMaterials.length > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredMaterials.length} of {materials.length} materials
          </div>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsDialog.open} onOpenChange={(open) => setDetailsDialog({ open, material: open ? detailsDialog.material : null })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailsDialog.material && getFileIcon(detailsDialog.material.file_type)}
              {detailsDialog.material?.title}
            </DialogTitle>
            <DialogDescription>
              {detailsDialog.material?.subject?.name} • {detailsDialog.material?.created_at && format(parseISO(detailsDialog.material.created_at), 'MMM d, yyyy')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Description */}
            <div>
              <Label className="text-sm font-medium">Description</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {detailsDialog.material?.description || 'No description provided'}
              </p>
            </div>

            {/* File Type */}
            <div>
              <Label className="text-sm font-medium">File Type</Label>
              <div className="mt-1">
                <Badge variant="outline">
                  {detailsDialog.material?.file_type || 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* File Preview */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Attached File
              </Label>
              
              {/* Image Preview */}
              {detailsDialog.material?.file_type?.includes('image') && detailsDialog.material?.file_url && (
                <div className="mt-2 rounded-lg border overflow-hidden bg-muted/50">
                  <img 
                    src={detailsDialog.material.file_url} 
                    alt={detailsDialog.material.title}
                    className="w-full max-h-64 object-contain"
                  />
                </div>
              )}
              
              {/* Non-image file info */}
              {!detailsDialog.material?.file_type?.includes('image') && (
                <div className="mt-2 p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {detailsDialog.material && getFileIcon(detailsDialog.material.file_type)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{detailsDialog.material?.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {detailsDialog.material?.file_url?.startsWith('data:') ? 'Downloadable file' : 'External link'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {detailsDialog.material && (
                <ResourceLinkButton url={detailsDialog.material.file_url} title={detailsDialog.material.title} />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
