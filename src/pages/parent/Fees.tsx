import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Users, DollarSign, CheckCircle, AlertCircle, Clock, Receipt, FileText, Download } from 'lucide-react';
import { ReceiptUpload } from '@/components/fees/ReceiptUpload';
import { ParentReceiptsList } from '@/components/fees/ParentReceiptsList';
import { Button } from '@/components/ui/button';

export default function ParentFees() {
  const { user } = useAuth();
  const [selectedChild, setSelectedChild] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { data: children } = useQuery({
    queryKey: ['parent-children-list', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: links } = await supabase
        .from('parent_students')
        .select('student_id')
        .eq('parent_id', user.id);

      if (!links?.length) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', links.map(l => l.student_id));

      return profiles || [];
    },
    enabled: !!user,
  });

  const { data: feeRecords, isLoading } = useQuery({
    queryKey: ['parent-child-fees', selectedChild],
    queryFn: async () => {
      if (!selectedChild) return [];

      const { data, error } = await supabase
        .from('fee_records')
        .select('*')
        .eq('student_id', selectedChild)
        .order('year', { ascending: false })
        .order('month', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedChild,
  });

  const stats = React.useMemo(() => {
    if (!feeRecords?.length) return { paid: 0, unpaid: 0, partial: 0, totalDue: 0 };
    
    const unpaidRecords = feeRecords.filter(f => f.status === 'unpaid' || f.status === 'partial');
    const totalDue = unpaidRecords.reduce((sum, f) => {
      if (f.status === 'unpaid') return sum + f.amount;
      return sum; // For partial, we'd need more info about how much is remaining
    }, 0);

    return {
      paid: feeRecords.filter(f => f.status === 'paid').length,
      unpaid: feeRecords.filter(f => f.status === 'unpaid').length,
      partial: feeRecords.filter(f => f.status === 'partial').length,
      totalDue,
    };
  }, [feeRecords]);

  const handleViewInvoice = async (invoiceUrl: string) => {
    const { data } = await supabase.storage
      .from('fee-receipts')
      .createSignedUrl(invoiceUrl, 3600);
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'unpaid':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Unpaid</Badge>;
      case 'partial':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Fee Records</h1>
          <p className="text-muted-foreground">View your children's fee payment status and upload payment receipts</p>
        </div>

        <Tabs defaultValue="records" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="records" className="gap-2">
              <DollarSign className="w-4 h-4" />
              Fee Records
            </TabsTrigger>
            <TabsTrigger value="receipts" className="gap-2">
              <Receipt className="w-4 h-4" />
              Payment Receipts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6 mt-6">
            <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Child</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedChild} onValueChange={setSelectedChild}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select a child" />
              </SelectTrigger>
              <SelectContent>
                {children?.map((child) => (
                  <SelectItem key={child.user_id} value={child.user_id}>
                    {child.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedChild && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.paid}</p>
                      <p className="text-sm text-muted-foreground">Paid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.unpaid}</p>
                      <p className="text-sm text-muted-foreground">Unpaid</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stats.partial}</p>
                      <p className="text-sm text-muted-foreground">Partial</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">PKR {stats.totalDue}</p>
                      <p className="text-sm text-muted-foreground">Total Due</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Fee Records</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : feeRecords?.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No fee records found.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Year</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid Date</TableHead>
                        <TableHead>Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feeRecords?.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium capitalize">{record.month}</TableCell>
                          <TableCell>{record.year}</TableCell>
                          <TableCell>PKR {record.amount}</TableCell>
                          <TableCell>
                            {record.due_date 
                              ? format(new Date(record.due_date), 'PPP')
                              : '-'}
                          </TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                          <TableCell>
                            {record.paid_date 
                              ? format(new Date(record.paid_date), 'PPP')
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {(record as any).invoice_url ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewInvoice((record as any).invoice_url)}
                              >
                                <Download className="w-3 h-3 mr-1" />
                                View
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

            {!selectedChild && children?.length === 0 && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No children linked to your account.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="receipts" className="space-y-6 mt-6">
            {children && children.length > 0 && user ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ReceiptUpload 
                  parentId={user.id} 
                  children={children} 
                  onSuccess={() => setRefreshTrigger(prev => prev + 1)}
                />
                <ParentReceiptsList 
                  parentId={user.id} 
                  children={children}
                  refreshTrigger={refreshTrigger}
                />
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No children linked to your account.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
