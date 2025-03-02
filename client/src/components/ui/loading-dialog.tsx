import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingDialogProps {
  open: boolean;
  title?: string;
  description?: string | React.ReactNode;
  onOpenChange: (open: boolean) => void;
  steps?: Array<{
    id: string;
    label: string;
    status: "pending" | "loading" | "completed" | "error" | "cancelled";
  }>;
}

export function LoadingDialog({ 
  open, 
  title = "Processing", 
  description = "Please wait while we process your request...",
  onOpenChange,
  steps
}: LoadingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {typeof description === 'string' ? (
            <DialogDescription>
              {description}
            </DialogDescription>
          ) : (
            description
          )}
        </DialogHeader>

        {steps && (
          <div className="mt-4 space-y-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  {step.status === "completed" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : step.status === "loading" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : step.status === "error" ? (
                    <div className="h-5 w-5 rounded-full bg-destructive" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20" />
                  )}
                </div>
                <span className={cn(
                  "text-sm",
                  step.status === "completed" && "text-green-500",
                  step.status === "loading" && "text-primary",
                  step.status === "error" && "text-destructive",
                  step.status === "pending" && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}