import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Receipt, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ReceiptRecord {
  id: string;
  student_id: string;
  file_url: string;
  file_name: string | null;
  fee_record_id: string | null;
  uploaded_by: string;
  status: string;
  admin_remarks: string | null;
  created_at: string;
}

interface ParentReceiptsListProps {
  parentId: string;
  children: Array<{ user_id: string; full_name: string }>;
  refreshTrigger?: number;
}

export function ParentReceiptsList({ parentId, children, refreshTrigger }: ParentReceiptsListProps) {
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_payment_receipts')
        .select('*')
        .eq('uploaded_by', parentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [parentId, refreshTrigger]);

  const getChildName = (studentId: string) => {
    const child = children.find(c => c.user_id === studentId);
    return child?.full_name || 'Unknown';
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('fee-receipts')
      .createSignedUrl(path, 3600);
    return data?.signedUrl;
  };

  const handleViewImage = async (imagePath: string) => {
    const url = await getSignedUrl(imagePath);
    if (url) {
      setSelectedImage(url);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading receipts...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" />
            Uploaded Receipts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No receipts uploaded yet
            </p>
          ) : (
            <div className="space-y-4">
              {receipts.map((receipt) => (
                <div 
                  key={receipt.id} 
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <button
                    onClick={() => handleViewImage(receipt.file_url)}
                    className="flex-shrink-0 w-16 h-16 bg-muted rounded-lg flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Eye className="w-6 h-6 text-muted-foreground" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getChildName(receipt.student_id)}</span>
                      {getStatusBadge(receipt.status)}
                    </div>
                    {receipt.file_name && (
                      <p className="text-sm text-muted-foreground mt-1">
                        File: {receipt.file_name}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(receipt.created_at), 'PPP')}
                    </p>
                    {receipt.admin_remarks && (
                      <p className="text-sm mt-2 p-2 bg-muted rounded">
                        <strong>Admin:</strong> {receipt.admin_remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Receipt Image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Receipt" 
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
