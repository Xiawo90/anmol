import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Upload, X, FileText, Image, File } from 'lucide-react';
import { compressFiles } from '@/lib/image-compression';

interface FileUploadProps {
  bucket: 'assignments' | 'submissions' | 'study-materials';
  folder?: string;
  maxFiles?: number;
  acceptedTypes?: string;
  onUploadComplete: (urls: string[]) => void;
  existingFiles?: string[];
}

export function FileUpload({
  bucket,
  folder = '',
  maxFiles = 5,
  acceptedTypes = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif',
  onUploadComplete,
  existingFiles = [],
}: FileUploadProps) {
  const { user } = useAuth();
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingFiles);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <Image className="w-4 h-4" />;
    }
    if (['pdf', 'doc', 'docx'].includes(ext || '')) {
      return <FileText className="w-4 h-4" />;
    }
    return <File className="w-4 h-4" />;
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const totalFiles = uploadedUrls.length + selectedFiles.length;
    
    if (totalFiles > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Compress images > 100KB before uploading
    if (selectedFiles.length > 0) {
      const compressed = await compressFiles(selectedFiles, 100);
      await uploadFilesDirectly(compressed);
    }
  };

  const uploadFilesDirectly = async (filesToUpload: File[]) => {
    setIsUploading(true);
    setProgress(0);

    const newUrls: string[] = [];
    const basePath = folder ? `${user?.id}/${folder}` : user?.id || '';

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `${basePath}/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      newUrls.push(publicUrl);
      setProgress(((i + 1) / filesToUpload.length) * 100);
    }

    const allUrls = [...uploadedUrls, ...newUrls];
    setUploadedUrls(allUrls);
    onUploadComplete(allUrls);
    setIsUploading(false);
    
    if (newUrls.length > 0) {
      toast.success(`${newUrls.length} file(s) uploaded successfully`);
    }
  };

  const removeUploadedFile = (index: number) => {
    const newUrls = uploadedUrls.filter((_, i) => i !== index);
    setUploadedUrls(newUrls);
    onUploadComplete(newUrls);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept={acceptedTypes}
          multiple
          className="hidden"
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || uploadedUrls.length >= maxFiles}
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Uploading...' : 'Select Files'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Accepted: PDF, DOC, DOCX, Images. Max {maxFiles} files.
      </p>

      {isUploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-muted-foreground">Uploading... {Math.round(progress)}%</p>
        </div>
      )}

      {/* Already uploaded files */}
      {uploadedUrls.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Uploaded files:</Label>
          {uploadedUrls.map((url, index) => {
            const fileName = url.split('/').pop() || 'File';
            return (
              <div key={index} className="flex items-center gap-2 p-2 rounded-lg border bg-background">
                {getFileIcon(fileName)}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex-1 truncate text-primary hover:underline"
                >
                  {fileName.split('-').slice(1).join('-') || fileName}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => removeUploadedFile(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
