import { cn } from "@/lib/utils";

interface StepContentProps {
  children: React.ReactNode;
  className?: string;
}

export function StepContent({ children, className }: StepContentProps) {
  return (
    <div className={cn(
      "mt-4 lg:mt-8",
      "p-4 sm:p-6 lg:p-8",
      "border rounded-lg",
      "bg-card/50",
      "min-h-[300px] lg:min-h-[400px]",
      "flex flex-col",
      className
    )}>
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

export function StepContentHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold break-words">{children}</h2>
    </div>
  );
}

export function StepContentSection({ children, className }: StepContentProps) {
  return (
    <div className={cn(
      "space-y-3 sm:space-y-4",
      "py-3 sm:py-4",
      "overflow-x-hidden",
      className
    )}>
      {children}
    </div>
  );
}

export function FileNameDisplay({ fileName }: { fileName: string }) {
  return (
    <div className="p-2 bg-muted rounded-md">
      <p className="text-xs sm:text-sm font-medium mb-1">File Name:</p>
      <p className="text-xs sm:text-sm text-muted-foreground break-all line-clamp-2">
        {fileName}
      </p>
    </div>
  );
}

export function ActionButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4">
      {children}
    </div>
  );
}