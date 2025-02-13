import { useState, useRef, useEffect } from "react";
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
  { title: "Upload Resume", icon: LayoutDashboard },
  { title: "Review Content", icon: FileText },
  { title: "Customize", icon: Settings },
  { title: "Generate", icon: CheckCircle },
  { title: "Download", icon: Download },
];

export function ResumeSteps({ currentStep, totalSteps, onNext, onBack }: StepProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [carouselWidth, setCarouselWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (carouselRef.current) {
        setCarouselWidth(carouselRef.current.offsetWidth);
      }
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
        <div className="relative h-24 overflow-hidden" ref={carouselRef}>
          <div 
            className="absolute flex transition-transform duration-300 ease-in-out"
            style={{ 
              transform: `translateX(${carouselWidth ? (carouselWidth / 2) - (currentStep * (carouselWidth / 3)) - (carouselWidth / 6) : 0}px)`,
              width: 'fit-content'
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
                    "w-[120px] px-2 flex flex-col items-center justify-center transition-all duration-300",
                    isCurrent ? "opacity-100 scale-110" : "opacity-50 scale-90",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full border mb-2 transition-colors",
                      isCurrent && "border-primary bg-primary/10 text-primary",
                      isPast && "border-primary bg-primary text-primary-foreground",
                      isFuture && "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    <StepIcon className="h-6 w-6" />
                  </div>
                  <span className={cn(
                    "text-xs font-medium text-center transition-colors line-clamp-1",
                    isCurrent && "text-primary",
                    isPast && "text-primary",
                    isFuture && "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
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