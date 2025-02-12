import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    href: "/",
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
    title: "Subscription Plan",
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
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Trigger */}
      <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[300px]">
          <nav className="h-full flex flex-col border-r bg-background p-4">
            <div className="space-y-4 py-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    disabled={item.disabled}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <nav
          className={cn(
            "h-screen flex flex-col border-r bg-background p-4 transition-all duration-300",
            collapsed ? "w-[80px]" : "w-[280px]"
          )}
        >
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="space-y-4 py-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start",
                    collapsed && "justify-center px-2"
                  )}
                  disabled={item.disabled}
                >
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && item.title}
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
