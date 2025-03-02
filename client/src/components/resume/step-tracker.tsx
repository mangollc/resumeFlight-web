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

const steps: Step[] = [
  {
    id: 1,
    title: "Upload Resume",
    description: "Upload your current resume in PDF or DOCX format"
  },
  {
    id: 2,
    title: "Job Details",
    description: "Enter job details and analyze requirements"
  },
  {
    id: 3,
    title: "Review",
    description: "Review your optimized resume"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  },
  {
    id: 5,
    title: "Summary",
    description: "Review all optimized documents"
  }
];


export default function StepTracker({ currentStep, completedSteps }: StepTrackerProps) {
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
      <div className="block md:hidden bg-background mb-6">
        <div className="px-4 py-3 border-b">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-violet-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                {currentStep}
              </div>
              <span className="font-medium text-sm">
                {steps[currentStep - 1]?.title}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1.5">
            {steps.map((step) => {
              const isActive = currentStep === step.id;
              const isCompleted = completedSteps.includes(step.id);
              return (
                <div
                  key={step.id}
                  className={cn(
                    "flex-1 h-2 rounded-full transition-all duration-300",
                    isCompleted && "bg-violet-500",
                    isActive && "bg-violet-500/80",
                    !isActive && !isCompleted && "bg-muted"
                  )}
                />
              );
            })}
          </div>

          {/* Current step description - only show on larger mobiles */}
          <div className="hidden sm:block mt-2">
            <p className="text-xs text-muted-foreground">
              {steps[currentStep - 1]?.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}