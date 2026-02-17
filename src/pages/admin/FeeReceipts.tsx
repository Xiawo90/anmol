import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { Receipt, CheckCircle, XCircle, Clock, Eye, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface ReceiptWithDetails {
  id: string;
  student_id: string;
  uploaded_by: string;
  file_url: string;
  file_name: string | null;
  fee_record_id: string | null;
  status: string;
  admin_remarks: string | null;
  created_at: string;
  student_name?: string;
  parent_name?: string;
}

export default function AdminFeeReceipts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptWithDetails | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [adminRemarks, setAdminRemarks] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const { data: receipts, isLoading } = useQuery({
    queryKey: ['admin-fee-receipts'],
    queryFn: async () => {
      const { data: receiptsData, error } = await supabase
        .from('fee_payment_receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch student and parent names
      const studentIds = [...new Set(receiptsData.map(r => r.student_id))];
      const uploaderIds = [...new Set(receiptsData.map(r => r.uploaded_by))];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', [...studentIds, ...uploaderIds]);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return receiptsData.map(receipt => ({
        ...receipt,
        student_name: profileMap.get(receipt.student_id) || 'Unknown',
        parent_name: profileMap.get(receipt.uploaded_by) || 'Unknown'
      })) as ReceiptWithDetails[];
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, remarks }: { id: string; status: string; remarks: string }) => {
      const { error } = await supabase
        .from('fee_payment_receipts')
        .update({
          status,
          admin_remarks: remarks,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-fee-receipts'] });
      setSelectedReceipt(null);
      setImageUrl(null);
      setAdminRemarks('');
      toast({ title: "Receipt updated", description: "The receipt status has been updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update receipt",
        variant: "destructive"
      });
    }
  });

  const handleViewReceipt = async (receipt: ReceiptWithDetails) => {
    setSelectedReceipt(receipt);
    setAdminRemarks(receipt.admin_remarks || '');
    
    const { data } = await supabase.storage
      .from('fee-receipts')
      .createSignedUrl(receipt.file_url, 3600);
    
    setImageUrl(data?.signedUrl || null);
  };

  const handleUpdateStatus = (status: 'approved' | 'rejected') => {
    if (!selectedReceipt) return;
    updateMutation.mutate({
      id: selectedReceipt.id,
      status,
      remarks: adminRemarks
    });
  };

  const filteredReceipts = receipts?.filter(r => 
    filter === 'all' ? true : r.status === filter
  ) || [];

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

  const pendingCount = receipts?.filter(r => r.status === 'pending').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fee Payment Receipts</h1>
          <p className="text-muted-foreground">Review and verify payment receipts uploaded by parents</p>
        </div>

        {pendingCount > 0 && (
          <Card className="border-warning bg-warning/5">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-warning" />
                <span>You have <strong>{pendingCount}</strong> pending receipts to review</span>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status}
              {status === 'pending' && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">{pendingCount}</Badge>
              )}
            </Button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Uploaded Receipts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : filteredReceipts.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No receipts found</p>
            ) : (
              <div className="space-y-4">
                {filteredReceipts.map((receipt) => (
                  <div 
                    key={receipt.id} 
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleViewReceipt(receipt)}
                      className="flex-shrink-0"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{receipt.student_name}</span>
                        {getStatusBadge(receipt.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        <User className="w-3 h-3 inline mr-1" />
                        Parent: {receipt.parent_name}
                      </p>
                      {receipt.file_name && (
                        <p className="text-sm text-muted-foreground">
                          File: {receipt.file_name}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Uploaded: {format(new Date(receipt.created_at), 'PPP p')}
                      </p>
                      {receipt.admin_remarks && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          {receipt.admin_remarks}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedReceipt} onOpenChange={() => {
        setSelectedReceipt(null);
        setImageUrl(null);
        setAdminRemarks('');
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Receipt</DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium">{selectedReceipt.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parent</p>
                  <p className="font-medium">{selectedReceipt.parent_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">File</p>
                  <p className="font-medium">
                    {selectedReceipt.file_name || 'Receipt'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedReceipt.status)}
                </div>
              </div>

              {selectedReceipt.admin_remarks && (
                <div>
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="p-2 bg-muted rounded">{selectedReceipt.admin_remarks}</p>
                </div>
              )}

              {imageUrl && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Receipt Image</p>
                  <img 
                    src={imageUrl} 
                    alt="Receipt" 
                    className="w-full max-h-[400px] object-contain border rounded-lg"
                  />
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-2">Admin Remarks</p>
                <Textarea
                  placeholder="Add remarks (optional)"
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedReceipt?.status === 'pending' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateStatus('rejected')}
                  disabled={updateMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={updateMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
