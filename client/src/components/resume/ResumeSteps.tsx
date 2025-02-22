import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  Settings,
  CheckCircle,
  Download,
  ChevronRight,
  ChevronLeft,
  Check,
} from "lucide-react";

interface StepProps {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  onNext: () => void;
  onBack: () => void;
}

const steps = [
  { 
    title: "Upload Resume",
    description: "Upload your resume to get started",
    icon: LayoutDashboard 
  },
  { 
    title: "Review Content",
    description: "Review and confirm your resume content",
    icon: FileText 
  },
  { 
    title: "Customize",
    description: "Customize your resume optimization",
    icon: Settings 
  },
  { 
    title: "Generate",
    description: "Generate your optimized resume",
    icon: CheckCircle 
  },
  { 
    title: "Summary",
    description: "Review all optimized documents",
    icon: Download 
  },
];

export function ResumeSteps({ currentStep, totalSteps, completedSteps, onNext, onBack }: StepProps) {
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div className="w-full space-y-4">
      {/* Mobile step indicator */}
      <div className="lg:hidden space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Step {currentStep + 1} of {totalSteps}</span>
          <span className="text-muted-foreground">{steps[currentStep].title}</span>
        </div>
        <Progress value={((currentStep + 1) / totalSteps) * 100} className="h-2" />

        {/* Mobile step carousel */}
        <div className="relative h-48 overflow-hidden my-8">
          <div 
            className="absolute flex transition-transform duration-500 ease-out"
            style={{ 
              transform: `translateX(calc(50% - ${currentStep * 100}%))`,
              width: `${steps.length * 100}%`,
              left: 0,
            }}
          >
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCurrent = currentStep === index;
              const isPast = completedSteps.includes(index + 1);
              const isFuture = currentStep < index;

              return (
                <div
                  key={step.title}
                  className={cn(
                    "flex-1 px-4 flex flex-col items-center justify-center",
                    "transition-all duration-500 ease-out",
                    isCurrent ? "opacity-100 scale-100" : "opacity-40 scale-90"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-full border-2 mb-6 relative",
                      "transition-all duration-500 ease-out shadow-lg",
                      isCurrent && "border-primary bg-primary/10 text-primary scale-110",
                      isPast && "border-primary bg-primary text-primary-foreground",
                      isFuture && "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    <StepIcon className="h-10 w-10" />
                    {isPast && (
                      <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-2 max-w-[200px]">
                    <span className={cn(
                      "text-base font-medium block",
                      "transition-colors duration-500",
                      isCurrent && "text-primary",
                      isPast && "text-primary",
                      isFuture && "text-muted-foreground"
                    )}>
                      {step.title}
                    </span>
                    <span className={cn(
                      "text-sm block",
                      "transition-colors duration-500",
                      isCurrent && "text-muted-foreground",
                      isPast && "text-muted-foreground/80",
                      isFuture && "text-muted-foreground/60"
                    )}>
                      {step.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Desktop steps */}
      <div className="hidden lg:grid grid-cols-5 gap-4">
        {steps.map((step, index) => {
          const StepIcon = step.icon;
          const isCompleted = completedSteps.includes(index + 1);
          return (
            <div
              key={step.title}
              className={cn(
                "relative flex items-center justify-center",
                index !== steps.length - 1 &&
                  "after:absolute after:right-0 after:top-1/2 after:h-[2px] after:w-full after:translate-y-[-50%] after:bg-muted"
              )}
            >
              <div
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background",
                  currentStep === index && "border-primary bg-primary/10",
                  isCompleted && "border-primary bg-primary text-primary-foreground",
                  currentStep < index && !isCompleted && "border-muted bg-muted"
                )}
              >
                <StepIcon className="h-5 w-5" />
                {isCompleted && (
                  <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
              </div>
              <span
                className={cn(
                  "absolute text-sm font-medium top-14 text-center w-full",
                  "hidden lg:block",
                  currentStep === index && "text-primary",
                  isCompleted && "text-primary",
                  currentStep < index && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between mt-8">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={currentStep === 0}
          className="w-[120px] sm:w-[140px]"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={currentStep === totalSteps - 1}
          className="w-[120px] sm:w-[140px]"
        >
          {currentStep === totalSteps - 1 ? "Finish" : "Next"}
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}