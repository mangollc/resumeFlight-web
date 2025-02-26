import { ResumeMetricsComparison } from "./ResumeMetricsComparison";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type ProgressStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  error?: string;
};

interface OptimizationStepsProps {
  steps: ProgressStep[];
  optimizedResume?: any;
  onNext?: () => void;
  onBack?: () => void;
}

export function OptimizationSteps({ steps, optimizedResume, onNext, onBack }: OptimizationStepsProps) {
  const currentStep = steps.findIndex(step => step.status === "in_progress");
  const progress = Math.round((steps.filter(s => s.status === "completed").length / steps.length) * 100);

  return (
    <div className="space-y-8">
      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-center">{progress}% Complete</p>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="space-y-2">
            <div className="flex items-center gap-4">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                ${step.status === "completed" ? "bg-primary text-primary-foreground" :
                  step.status === "in_progress" ? "bg-primary/20 text-primary" :
                    step.status === "error" ? "bg-destructive text-destructive-foreground" :
                      "bg-muted text-muted-foreground"}
              `}>
                {index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              <div className="text-sm text-muted-foreground">
                {step.status === "completed" && "✓"}
                {step.status === "in_progress" && "..."}
                {step.status === "error" && "!"}
              </div>
            </div>

            {/* Show error if any */}
            {step.status === "error" && step.error && (
              <Alert variant="destructive">
                <AlertDescription>{step.error}</AlertDescription>
              </Alert>
            )}

            {/* Show analysis after optimization */}
            {step.id === "optimize" && step.status === "completed" && optimizedResume && (
              <Card className="p-6 mt-4">
                <h4 className="text-lg font-semibold mb-4">Optimization Analysis</h4>
                <ResumeMetricsComparison
                  metrics={optimizedResume.metrics}
                  analysis={optimizedResume.analysis}
                />
              </Card>
            )}
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={!onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!onNext || currentStep !== -1}>
          Continue
        </Button>
      </div>
    </div>
  );
}
