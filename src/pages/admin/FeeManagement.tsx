import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, DollarSign, CheckCircle, XCircle, Upload, Loader2 } from 'lucide-react';
import { Profile, FeeRecord } from '@/types';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useAuth } from '@/contexts/AuthContext';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FeeManagement() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [form, setForm] = useState({
    student_id: '',
    amount: '',
    month: '',
    year: new Date().getFullYear().toString(),
    due_date: ''
  });

  // Mark Paid dialog state
  const [markPaidDialog, setMarkPaidDialog] = useState(false);
  const [markPaidFeeId, setMarkPaidFeeId] = useState<string | null>(null);
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [feeRes, profilesRes, rolesRes] = await Promise.all([
        supabase.from('fee_records').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*'),
        supabase.from('user_roles').select('user_id, role').eq('role', 'student')
      ]);

      if (feeRes.error) throw feeRes.error;
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const studentUserIds = rolesRes.data?.map(r => r.user_id) || [];
      const studentProfiles = profilesRes.data?.filter(p => studentUserIds.includes(p.user_id)) || [];

      setFeeRecords(feeRes.data || []);
      setStudents(studentProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async () => {
    try {
      const { error } = await supabase.from('fee_records').insert({
        student_id: form.student_id,
        amount: parseFloat(form.amount),
        month: form.month,
        year: parseInt(form.year),
        due_date: form.due_date || null,
        status: 'unpaid',
        school_id: profile?.school_id
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'Fee record created successfully' });
      setShowDialog(false);
      setForm({
        student_id: '',
        amount: '',
        month: '',
        year: new Date().getFullYear().toString(),
        due_date: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating fee record:', error);
      toast({ title: 'Error', description: 'Failed to create fee record', variant: 'destructive' });
    }
  };

  const openMarkPaidDialog = (feeId: string) => {
    setMarkPaidFeeId(feeId);
    setInvoiceFile(null);
    setInvoicePreview(null);
    setMarkPaidDialog(true);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        toast({ title: "Invalid file type", description: "Please upload a PNG, JPG, or PDF file", variant: "destructive" });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Please upload a file smaller than 10MB", variant: "destructive" });
        return;
      }
      setInvoiceFile(selectedFile);
      if (selectedFile.type.startsWith('image/')) {
        setInvoicePreview(URL.createObjectURL(selectedFile));
      } else {
        setInvoicePreview(null);
      }
    }
  };

  const handleMarkPaidWithInvoice = async () => {
    if (!markPaidFeeId || !invoiceFile) return;
    setIsMarkingPaid(true);
    try {
      const fileExt = invoiceFile.name.split('.').pop();
      const filePath = `invoices/${markPaidFeeId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('fee-receipts')
        .upload(filePath, invoiceFile);

      if (uploadError) throw uploadError;

      const receiptNumber = `RCP-${Date.now()}`;
      const { error } = await supabase
        .from('fee_records')
        .update({
          status: 'paid',
          paid_date: new Date().toISOString().split('T')[0],
          receipt_number: receiptNumber,
          invoice_url: filePath,
          invoice_file_name: invoiceFile.name
        })
        .eq('id', markPaidFeeId);

      if (error) throw error;

      toast({ title: 'Success', description: 'Fee marked as paid with invoice uploaded' });
      setMarkPaidDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error:', error);
      toast({ title: 'Error', description: error.message || 'Failed to mark as paid', variant: 'destructive' });
    } finally {
      setIsMarkingPaid(false);
    }
  };

  const getStudentName = (studentId: string) => {
    return students.find(s => s.user_id === studentId)?.full_name || 'Unknown';
  };

  const filteredRecords = feeRecords.filter(record => {
    const studentName = getStudentName(record.student_id).toLowerCase();
    const matchesSearch = studentName.includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = feeRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.amount, 0);
  const totalPending = feeRecords.filter(r => r.status === 'unpaid').reduce((sum, r) => sum + r.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fee Management</h1>
            <p className="text-muted-foreground">Manage student fee records</p>
          </div>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee Record
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Fee Record</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student</Label>
                  <SearchableSelect
                    options={students.map(s => ({ value: s.user_id, label: s.full_name }))}
                    value={form.student_id}
                    onValueChange={(v) => setForm({ ...form, student_id: v })}
                    placeholder="Select student"
                    searchPlaceholder="Search student..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount (PKR)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 5000"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select month" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month) => (
                          <SelectItem key={month} value={month}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Input
                      value={form.year}
                      onChange={(e) => setForm({ ...form, year: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date (optional)</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleCreate}
                  className="w-full"
                  disabled={!form.student_id || !form.amount || !form.month}
                >
                  Create Fee Record
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{feeRecords.length}</p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">PKR {totalCollected.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Collected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="card-gradient">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <XCircle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">PKR {totalPending.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by student name..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Fee Records Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading fee records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No fee records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {getStudentName(record.student_id)}
                      </TableCell>
                      <TableCell>{record.month} {record.year}</TableCell>
                      <TableCell>PKR {record.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === 'paid' ? 'default' :
                            record.status === 'partial' ? 'secondary' : 'destructive'
                          }
                          className="capitalize"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.receipt_number || '-'}</TableCell>
                      <TableCell className="text-right">
                        {record.status !== 'paid' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openMarkPaidDialog(record.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mark Paid with Invoice Upload Dialog */}
      <Dialog open={markPaidDialog} onOpenChange={setMarkPaidDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid - Upload Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Upload the payment invoice (PDF or image) to mark this fee as paid. This invoice will be visible to the parent.
            </p>
            <div className="space-y-2">
              <Label>Invoice File (PDF / PNG / JPG)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleInvoiceFileChange}
                className="cursor-pointer"
              />
              {invoicePreview && (
                <img src={invoicePreview} alt="Invoice preview" className="max-w-full h-48 object-contain rounded-lg border mt-2" />
              )}
              {invoiceFile && !invoicePreview && (
                <p className="text-sm text-muted-foreground mt-1">📄 {invoiceFile.name}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidDialog(false)}>Cancel</Button>
            <Button onClick={handleMarkPaidWithInvoice} disabled={!invoiceFile || isMarkingPaid}>
              {isMarkingPaid ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Mark Paid & Upload</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
