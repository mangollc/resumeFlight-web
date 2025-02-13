import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <div className="h-12 border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur supports-[backdrop-filter]:bg-background/60 fixed top-0 right-0 left-0 z-50 lg:left-[14rem]">
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