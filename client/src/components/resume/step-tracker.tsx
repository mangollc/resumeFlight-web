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
    <div className="w-full pb-20">
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
          <div className="flex justify-between items-center min-h-[120px] md:min-h-0">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.includes(step.id);

              return (
                <div 
                  key={step.id} 
                  className={cn(
                    "relative flex flex-col items-center transition-transform duration-500",
                    isActive ? "scale-110" : "scale-100"
                  )}
                  style={{
                    transform: isActive ? "translateX(0)" : undefined
                  }}
                >
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      "transition-all duration-300 ease-in-out",
                      "border-2 shadow-sm",
                      isActive && 
                        "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white scale-110 ring-2 ring-violet-500/20",
                      isCompleted &&
                        "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white",
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
                  <div 
                    className={cn(
                      "absolute top-12 w-28 -translate-x-1/2 left-1/2 text-center transition-all duration-300",
                      "transform opacity-100 md:opacity-100",
                      isActive ? "scale-100" : "scale-95 md:scale-100"
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-medium transition-colors duration-300",
                        isActive && "text-violet-600 font-semibold",
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
                        !isActive && "text-muted-foreground/60",
                        "hidden sm:block" // Hide description on very small screens
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
  );
}