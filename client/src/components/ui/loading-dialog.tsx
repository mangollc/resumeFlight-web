import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ProgressSteps, type ProgressStep } from "@/components/ui/progress-steps";

interface LoadingDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
  steps?: ProgressStep[];
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
          <div className="text-sm text-muted-foreground">
            {description}
          </div>
        </DialogHeader>
        {steps && (
          <div className="mt-4">
            <ProgressSteps steps={steps} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}