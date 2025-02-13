import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavbarProps {
  collapsed?: boolean;
}

export function Navbar({ collapsed }: NavbarProps) {
  return (
    <div className={cn(
      "h-14 lg:h-12 border-b",
      "bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5",
      "backdrop-blur supports-[backdrop-filter]:bg-background/60",
      "fixed top-0 right-0 left-0 z-40",
      collapsed ? "lg:left-16" : "lg:left-56",
      "transition-all duration-300 ease-in-out"
    )}>
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="lg:hidden w-5" /> {/* Spacer for mobile layout balance */}
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            className="active:scale-95 transition-transform"
          >
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </div>
  );
}