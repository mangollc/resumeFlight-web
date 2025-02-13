import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface NavbarProps {
  collapsed?: boolean;
}

export function Navbar({ collapsed }: NavbarProps) {
  return (
    <div className={cn(
      "h-12 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 z-50",
      collapsed ? "lg:left-16" : "lg:left-56",
      "transition-all duration-300"
    )}>
      <div className="container flex h-full items-center">
        <div className="ml-auto flex items-center space-x-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>
        </div>
      </div>
    </div>
  )
}