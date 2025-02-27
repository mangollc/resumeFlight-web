
import * as React from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogDescription,
  DialogHeader,
  DialogFooter
} from "@/components/ui/dialog";

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DialogWrapper({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer
}: DialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
