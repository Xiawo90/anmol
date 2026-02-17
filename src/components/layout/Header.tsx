import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Bell, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            setNotifications(prev => [payload.new as Notification, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  return (
    <header className="sticky top-0 z-30 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden h-8 w-8 sm:h-9 sm:w-9"
          >
            <Menu className="w-5 h-5" />
          </Button>
          
          <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <Input
              type="search"
              placeholder="Search..."
              className="border-0 bg-transparent h-auto p-0 focus-visible:ring-0 w-32 sm:w-48 md:w-64 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile search button */}
          <Button variant="ghost" size="icon" className="sm:hidden h-8 w-8">
            <Search className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-9 sm:w-9">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-accent text-accent-foreground text-[10px] sm:text-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[280px] sm:w-80">
              <div className="p-2 sm:p-3 border-b">
                <h3 className="font-semibold text-sm sm:text-base">Notifications</h3>
              </div>
              {notifications.length === 0 ? (
                <div className="p-3 sm:p-4 text-center text-muted-foreground text-sm">
                  No notifications yet
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className="p-2 sm:p-3 cursor-pointer"
                    onClick={() => markAsRead(notification.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.is_read && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent flex-shrink-0" />
                        )}
                        <p className="font-medium text-xs sm:text-sm truncate">{notification.title}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{notification.message}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex items-center">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-primary flex items-center justify-center">
              <span className="text-xs sm:text-sm font-medium text-primary-foreground">
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
