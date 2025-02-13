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
    <div className="w-full py-8 px-4">
      <div className="flex flex-col space-y-8">
        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Optimize your resume for your dream job using AI-powered insights
        </h2>

        {/* Steps */}
        <div className="relative mt-4">
          {/* Progress Bar */}
          <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 bg-muted/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out rounded-full"
              style={{ width: `${(Math.max(0, currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="relative z-10 flex justify-between">
            {steps.map((step, index) => {
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.includes(step.id);

              return (
                <div key={step.id} className="flex flex-col items-center">
                  {/* Step Circle */}
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-full border-3",
                      "transition-all duration-500 ease-in-out shadow-lg",
                      isActive && "border-primary bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      !isActive && !isCompleted && "border-muted bg-background"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-7 w-7" />
                    ) : (
                      <span className="text-lg font-semibold">{step.id}</span>
                    )}
                  </div>

                  {/* Step Title and Description */}
                  <div className="absolute mt-20 w-32 -translate-x-1/2 text-center space-y-1">
                    <p className={cn(
                      "text-sm font-semibold",
                      isActive && "text-primary",
                      isCompleted && "text-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}>
                      {step.title}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isActive && "text-muted-foreground",
                      !isActive && "text-muted-foreground/60"
                    )}>
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