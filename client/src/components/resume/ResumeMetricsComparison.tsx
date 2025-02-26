import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetricsProps {
  metrics: {
    overall: number;
    keywords: number;
    skills: number;
    experience: number;
    education: number;
    personalization: number;
    aiReadiness: number;
    confidence: number;
  };
}

export function ResumeMetricsComparison({ metrics }: MetricsProps) {
  return (
    <div className="space-y-4">
      {/* Overall Score Card */}
      <div className="rounded-lg border bg-card p-6 text-center">
        <h3 className="text-xl font-semibold mb-4">Overall Score</h3>
        <div className="flex flex-col items-center gap-2">
          <div className="text-5xl font-bold text-primary">
            {Math.round(metrics.overall)}%
          </div>
          <Progress value={Math.round(metrics.overall)} className="w-full h-2" />
        </div>
      </div>

      {/* Other Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { key: 'keywords', label: 'Keywords' },
          { key: 'skills', label: 'Skills' },
          { key: 'experience', label: 'Experience' },
          { key: 'education', label: 'Education' },
          { key: 'personalization', label: 'Personalization' },
          { key: 'aiReadiness', label: 'AI Readiness' },
          { key: 'confidence', label: 'Confidence' }
        ].map(({ key, label }) => (
          <Card key={key} className="p-4">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-2xl font-semibold">
                {Math.round(metrics[key as keyof typeof metrics])}%
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}