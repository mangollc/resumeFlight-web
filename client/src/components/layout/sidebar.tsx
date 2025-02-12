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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

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

const NavigationItems = ({ onClick }: { onClick?: () => void }) => {
  const [location] = useLocation();
  return (
    <div className="flex flex-col p-4 space-y-2">
      {navItems.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            disabled={item.disabled}
            className={cn(
              "w-full justify-start py-6",
              location === item.href && "bg-primary/10 text-primary font-medium",
              "hover:bg-primary/5 dark:hover:bg-primary/20",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:outline-none",
              "transition-colors duration-200"
            )}
            onClick={onClick}
          >
            <item.icon className="h-5 w-5 mr-3" />
            <span className="font-medium">{item.title}</span>
          </Button>
        </Link>
      ))}
    </div>
  );
};

const AppLogo = () => (
  <Link href="/dashboard" className="flex items-center space-x-3">
    <div className="p-2 rounded-lg bg-primary/10">
      <Plane className="h-6 w-6 text-primary rotate-45" />
    </div>
    <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
      ResumeFlight
    </span>
  </Link>
);

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 px-4 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between z-50">
        <AppLogo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <div className="p-6 border-b">
              <AppLogo />
            </div>
            <NavigationItems onClick={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen w-64 bg-card border-r shadow-sm z-40">
        <div className="p-6 border-b">
          <AppLogo />
        </div>
        <NavigationItems />
      </div>
    </>
  );
}