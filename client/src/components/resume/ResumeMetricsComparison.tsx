import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

interface MetricsProps {
  metrics: {
    before: {
      overall: number;
      keywords: number;
      skills: number;
      experience: number;
      education: number;
      personalization: number;
      aiReadiness: number;
      confidence: number;
    };
    after: {
      overall: number;
      keywords: number;
      skills: number;
      experience: number;
      education: number;
      personalization: number;
      aiReadiness: number;
      confidence: number;
    };
  };
  analysis: {
    strengths: string[];
    improvements: string[];
    gaps: string[];
    suggestions: string[];
  };
}

export function ResumeMetricsComparison({ metrics, analysis }: MetricsProps) {
  const roundScore = (score: number) => Math.round(score);

  const MetricRow = ({ label, before, after }: { label: string; before: number; after: number }) => (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground min-w-[120px]">{label}</span>
      <div className="flex items-center gap-2 flex-1">
        <span className="font-semibold">{roundScore(before)}%</span>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-primary">{roundScore(after)}%</span>
        <Progress value={roundScore(after)} className="flex-1" />
      </div>
    </div>
  );

  const AnalysisSection = ({ title, items }: { title: string; items: string[] }) => (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">{title}</h4>
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-muted-foreground">{item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <div className="rounded-lg border bg-card p-6 text-center">
        <h3 className="text-xl font-semibold mb-4">Overall Score</h3>
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold">{roundScore(metrics.before.overall)}%</span>
            <ArrowRight className="h-6 w-6" />
            <span className="text-4xl font-bold text-primary">{roundScore(metrics.after.overall)}%</span>
          </div>
          <Progress value={roundScore(metrics.after.overall)} className="w-full h-2" />
        </div>
      </div>

      {/* Detailed Metrics */}
      <Card className="p-6 space-y-4">
        <h4 className="font-semibold">Detailed Scores</h4>
        <div className="space-y-3">
          <MetricRow label="Keywords" before={metrics.before.keywords} after={metrics.after.keywords} />
          <MetricRow label="Skills" before={metrics.before.skills} after={metrics.after.skills} />
          <MetricRow label="Experience" before={metrics.before.experience} after={metrics.after.experience} />
          <MetricRow label="Education" before={metrics.before.education} after={metrics.after.education} />
          <MetricRow label="Personalization" before={metrics.before.personalization} after={metrics.after.personalization} />
          <MetricRow label="AI Readiness" before={metrics.before.aiReadiness} after={metrics.after.aiReadiness} />
          <MetricRow label="Confidence" before={metrics.before.confidence} after={metrics.after.confidence} />
        </div>
      </Card>

      {/* Analysis Section */}
      <Card className="p-6 space-y-6">
        <h4 className="font-semibold">Analysis</h4>
        <div className="grid gap-6 md:grid-cols-2">
          <AnalysisSection title="Strengths" items={analysis.strengths} />
          <AnalysisSection title="Improvements" items={analysis.improvements} />
          <AnalysisSection title="Gaps" items={analysis.gaps} />
          <AnalysisSection title="Suggestions" items={analysis.suggestions} />
        </div>
      </Card>
    </div>
  );
}