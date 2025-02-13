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
        <div className="absolute left-0 top-1/2 h-3 w-full -translate-y-1/2">
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
                    "flex h-12 w-12 items-center justify-center rounded-full",
                    "transition-all duration-300 ease-in-out",
                    "border-4",
                    isActive && 
                      "border-primary bg-primary text-primary-foreground scale-125 ring-4 ring-primary/20",
                    isCompleted &&
                      "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && 
                      "border-muted bg-background"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-6 w-6" />
                  ) : (
                    <span className="text-lg font-semibold">
                      {step.id}
                    </span>
                  )}
                </div>

                {/* Step Label */}
                <div className="absolute mt-16 w-32 -translate-x-1/2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors duration-300",
                      isActive && "text-primary font-semibold",
                      isCompleted && "text-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1 transition-colors duration-300",
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