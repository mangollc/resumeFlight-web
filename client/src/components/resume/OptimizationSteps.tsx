import { MobileAnalysisCard } from './MobileAnalysisCard';
import { ResumeMetricsComparison } from "./ResumeMetricsComparison";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, ArrowUpCircle, AlertCircle, LightbulbIcon } from "lucide-react";
import PDFDocument from "../documents/PDFDocument";

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

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-yellow-600";
  return "text-red-600";
};

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
                {/* Overall Score Card */}
                <Card className="p-6">
                  <h4 className="text-lg font-semibold mb-4 text-center">Overall Resume Score</h4>
                  <div className="flex justify-center gap-16 mb-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Before</div>
                      <div className={`text-3xl font-bold ${getScoreColor(optimizedResume.metrics.before.overall)}`}>
                        {optimizedResume.metrics.before.overall}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">After</div>
                      <div className={`text-3xl font-bold ${getScoreColor(optimizedResume.metrics.after.overall)}`}>
                        {optimizedResume.metrics.after.overall}%
                      </div>
                    </div>
                  </div>

                  {/* Detailed Metrics */}
                  <div className="space-y-4">
                    {Object.entries(optimizedResume.metrics.before).map(([key, value]) => {
                      if (key === 'overall') return null;
                      const beforeScore = value as number;
                      const afterScore = optimizedResume.metrics.after[key] as number;
                      const improvement = afterScore - beforeScore;

                      return (
                        <div key={key} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="capitalize text-sm font-medium">{key}</span>
                            <div className="flex items-center gap-4">
                              <span className={`text-sm ${getScoreColor(beforeScore)}`}>{beforeScore}%</span>
                              <span className="text-sm">→</span>
                              <span className={`text-sm ${getScoreColor(afterScore)}`}>{afterScore}%</span>
                              {improvement > 0 && (
                                <span className="text-xs text-green-600">(+{improvement}%)</span>
                              )}
                            </div>
                          </div>
                          <Progress value={afterScore} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Analysis Section */}
                <Card className="p-4 sm:p-6">
                  <h4 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Resume Analysis</h4>

                  <div className="space-y-3">
                    {/* Strengths */}
                    <div className="rounded-lg border">
                      <div className="w-full px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium text-sm">Strengths</span>
                          <span className="text-xs text-muted-foreground">
                            {optimizedResume.analysis?.strengths?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <ul className="space-y-1 text-sm">
                          {optimizedResume.analysis?.strengths?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Improvements */}
                    <div className="rounded-lg border">
                      <div className="w-full px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-sm">Improvements</span>
                          <span className="text-xs text-muted-foreground">
                            {optimizedResume.analysis?.improvements?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <ul className="space-y-1 text-sm">
                          {optimizedResume.analysis?.improvements?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Gaps */}
                    <div className="rounded-lg border">
                      <div className="w-full px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-sm">Gaps</span>
                          <span className="text-xs text-muted-foreground">
                            {optimizedResume.analysis?.gaps?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <ul className="space-y-1 text-sm">
                          {optimizedResume.analysis?.gaps?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Suggestions */}
                    <div className="rounded-lg border">
                      <div className="w-full px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LightbulbIcon className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">Suggestions</span>
                          <span className="text-xs text-muted-foreground">
                            {optimizedResume.analysis?.suggestions?.length || 0}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <ul className="space-y-1 text-sm">
                          {optimizedResume.analysis?.suggestions?.map((item: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-muted-foreground">{item}</span>
                            </li>
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