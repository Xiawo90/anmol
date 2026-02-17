import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const { role, isApproved } = useAuth();

  // Close sidebar on navigation in mobile view
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // Update sidebar state when screen size changes
  useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-background w-full">
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        !isMobile && sidebarOpen ? "lg:ml-64" : "",
        !isMobile && !sidebarOpen ? "lg:ml-20" : ""
      )}>
        <Header onMenuClick={toggleSidebar} />
        
        <main className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 w-full max-w-full overflow-x-hidden">
          {!isApproved && role !== 'admin' && role !== 'systemadmin' && role !== 'admindirector' && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-warning font-medium text-sm sm:text-base">
                ⏳ Your account is pending approval. Some features may be limited.
              </p>
            </div>
          )}
          
          {children}
        </main>
      </div>
    </div>
  );
}
