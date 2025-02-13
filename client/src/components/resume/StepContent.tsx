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
    <div className="mb-6">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold">{children}</h2>
    </div>
  );
}

export function StepContentSection({ children, className }: StepContentProps) {
  return (
    <div className={cn(
      "space-y-4",
      "py-4",
      className
    )}>
      {children}
    </div>
  );
}
