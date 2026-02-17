import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings as SettingsIcon, User, Bell, Shield, Palette } from 'lucide-react';

export default function Settings() {
  const { profile, role } = useAuth();

  return (
    <DashboardLayout>
      <div className="section-container">
        <div className="content-area space-responsive">
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account and preferences</p>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:gap-1">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
              </TabsTrigger>
              {role === 'admin' && (
                <>
                  <TabsTrigger value="security" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden sm:inline">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="appearance" className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    <span className="hidden sm:inline">Appearance</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              <Card className="card-base">
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and contact details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="form-grid">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        defaultValue={profile?.full_name || ''}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={profile?.email || ''}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        defaultValue={profile?.phone || ''}
                        placeholder="Enter your phone number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        defaultValue={role || ''}
                        disabled
                        className="bg-muted capitalize"
                      />
                    </div>
                  </div>
                  <div className="button-group-end">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save Changes</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-6">
              <Card className="card-base">
                <CardHeader>
                  <CardTitle className="text-lg">Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose how you want to receive notifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Email Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Announcement Alerts</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified about new announcements
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Message Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Get notified about new messages
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Event Reminders</p>
                        <p className="text-sm text-muted-foreground">
                          Receive reminders for upcoming events
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {role === 'admin' && (
              <>
                <TabsContent value="security" className="mt-6">
                  <Card className="card-base">
                    <CardHeader>
                      <CardTitle className="text-lg">Security Settings</CardTitle>
                      <CardDescription>
                        Manage your account security settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Two-Factor Authentication</p>
                            <p className="text-sm text-muted-foreground">
                              Add an extra layer of security
                            </p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Session Timeout</p>
                            <p className="text-sm text-muted-foreground">
                              Automatically log out after inactivity
                            </p>
                          </div>
                          <Switch defaultChecked />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border">
                        <Button variant="outline" className="text-destructive hover:text-destructive">
                          Change Password
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appearance" className="mt-6">
                  <Card className="card-base">
                    <CardHeader>
                      <CardTitle className="text-lg">Appearance</CardTitle>
                      <CardDescription>
                        Customize the look and feel of the application
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Dark Mode</p>
                            <p className="text-sm text-muted-foreground">
                              Use dark theme
                            </p>
                          </div>
                          <Switch />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">Compact Mode</p>
                            <p className="text-sm text-muted-foreground">
                              Reduce spacing for denser content
                            </p>
                          </div>
                          <Switch />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </>
            )}
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
