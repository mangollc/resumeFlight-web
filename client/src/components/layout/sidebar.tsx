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
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

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

const ProfileSection = () => (
  <div className="mt-auto p-3 border-t">
    <div className="flex items-center space-x-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/placeholder-avatar.png" alt="Profile" />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium truncate">John Doe</span>
        <span className="text-xs text-muted-foreground truncate">john@example.com</span>
      </div>
    </div>
  </div>
);

const NavigationItems = ({ onClick, collapsed }: { onClick?: () => void, collapsed?: boolean }) => {
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
                "transition-colors duration-200"
              )}
              onClick={onClick}
            >
              <item.icon className={cn("h-5 w-5", !collapsed && "mr-3")} />
              {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
};

const AppLogo = ({ collapsed }: { collapsed?: boolean }) => (
  <Link href="/dashboard" className="flex items-center space-x-2">
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

  const handleCollapsedChange = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-12 px-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-50">
        <AppLogo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 flex flex-col w-64">
            <div className="p-4 border-b">
              <AppLogo />
            </div>
            <NavigationItems onClick={() => setOpen(false)} />
            <ProfileSection />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:flex fixed top-0 left-0 h-screen bg-card border-r shadow-sm z-[60] flex-col",
        collapsed ? "w-16" : "w-56",
        "transition-all duration-300"
      )}>
        <div className="p-4 border-b flex items-center justify-between">
          <AppLogo collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            className="ml-2"
            onClick={() => handleCollapsedChange(!collapsed)}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>
        <NavigationItems collapsed={collapsed} />
        {!collapsed && <ProfileSection />}
      </div>
    </>
  );
}