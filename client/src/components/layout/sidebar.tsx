import { useLocation, Link } from "wouter";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  group?: string;
}

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    group: "main",
  },
  {
    title: "Uploaded Resumes",
    href: "/uploaded-resumes",
    icon: FileText,
    group: "main",
  },
  {
    title: "Optimized Resumes",
    href: "/optimized-resumes",
    icon: FileCheck2,
    group: "main",
  },
  {
    title: "Subscription Plan",
    href: "/subscription",
    icon: CreditCard,
    disabled: true,
    group: "system",
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    group: "system",
  },
];

const mainNavItems = navItems.filter(item => item.group === "main");
const systemNavItems = navItems.filter(item => item.group === "system");

export function Sidebar() {
  const [location] = useLocation();

  const NavigationItems = ({ items }: { items: NavItem[] }) => (
    <>
      {items.map((item) => (
        <Link key={item.href} href={item.href}>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start h-10",
              "transition-colors hover:bg-accent",
              location === item.href && "bg-accent/50 hover:bg-accent/60",
              item.disabled && "opacity-50"
            )}
            disabled={item.disabled}
          >
            <item.icon className="h-4 w-4 mr-3" />
            <span className="text-sm font-medium">{item.title}</span>
          </Button>
        </Link>
      ))}
    </>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 px-4 border-b bg-background flex items-center z-50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="hover:bg-muted">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56 mt-1">
            {mainNavItems.map((item) => (
              <DropdownMenuItem key={item.href} disabled={item.disabled} asChild>
                <Link href={item.href} className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  <span className="text-sm">{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {systemNavItems.map((item) => (
              <DropdownMenuItem key={item.href} disabled={item.disabled} asChild>
                <Link href={item.href} className="flex items-center">
                  <item.icon className="h-4 w-4 mr-3" />
                  <span className="text-sm">{item.title}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Desktop Navigation */}
      <div className="hidden lg:block fixed top-0 left-0 h-screen w-[200px] border-r bg-background z-50">
        <div className="flex flex-col h-full py-4">
          <div className="px-3 mb-2">
            <NavigationItems items={mainNavItems} />
          </div>
          <Separator className="mx-3 my-2" />
          <div className="px-3">
            <NavigationItems items={systemNavItems} />
          </div>
        </div>
      </div>

      {/* Content Padding */}
      <div className="lg:hidden h-14" /> {/* Mobile padding */}
      <div className="hidden lg:block lg:ml-[200px]" /> {/* Desktop padding */}
    </>
  );
}