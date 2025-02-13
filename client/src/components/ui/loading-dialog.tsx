import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

interface LoadingDialogProps {
  open: boolean;
  title?: string;
  description?: string;
  onOpenChange: (open: boolean) => void;
}

export function LoadingDialog({ 
  open, 
  title = "Processing", 
  description = "Please wait while we process your request...",
  onOpenChange
}: LoadingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}