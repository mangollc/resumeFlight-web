import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  CreditCard,
  Settings,
  Plane,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Sidebar() {
  const [location] = useLocation();

  return (
    <>
      {/* Fixed Sidebar - Always visible */}
      <div className="fixed top-0 left-0 h-screen w-64 bg-card border-r shadow-sm">
        {/* Logo and App Name */}
        <div className="p-4 border-b">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Plane className="h-6 w-6 text-primary rotate-45" />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              ResumeFlight
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
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
              >
                <item.icon className="h-5 w-5 mr-3" />
                <span className="font-medium">{item.title}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Margin */}
      <div className="ml-64" />
    </>
  );
}