import { useState } from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  CreditCard,
  Settings,
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
                    <item.icon className="mr-2 h-5 w-5" />
                    {item.title}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed h-screen w-[240px] z-40">
        <nav className="h-full flex flex-col border-r bg-background/95 backdrop-blur-sm py-6 px-4 shadow-lg shadow-blue-500/5">
          <div className="space-y-4 py-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative overflow-hidden group transition-colors",
                    "bg-gradient-to-r from-transparent to-transparent",
                    "hover:from-blue-500/10 hover:to-blue-500/5",
                    location === item.href && "bg-gradient-to-r from-blue-500/20 to-blue-500/10"
                  )}
                  disabled={item.disabled}
                >
                  <item.icon className={cn(
                    "h-5 w-5 mr-3",
                    item.disabled && "opacity-50"
                  )} />
                  <span className="truncate">{item.title}</span>
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* Content Wrapper with Padding */}
      <div className="lg:ml-[240px]" />
    </>
  );
}