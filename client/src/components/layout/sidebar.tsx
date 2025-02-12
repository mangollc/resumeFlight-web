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
        <SheetTrigger asChild className="lg:hidden fixed top-4 left-4 z-50">
          <Button variant="ghost" size="icon" className="bg-gradient-to-r from-blue-600 to-blue-400 text-white hover:from-blue-700 hover:to-blue-500">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[300px]">
          <nav className="h-full flex flex-col border-r bg-background p-6">
            <div className="space-y-4 py-4">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative overflow-hidden group",
                      "bg-gradient-to-r from-transparent to-transparent",
                      "hover:from-blue-500/10 hover:to-blue-500/5",
                      location === item.href && "bg-gradient-to-r from-blue-500/20 to-blue-500/10"
                    )}
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
      <div 
        className={cn(
          "hidden lg:block fixed h-screen transition-all duration-300 ease-in-out z-40",
          collapsed ? "w-[80px]" : "w-[280px]"
        )}
      >
        <nav
          className={cn(
            "h-full flex flex-col border-r bg-background/95 backdrop-blur-sm p-6",
            "shadow-lg shadow-blue-500/5"
          )}
        >
          <div className="flex justify-end mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="hover:bg-blue-500/10 transition-colors"
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
                    "w-full relative overflow-hidden group transition-all duration-200",
                    "bg-gradient-to-r from-transparent to-transparent",
                    "hover:from-blue-500/10 hover:to-blue-500/5",
                    location === item.href && "bg-gradient-to-r from-blue-500/20 to-blue-500/10",
                    collapsed ? "justify-center px-2" : "justify-start"
                  )}
                  disabled={item.disabled}
                >
                  <item.icon className={cn("h-4 w-4", !collapsed && "mr-2")} />
                  {!collapsed && (
                    <span className="truncate">{item.title}</span>
                  )}
                  {collapsed && (
                    <span className="sr-only">{item.title}</span>
                  )}
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Content Wrapper with Padding */}
      <div
        className={cn(
          "lg:ml-[280px] transition-all duration-300",
          collapsed && "lg:ml-[80px]"
        )}
      />
    </>
  );
}