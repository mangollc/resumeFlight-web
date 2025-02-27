
import React, { createContext, useContext, useState } from 'react';
import { useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import {
  Home,
  FileText,
  Settings,
  User,
  CreditCard,
  CheckSquare,
  Menu,
  X,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

type SidebarContextType = {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
};

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);

  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close }}>
      {children}
    </SidebarContext.Provider>
  );
};

export function Sidebar() {
  const { isOpen, toggle, close } = useSidebar();
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  
  const navigate = (path: string) => {
    setLocation(path);
    close();
  };

  return (
    <>
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
        <Button variant="ghost" size="icon" onClick={toggle} className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
        <div className="flex items-center gap-2">
          <RefreshCw className="h-6 w-6 text-primary" />
          <span className="font-semibold text-lg">Resumate</span>
        </div>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 border-r bg-card p-6 shadow-lg transition-transform md:sticky md:z-0 md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Resumate</span>
          </div>
          <Button variant="ghost" size="icon" onClick={close} className="md:hidden">
            <X className="h-5 w-5" />
            <span className="sr-only">Close sidebar</span>
          </Button>
        </div>

        <div className="space-y-4">
          <div className="py-2">
            <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
              Main
            </div>
            <nav className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate('/dashboard')}
              >
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate('/uploaded-resumes')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Uploaded Resumes
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate('/optimized-resumes')}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Optimized Resumes
              </Button>
            </nav>
          </div>
          
          <div className="py-2">
            <div className="text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-3">
              Settings
            </div>
            <nav className="grid gap-1">
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate('/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button
                variant="ghost"
                className="justify-start"
                onClick={() => navigate('/subscription')}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Subscription
              </Button>
            </nav>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6">
          {user && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 pb-2">
                <div className="rounded-full bg-primary/10 p-1">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="grid gap-0.5">
                  <p className="text-sm font-medium">{user.name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => logoutMutation.mutate()}
              >
                <ChevronRight className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
