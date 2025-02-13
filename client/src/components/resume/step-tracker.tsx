import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type Step = {
  id: number;
  title: string;
  description: string;
};

interface StepTrackerProps {
  currentStep: number;
  steps: Step[];
  completedSteps: number[];
}

export default function StepTracker({ currentStep, steps, completedSteps }: StepTrackerProps) {
  return (
    <div className="w-full">
      {/* Steps Container */}
      <div className="relative">
        {/* Progress Bar */}
        <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2">
          <div className="h-full bg-muted rounded-full">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out rounded-full"
              style={{
                width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="relative z-10 flex justify-between">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);

            return (
              <div key={step.id} className="flex flex-col items-center">
                {/* Step Circle */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    "transition-all duration-300 ease-in-out",
                    "border-2",
                    isActive && 
                      "border-primary bg-primary text-primary-foreground scale-110 ring-2 ring-primary/20",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && 
                      "border-muted bg-background"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-semibold">
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <div className="absolute top-full mt-3 w-24 -translate-x-1/2 text-center">
                  <p
                    className={cn(
                      "text-xs font-medium transition-colors duration-300",
                      isActive && "text-primary font-semibold",
                      isCompleted && "text-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] mt-0.5 transition-colors duration-300 leading-tight",
                      isActive && "text-muted-foreground",
                      !isActive && "text-muted-foreground/60"
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}