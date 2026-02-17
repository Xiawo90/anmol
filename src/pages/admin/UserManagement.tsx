import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Search, UserPlus, CheckCircle, XCircle, Edit, Users, BookOpen, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { Profile, AppRole } from '@/types';

import { SearchableSelect } from '@/components/ui/searchable-select';

interface UserWithDetails extends Profile {
  role?: AppRole;
  class_count?: number;
  class_names?: string[];
  enrollment_class?: string;
}

export default function UserManagement() {
  const { toast } = useToast();
  const { role: currentUserRole, profile: currentProfile } = useAuth();
  const currentSchoolId = currentProfile?.school_id;
  const [users, setUsers] = useState<UserWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '' });

  // Create user form
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: '' as string,
    phone: '',
    roll_number: '',
    class_id: '',
    school_id: '',
    teacher_code: '',
  });
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);

  // Roles that the current user can create
  const creatableRoles: { value: string; label: string }[] = 
    currentUserRole === 'systemadmin'
      ? [{ value: 'admin', label: 'Admin' }, { value: 'admindirector', label: 'Admin Director' }]
      : [
          { value: 'teacher', label: 'Teacher' },
          { value: 'student', label: 'Student' },
          { value: 'parent', label: 'Parent' },
          { value: 'accountant', label: 'Accountant' },
        ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Admin sees only their school's users; systemadmin sees all
      let profilesQuery = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (currentUserRole === 'admin' && currentSchoolId) {
        profilesQuery = profilesQuery.eq('school_id', currentSchoolId);
      }

      const { data: profiles, error: profilesError } = await profilesQuery;
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const { data: teacherAssignments } = await supabase
        .from('teacher_assignments')
        .select('teacher_id, classes:class_id(name)');

      const { data: studentEnrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, classes:class_id(name)');

      const teacherClassMap = new Map<string, string[]>();
      teacherAssignments?.forEach((ta: any) => {
        const className = ta.classes?.name;
        if (className) {
          const existing = teacherClassMap.get(ta.teacher_id) || [];
          if (!existing.includes(className)) {
            existing.push(className);
            teacherClassMap.set(ta.teacher_id, existing);
          }
        }
      });

      const studentEnrollmentMap = new Map<string, string>();
      studentEnrollments?.forEach((se: any) => {
        if (se.classes?.name) {
          studentEnrollmentMap.set(se.student_id, se.classes.name);
        }
      });

      const usersWithRoles: UserWithDetails[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id)?.role as AppRole;
        const classNames = teacherClassMap.get(profile.user_id) || [];
        const enrollmentClass = studentEnrollmentMap.get(profile.user_id);

        return {
          ...profile,
          role: userRole,
          class_count: classNames.length,
          class_names: classNames,
          enrollment_class: enrollmentClass,
        };
      });

      // Filter: systemadmin sees only admins, admin sees teacher/student/parent (never show systemadmin)
      const filtered = currentUserRole === 'systemadmin'
        ? usersWithRoles.filter(u => u.role === 'admin')
        : usersWithRoles.filter(u => u.role !== 'systemadmin');

      setUsers(filtered);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // Fetch classes for student creation
    supabase.from('classes').select('id, name').order('name').then(({ data }) => {
      setClasses(data || []);
    });
    // Fetch schools for admin creation
    if (currentUserRole === 'systemadmin') {
      supabase.from('schools').select('id, name').order('name').then(({ data }) => {
        setSchools(data || []);
      });
    }
  }, []);

  const handleCreateUser = async () => {
    if (!createForm.full_name || !createForm.email || !createForm.password || !createForm.role) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    if (createForm.role === 'teacher' && (!createForm.teacher_code || !/^\d{5}$/.test(createForm.teacher_code))) {
      toast({ title: 'Error', description: 'Teacher code must be a 5-digit number', variant: 'destructive' });
      return;
    }

    if (createForm.password.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    setCreateLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('create-user', {
          body: {
            email: createForm.email,
            password: createForm.password,
            full_name: createForm.full_name,
            role: createForm.role,
            phone: createForm.phone,
            roll_number: createForm.role === 'student' ? createForm.roll_number : undefined,
            class_id: createForm.role === 'student' ? createForm.class_id : undefined,
            school_id: createForm.role === 'admin' ? createForm.school_id : undefined,
            teacher_code: createForm.role === 'teacher' ? createForm.teacher_code : undefined,
          },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to create user');
      }

      const data = response.data;
      if (data?.error) {
        throw new Error(data.error);
      }

      toast({ title: 'Success', description: data?.message || 'User created successfully' });
      setCreateDialogOpen(false);
      setCreateForm({ full_name: '', email: '', password: '', role: '', phone: '', roll_number: '', class_id: '', school_id: '', teacher_code: '' });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: 'approved', is_active: true })
        .eq('user_id', userId);

      if (error) throw error;
      toast({ title: 'Success', description: 'User approved successfully' });
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to approve user', variant: 'destructive' });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ approval_status: 'rejected', is_active: false })
        .eq('user_id', userId);

      if (error) throw error;
      toast({ title: 'Success', description: 'User rejected' });
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject user', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      toast({ title: 'Success', description: `User ${currentStatus ? 'deactivated' : 'activated'}` });
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
    }
  };

  const handleEditSave = async () => {
    if (!editingUser) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: editForm.full_name, phone: editForm.phone })
        .eq('user_id', editingUser.user_id);

      if (error) throw error;
      toast({ title: 'Success', description: 'User updated successfully' });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(user => {
    const teacherCode = ((user as any).teacher_code || '').toLowerCase();
    const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      teacherCode.includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && user.approval_status === 'pending') ||
      (statusFilter === 'approved' && user.approval_status === 'approved') ||
      (statusFilter === 'rejected' && user.approval_status === 'rejected');
    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingCount = users.filter(u => u.approval_status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-responsive">
        <div className="flex-between-responsive">
          <div>
            <h1 className="page-title">
              {currentUserRole === 'systemadmin' ? 'Admin Management' : 'User Management'}
            </h1>
            <p className="page-subtitle">
              {currentUserRole === 'systemadmin' 
                ? 'Create and manage admin accounts' 
                : 'Create and manage staff & student accounts'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs sm:text-sm px-2 sm:px-3 py-0.5 sm:py-1">
                {pendingCount} Pending
              </Badge>
            )}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create User</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="Enter full name"
                      value={createForm.full_name}
                      onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password *</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 6 characters"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Role *</Label>
                    <Select value={createForm.role} onValueChange={(value) => setCreateForm({ ...createForm, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {creatableRoles.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {(createForm.role === 'admin' || createForm.role === 'admindirector') && currentUserRole === 'systemadmin' && (
                    <div className="space-y-2">
                      <Label>School *</Label>
                      <SearchableSelect
                        options={schools.map(s => ({ value: s.id, label: s.name }))}
                        value={createForm.school_id}
                        onValueChange={(v) => setCreateForm({ ...createForm, school_id: v })}
                        placeholder="Select school"
                        searchPlaceholder="Search school..."
                      />
                    </div>
                  )}
                  {createForm.role === 'teacher' && (
                    <div className="space-y-2">
                      <Label>Teacher Code (5-digit) *</Label>
                      <Input
                        placeholder="e.g., 12345"
                        maxLength={5}
                        value={createForm.teacher_code}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 5);
                          setCreateForm({ ...createForm, teacher_code: val });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Unique 5-digit code used to identify the teacher</p>
                    </div>
                  )}
                  {createForm.role === 'student' && (
                    <>
                      <div className="space-y-2">
                        <Label>Class</Label>
                        <SearchableSelect
                          options={classes.map(c => ({ value: c.id, label: c.name }))}
                          value={createForm.class_id}
                          onValueChange={(v) => setCreateForm({ ...createForm, class_id: v })}
                          placeholder="Select class"
                          searchPlaceholder="Search class..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Roll Number</Label>
                        <Input
                          placeholder="e.g., 101"
                          value={createForm.roll_number}
                          onChange={(e) => setCreateForm({ ...createForm, roll_number: e.target.value })}
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Phone (optional)</Label>
                    <Input
                      placeholder="Phone number"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleCreateUser} className="w-full" disabled={createLoading}>
                    {createLoading ? 'Creating...' : 'Create User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{users.length}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{users.filter(u => u.approval_status === 'approved').length}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{pendingCount}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg sm:text-2xl font-bold">{users.filter(u => !u.is_active).length}</p>
                  <p className="text-[10px] sm:text-sm text-muted-foreground truncate">Inactive</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-10 text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] text-sm">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {currentUserRole === 'systemadmin' ? (
                      <>
                        <SelectItem value="systemadmin">System Admin</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="admindirector">Admin Director</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px] text-sm">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden lg:table-cell">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium truncate max-w-[120px] sm:max-w-none">{user.full_name}</p>
                          <p className="text-[10px] text-muted-foreground sm:hidden truncate">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="truncate block max-w-[150px] md:max-w-none">{user.email}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-[10px] sm:text-xs">
                          {user.role || 'No role'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex gap-1">
                          <Badge
                            variant={
                              user.approval_status === 'approved' ? 'default' :
                              user.approval_status === 'pending' ? 'secondary' : 'destructive'
                            }
                            className="capitalize text-[10px] sm:text-xs"
                          >
                            {user.approval_status}
                          </Badge>
                          <Badge variant={user.is_active ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 sm:gap-2">
                          {user.approval_status === 'pending' && (
                            <>
                              <Button size="sm" variant="ghost" className="text-green-600 hover:text-green-700 h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => handleApprove(user.user_id)}>
                                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => handleReject(user.user_id)}>
                                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </>
                          )}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => { setEditingUser(user); setEditForm({ full_name: user.full_name, phone: user.phone || '' }); }}>
                                <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-[90vw] sm:max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit User</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label>Full Name</Label>
                                  <Input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                  <Label>Phone</Label>
                                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                                </div>
                                <Button onClick={handleEditSave} className="w-full">Save Changes</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant={user.is_active ? 'destructive' : 'default'}
                            onClick={() => handleToggleActive(user.user_id, user.is_active || false)}
                            className="hidden sm:inline-flex h-7 sm:h-8 text-xs px-2 sm:px-3"
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
