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
} from "lucide-react";

interface StepProps {
  currentStep: number;
  totalSteps: number;
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
    title: "Download",
    description: "Download your optimized resume",
    icon: Download 
  },
];

export function ResumeSteps({ currentStep, totalSteps, onNext, onBack }: StepProps) {
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
        <div className="relative h-44 overflow-hidden my-6">
          <div 
            className="absolute left-1/2 flex transition-transform duration-500 ease-out"
            style={{ 
              transform: `translateX(calc(-50% - ${currentStep * (viewportWidth * 0.7)}px))`,
            }}
          >
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isCurrent = currentStep === index;
              const isPast = currentStep > index;
              const isFuture = currentStep < index;

              return (
                <div
                  key={step.title}
                  className={cn(
                    "w-[70vw] px-4 flex flex-col items-center justify-center",
                    "transition-all duration-500 ease-out",
                    isCurrent ? "opacity-100 scale-100" : "opacity-40 scale-90",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-full border-2 mb-4",
                      "transition-all duration-500 ease-out",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      isPast && "border-primary bg-primary text-primary-foreground",
                      isFuture && "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    <StepIcon className="h-8 w-8" />
                  </div>
                  <div className="text-center space-y-2 max-w-[200px]">
                    <span className={cn(
                      "text-sm font-medium block",
                      "transition-colors duration-500",
                      isCurrent && "text-primary",
                      isPast && "text-primary",
                      isFuture && "text-muted-foreground"
                    )}>
                      {step.title}
                    </span>
                    <span className={cn(
                      "text-xs block",
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
                  currentStep > index && "border-primary bg-primary text-primary-foreground",
                  currentStep < index && "border-muted bg-muted"
                )}
              >
                <StepIcon className="h-5 w-5" />
              </div>
              <span
                className={cn(
                  "absolute text-sm font-medium top-14 text-center w-full",
                  "hidden lg:block",
                  currentStep === index && "text-primary",
                  currentStep > index && "text-primary",
                  currentStep < index && "text-muted-foreground"
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