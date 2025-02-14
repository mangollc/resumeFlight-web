import { cn } from "@/lib/utils";
import { Check, Circle } from "lucide-react";

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
      {/* Desktop view - hide on mobile */}
      <div className="hidden md:block pb-20">
        <div className="relative">
          {/* Desktop Progress Bar */}
          <div className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2">
            <div className="h-full bg-muted rounded-full">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-in-out rounded-full"
                style={{
                  width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Desktop Steps */}
          <div className="relative z-10">
            <div className="flex justify-between items-center">
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = completedSteps.includes(step.id);

                return (
                  <div key={step.id} className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        "transition-all duration-300 ease-in-out",
                        "border-2 shadow-sm",
                        isActive && "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white scale-110 ring-2 ring-violet-500/20",
                        isCompleted && "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white",
                        !isActive && !isCompleted && "border-muted bg-background"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <span className="text-sm font-semibold">{step.id}</span>
                      )}
                    </div>
                    <div className="absolute top-12 w-28 -translate-x-1/2 left-1/2 text-center">
                      <p
                        className={cn(
                          "text-xs font-medium",
                          isActive && "text-violet-600 font-semibold",
                          isCompleted && "text-foreground",
                          !isActive && !isCompleted && "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </p>
                      <p
                        className={cn(
                          "text-[10px] mt-0.5 leading-tight",
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
      </div>

      {/* Mobile view - hide on desktop */}
      <div className="md:hidden">
        {/* Mobile compact progress bar */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
          <div className="max-w-md mx-auto px-4 py-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-violet-600">
                  Step {currentStep}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                  {steps[currentStep - 1]?.title}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {currentStep}/{steps.length}
              </span>
            </div>

            {/* Steps pills */}
            <div className="flex gap-1 h-1">
              {steps.map((step) => {
                const isActive = currentStep === step.id;
                const isCompleted = completedSteps.includes(step.id);
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex-1 h-full rounded-full transition-all duration-300",
                      isCompleted && "bg-violet-500",
                      isActive && "bg-violet-500",
                      !isActive && !isCompleted && "bg-muted"
                    )}
                  />
                );
              })}
            </div>
          </div>
        </div>
        {/* Add padding to content below fixed header */}
        <div className="h-[52px]" />
      </div>
    </div>
  );
}