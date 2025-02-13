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
          {/* Progress Bar */}
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

          {/* Steps */}
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
      <div className="md:hidden space-y-3 px-4">
        {/* Progress indicator */}
        <div className="flex items-center justify-between text-sm mb-6">
          <span className="font-medium">Step {currentStep} of {steps.length}</span>
          <div className="h-1.5 flex-1 mx-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
              style={{
                width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Vertical step list */}
        <div className="space-y-2">
          {steps.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const isPending = !isActive && !isCompleted;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start p-3 rounded-lg transition-all duration-300",
                  isActive && "bg-violet-500/10 ring-1 ring-violet-500/20",
                  isCompleted && "bg-violet-500/5"
                )}
              >
                <div className="flex-shrink-0 mr-3 mt-0.5">
                  <div
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300",
                      isActive && "bg-violet-500 text-white",
                      isCompleted && "bg-violet-500/20 text-violet-500",
                      isPending && "border border-muted-foreground/30"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : isActive ? (
                      <span className="text-xs font-medium">{step.id}</span>
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      "text-sm font-medium leading-tight",
                      isActive && "text-violet-600",
                      isPending && "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={cn(
                      "text-xs mt-0.5 line-clamp-2",
                      isActive && "text-muted-foreground",
                      isPending && "text-muted-foreground/60"
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