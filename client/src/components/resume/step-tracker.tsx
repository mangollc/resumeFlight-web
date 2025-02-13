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
    <div className="w-full py-6">
      <div className="flex flex-col space-y-8">
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-foreground">
          Optimize your resume for your dream job using AI-powered insights
        </h2>

        {/* Steps */}
        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
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
                      "flex h-10 w-10 items-center justify-center rounded-full border-2",
                      "transition-all duration-500 ease-in-out",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      !isActive && !isCompleted && "border-muted bg-background"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>

                  {/* Step Title */}
                  <div className="absolute mt-12 w-32 -translate-x-1/2 text-center">
                    <p className={cn(
                      "text-sm font-medium",
                      (isActive || isCompleted) && "text-foreground",
                      !isActive && !isCompleted && "text-muted-foreground"
                    )}>
                      {step.title}
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
