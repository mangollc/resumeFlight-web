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
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
      {/* Mobile Menu */}
      <div className="lg:hidden flex items-center h-16 px-4 border-b bg-background/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="bg-gradient-to-r from-[#FFB3BA] to-[#FFDFBA] text-foreground hover:from-[#FFDFBA] hover:to-[#FFFFBA]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[300px]">
            <nav className="h-full flex flex-col border-r bg-background">
              <SheetHeader className="p-6 border-b">
                <SheetTitle>Resume Optimizer</SheetTitle>
              </SheetHeader>
              <div className="flex-1 px-4 py-6">
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={location === item.href ? "secondary" : "ghost"}
                        className={cn(
                          "w-full justify-start relative overflow-hidden group",
                          "bg-gradient-to-r from-transparent to-transparent",
                          "hover:from-[#FFB3BA]/10 hover:to-[#FFDFBA]/10",
                          location === item.href && "bg-gradient-to-r from-[#FFB3BA]/20 to-[#FFDFBA]/20"
                        )}
                        disabled={item.disabled}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className={cn(
                          "h-5 w-5 mr-3",
                          item.disabled && "opacity-50"
                        )} />
                        {item.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
        <h1 className="text-xl font-semibold ml-4">Resume Optimizer</h1>
      </div>

      {/* Desktop Sidebar - Always Visible */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen w-[240px] z-40">
        <nav className="h-full flex flex-col border-r bg-background">
          <div className="p-6 border-b">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-[#FFB3BA] to-[#FFDFBA] bg-clip-text text-transparent">
              Resume Optimizer
            </h1>
          </div>
          <div className="flex-1 px-4 py-6">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start relative overflow-hidden group",
                      "bg-gradient-to-r from-transparent to-transparent",
                      "hover:from-[#FFB3BA]/10 hover:to-[#FFDFBA]/10",
                      location === item.href && "bg-gradient-to-r from-[#FFB3BA]/20 to-[#FFDFBA]/20"
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
          </div>
        </nav>
      </div>

      {/* Content Padding */}
      <div className="lg:hidden h-16" /> {/* Mobile padding */}
      <div className="hidden lg:block lg:ml-[240px] min-h-screen" /> {/* Desktop padding */}
    </>
  );
}