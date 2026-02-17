import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, CheckCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ReceiptUploadProps {
  parentId: string;
  children: Array<{ user_id: string; full_name: string }>;
  onSuccess?: () => void;
}

export function ReceiptUpload({ parentId, children, onSuccess }: ReceiptUploadProps) {
  const { profile } = useAuth();
  const [selectedChild, setSelectedChild] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, etc.)",
          variant: "destructive"
        });
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive"
        });
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChild || !file) {
      toast({
        title: "Missing information",
        description: "Please select a child and upload a receipt image",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${parentId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('fee-receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('fee-receipts')
        .getPublicUrl(fileName);

      // Insert record
      const { error: insertError } = await supabase
        .from('fee_payment_receipts')
        .insert({
          student_id: selectedChild,
          uploaded_by: parentId,
          file_url: fileName,
          file_name: file.name,
          school_id: profile?.school_id || null,
        });


      if (insertError) throw insertError;

      toast({
        title: "Receipt uploaded",
        description: "Your payment receipt has been submitted for verification"
      });

      // Reset form
      setSelectedChild('');
      setAmountPaid('');
      setNotes('');
      setFile(null);
      setPreviewUrl(null);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload receipt",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Payment Receipt
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Select Child</Label>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger>
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((child) => (
                  <SelectItem key={child.user_id} value={child.user_id}>
                    {child.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount Paid (Optional)</Label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Receipt Image</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {previewUrl && (
              <div className="mt-2">
                <img 
                  src={previewUrl} 
                  alt="Receipt preview" 
                  className="max-w-full h-48 object-contain rounded-lg border"
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              placeholder="Any additional notes about this payment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isUploading || !selectedChild || !file} className="w-full">
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Receipt
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
