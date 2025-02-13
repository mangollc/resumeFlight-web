import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "loading" | "completed" | "cancelled";
};

interface ProgressStepsProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProgressSteps({ steps, className }: ProgressStepsProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          <div className="relative flex items-center">
            {step.status === "loading" && (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
            {step.status === "completed" && (
              <CheckCircle2 className="h-5 w-5 text-primary" />
            )}
            {step.status === "pending" && (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            {step.status === "cancelled" && (
              <Circle className="h-5 w-5 text-destructive" />
            )}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  "absolute left-2.5 top-5 h-[calc(100%+0.5rem)] w-px -translate-x-1/2 bg-border",
                  step.status === "completed" && "bg-primary",
                  step.status === "cancelled" && "bg-destructive"
                )}
              />
            )}
          </div>
          <div className="flex flex-col">
            <span 
              className={cn(
                "text-sm font-medium",
                step.status === "pending" && "text-muted-foreground",
                step.status === "loading" && "text-primary",
                step.status === "completed" && "text-primary",
                step.status === "cancelled" && "text-destructive"
              )}
            >
              {step.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
