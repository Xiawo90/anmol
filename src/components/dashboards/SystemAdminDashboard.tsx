import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, School, Clock, Plus, Building2, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { StorageView } from './StorageView';

interface SchoolData {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
  admin_count?: number;
}

export function SystemAdminDashboard() {
  const { toast } = useToast();
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [schoolForm, setSchoolForm] = useState({ name: '', address: '', phone: '', email: '' });
  const [aiHelperEnabled, setAiHelperEnabled] = useState(true);
  const [aiToggleLoading, setAiToggleLoading] = useState(false);

  useEffect(() => {
    fetchData();
    fetchAiHelperSetting();
  }, []);

  const fetchData = async () => {
    try {
      const [schoolsRes, adminsRes, rolesRes] = await Promise.all([
        supabase.from('schools').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id, role').eq('role', 'admin'),
      ]);

      const adminUserIds = new Set((rolesRes.data || []).map(r => r.user_id));
      const adminProfiles = (adminsRes.data || []).filter(p => adminUserIds.has(p.user_id));

      // Count admins per school
      const schoolAdminCounts = new Map<string, number>();
      adminProfiles.forEach(a => {
        if (a.school_id) {
          schoolAdminCounts.set(a.school_id, (schoolAdminCounts.get(a.school_id) || 0) + 1);
        }
      });

      const schoolsWithCounts = (schoolsRes.data || []).map(s => ({
        ...s,
        admin_count: schoolAdminCounts.get(s.id) || 0,
      }));

      setSchools(schoolsWithCounts);
      setAdmins(adminProfiles);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAiHelperSetting = async () => {
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'ai_helper_enabled')
        .maybeSingle();
      
      if (data?.value !== null && data?.value !== undefined) {
        setAiHelperEnabled(data.value === true || data.value === 'true');
      }
    } catch (error) {
      console.error('Error fetching AI helper setting:', error);
    }
  };

  const toggleAiHelper = async (enabled: boolean) => {
    setAiToggleLoading(true);
    try {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', 'ai_helper_enabled')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: enabled as unknown as any, updated_at: new Date().toISOString() })
          .eq('key', 'ai_helper_enabled');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: 'ai_helper_enabled', value: enabled as unknown as any });
        if (error) throw error;
      }

      setAiHelperEnabled(enabled);
      toast({ title: 'Success', description: `AI Helper ${enabled ? 'activated' : 'deactivated'}` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setAiToggleLoading(false);
    }
  };

  const handleCreateSchool = async () => {
    if (!schoolForm.name.trim()) {
      toast({ title: 'Error', description: 'School name is required', variant: 'destructive' });
      return;
    }

    setCreateLoading(true);
    try {
      const { error } = await supabase.from('schools').insert({
        name: schoolForm.name,
        address: schoolForm.address || null,
        phone: schoolForm.phone || null,
        email: schoolForm.email || null,
      });

      if (error) throw error;

      toast({ title: 'Success', description: 'School created successfully' });
      setCreateOpen(false);
      setSchoolForm({ name: '', address: '', phone: '', email: '' });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">System Admin Dashboard</h1>
        <p className="page-subtitle">Manage schools and administrators</p>
      </div>

      {/* AI Helper Toggle */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted text-primary">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">AI Study Helper</CardTitle>
              <CardDescription>Enable or disable the AI Helper for all students</CardDescription>
            </div>
          </div>
          <Switch
            checked={aiHelperEnabled}
            onCheckedChange={toggleAiHelper}
            disabled={aiToggleLoading}
          />
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="stat-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Schools</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{isLoading ? '-' : schools.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl bg-muted text-primary">
                <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Admins</p>
                <p className="text-2xl sm:text-3xl font-bold mt-1">{isLoading ? '-' : admins.length}</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl bg-muted text-success">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Link to="/admin/users" className="col-span-2 lg:col-span-1">
          <Card className="stat-card card-hover h-full">
            <CardContent className="p-4 sm:p-6 flex items-center justify-center gap-3">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">Manage Admins</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Schools Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Schools</CardTitle>
            <CardDescription>All registered schools</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add School</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New School</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>School Name *</Label>
                  <Input
                    placeholder="Enter school name"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="School address"
                    value={schoolForm.address}
                    onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    placeholder="Phone number"
                    value={schoolForm.phone}
                    onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="School email"
                    value={schoolForm.email}
                    onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                  />
                </div>
                <Button onClick={handleCreateSchool} className="w-full" disabled={createLoading}>
                  {createLoading ? 'Creating...' : 'Create School'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {schools.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No schools yet. Create your first school above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead className="hidden md:table-cell">Phone</TableHead>
                    <TableHead>Admins</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schools.map((school) => (
                    <TableRow key={school.id}>
                      <TableCell className="font-medium">{school.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{school.email || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell">{school.phone || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{school.admin_count}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(school.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Admins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Admins</CardTitle>
          <CardDescription>Recently created admin accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No admin accounts yet</p>
          ) : (
            <div className="space-y-3">
              {admins.slice(0, 5).map((admin) => {
                const school = schools.find(s => s.id === admin.school_id);
                return (
                  <div key={admin.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">{admin.full_name?.charAt(0)?.toUpperCase() || '?'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{admin.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {admin.email} {school ? `• ${school.name}` : '• No school assigned'}
                      </p>
                    </div>
                    <Badge variant={admin.approval_status === 'approved' ? 'default' : 'secondary'}>
                      {admin.approval_status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Storage & Database View */}
      <StorageView />
    </div>
  );
}
