import { LightbulbIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"

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
      <div className="h-full px-4 lg:px-6 flex items-center justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon"
              className="active:scale-95 transition-transform"
            >
              <LightbulbIcon className="h-5 w-5" />
              <span className="sr-only">Resume Tips</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Resume Tips</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <h3 className="font-medium text-primary">1. Keep it Concise</h3>
                <p className="text-sm text-muted-foreground">
                  Aim for 1-2 pages. Recruiters spend an average of 6 seconds scanning a resume.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">2. Use Action Verbs</h3>
                <p className="text-sm text-muted-foreground">
                  Start bullet points with words like "Achieved," "Led," "Developed," "Increased."
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">3. Quantify Achievements</h3>
                <p className="text-sm text-muted-foreground">
                  Include numbers and percentages to demonstrate impact.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">4. Customize</h3>
                <p className="text-sm text-muted-foreground">
                  Tailor your resume for each job application using relevant keywords.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-medium text-primary">5. Proofread</h3>
                <p className="text-sm text-muted-foreground">
                  Double-check for typos and grammatical errors.
                </p>
              </div>
            </div>
            <DialogClose asChild>
              <Button className="mt-4" variant="secondary">Close</Button>
            </DialogClose>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}