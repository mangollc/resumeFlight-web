import { useState, createContext, useContext, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LucideIcon, 
  Home, 
  Upload, 
  FileText, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  CreditCard
} from 'lucide-react';
import { Button } from './button';
import { useAuth } from '@/hooks/use-auth';

// Create context for sidebar state
type SidebarContextType = {
  collapsed: boolean;
  toggleSidebar: () => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  return (
    <SidebarContext.Provider value={{ collapsed, toggleSidebar }}>
      {children}
    </SidebarContext.Provider>
  );
}

type SidebarNavItemProps = {
  icon: LucideIcon;
  title: string;
  href: string;
};

function SidebarNavItem({ icon: Icon, title, href }: SidebarNavItemProps) {
  const [location] = useLocation();
  const { collapsed } = useSidebar();
  const isActive = location === href;

  return (
    <Link href={href}>
      <a className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 hover:bg-accent ${
        isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
      }`}>
        <Icon className={`h-5 w-5 ${collapsed ? 'mx-auto' : ''}`} />
        {!collapsed && <span>{title}</span>}
      </a>
    </Link>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const { collapsed, toggleSidebar } = useSidebar();

  return (
    <div className={`border-r bg-card transition-all duration-300 ${
      collapsed ? 'w-[70px]' : 'w-[240px]'
    }`}>
      <div className="flex h-full flex-col">
        <div className="px-3 py-4">
          <div className="flex h-8 items-center gap-2">
            {!collapsed && (
              <span className="text-lg font-semibold tracking-tight">Resume AI</span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto h-8 w-8"
              onClick={toggleSidebar}
            >
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium">
            <SidebarNavItem 
              href="/" 
              title="Dashboard" 
              icon={Home} 
            />
            <SidebarNavItem 
              href="/uploaded-resumes" 
              title="My Resumes" 
              icon={Upload} 
            />
            <SidebarNavItem 
              href="/optimized-resumes" 
              title="Optimized Resumes" 
              icon={FileText} 
            />
            <SidebarNavItem 
              href="/subscription" 
              title="Subscription" 
              icon={CreditCard} 
            />
            <SidebarNavItem 
              href="/settings" 
              title="Settings" 
              icon={Settings} 
            />
          </nav>
        </div>
        <div className="mt-auto p-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              {user?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </div>
            {!collapsed && (
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}