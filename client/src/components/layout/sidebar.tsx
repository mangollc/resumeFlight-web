import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  CreditCard,
  Settings,
  Plane,
  Menu,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Uploaded Resumes",
    href: "/uploaded-resumes",
    icon: FileText,
  },
  {
    title: "Optimized Resumes",
    href: "/optimized-resumes",
    icon: FileCheck2,
  },
  {
    title: "Subscription",
    href: "/subscription",
    icon: CreditCard,
    disabled: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

const ProfileSection = () => {
  const { user } = useAuth();

  return (
    <div className="mt-auto p-3 border-t">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src="/placeholder-avatar.png" alt="Profile" />
          <AvatarFallback>
            <Briefcase className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{user?.name || 'No name'}</span>
          <span className="text-xs text-muted-foreground truncate">{user?.email || 'No email'}</span>
        </div>
      </div>
    </div>
  );
};

const NavigationItems = ({ onClick, collapsed }: { onClick?: () => void; collapsed?: boolean }) => {
  const [location] = useLocation();
  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col p-3 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Button
              variant="ghost"
              disabled={item.disabled}
              className={cn(
                "w-full justify-start py-2 px-3",
                collapsed ? "w-12 p-0 justify-center" : "",
                location === item.href && "bg-primary/10 text-primary font-medium",
                "hover:bg-primary/5 dark:hover:bg-primary/20",
                "focus:ring-1 focus:ring-primary focus:ring-offset-1 focus:outline-none",
                "active:scale-95 touch-none",
                "transition-all duration-200"
              )}
              onClick={onClick}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", !collapsed && "mr-3")} />
              {!collapsed && <span className="text-sm font-medium truncate">{item.title}</span>}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
};

const AppLogo = ({ collapsed }: { collapsed?: boolean }) => (
  <Link href="/dashboard" className="flex items-center space-x-2 shrink-0">
    <div className="p-2 rounded-lg bg-primary/10">
      <Plane className="h-5 w-5 text-primary rotate-45" />
    </div>
    {!collapsed && (
      <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        ResumeFlight
      </span>
    )}
  </Link>
);

interface SidebarProps {
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ onCollapsedChange }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      const shouldCollapse = window.innerWidth < 1280;
      setCollapsed(shouldCollapse);
      onCollapsedChange?.(shouldCollapse);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [onCollapsedChange]);

  const handleCollapsedChange = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 px-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-50">
        <AppLogo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="active:scale-95 transition-transform">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col w-80 sm:w-96 lg:w-72">
            <div className="p-4 border-b">
              <AppLogo />
            </div>
            <NavigationItems onClick={() => setOpen(false)} />
            <ProfileSection />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:flex fixed top-0 left-0 h-screen bg-card border-r shadow-sm z-[60] flex-col",
          collapsed ? "w-16" : "w-56",
          "transition-all duration-300 ease-in-out"
        )}
      >
        <div className="p-4 border-b">
          <AppLogo collapsed={collapsed} />
        </div>
        <NavigationItems collapsed={collapsed} />
        {!collapsed && <ProfileSection />}

        {/* Collapse Button */}
        <div className="absolute -right-4 top-1/2 -translate-y-1/2">
          <Button
            variant="secondary"
            size="icon"
            className={cn(
              "h-8 w-8 rounded-full border shadow-md",
              "hover:bg-primary/10 hover:text-primary",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "active:scale-95 transition-all duration-200",
              "bg-background"
            )}
            onClick={() => handleCollapsedChange(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4 transition-transform duration-200" /> : <ChevronLeft className="h-4 w-4 transition-transform duration-200" />}
          </Button>
        </div>
      </div>
    </>
  );
}