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

            {/* Show metrics and analysis in optimize step */}
            {step.id === "optimize" && step.status === "completed" && optimizedResume && (
              <div className="space-y-6 mt-4">
                {/* Metrics Section */}
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Resume Optimization Results</h4>
                  <ResumeMetricsComparison
                    metrics={{
                      before: optimizedResume.metrics.before || {
                        overall: 0,
                        keywords: 0,
                        skills: 0,
                        experience: 0,
                        education: 0,
                        personalization: 0,
                        aiReadiness: 0,
                        confidence: 0
                      },
                      after: optimizedResume.metrics.after || {
                        overall: 0,
                        keywords: 0,
                        skills: 0,
                        experience: 0,
                        education: 0,
                        personalization: 0,
                        aiReadiness: 0,
                        confidence: 0
                      }
                    }}
                    analysis={{
                      strengths: optimizedResume.analysis?.strengths || [],
                      improvements: optimizedResume.analysis?.improvements || [],
                      gaps: optimizedResume.analysis?.gaps || [],
                      suggestions: optimizedResume.analysis?.suggestions || []
                    }}
                  />
                </Card>

                {/* Analysis Section */}
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4">Resume Analysis</h4>
                  <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Strengths */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-sm">Strengths</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {optimizedResume.analysis?.strengths?.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvements */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-sm">Improvements</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {optimizedResume.analysis?.improvements?.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Gaps */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-sm">Gaps</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {optimizedResume.analysis?.gaps?.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Suggestions */}
                      <div className="space-y-2">
                        <h5 className="font-semibold text-sm">Suggestions</h5>
                        <ul className="list-disc list-inside space-y-1">
                          {optimizedResume.analysis?.suggestions?.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-muted-foreground">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
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