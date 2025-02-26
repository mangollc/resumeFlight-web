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
      <Card className="p-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xl font-semibold">Overall Score</h3>
          <Badge className="text-lg">{Math.round(metrics.overall)}%</Badge>
        </div>
        <Progress value={Math.round(metrics.overall)} className="h-2" />
      </Card>

      {/* Other Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            <div className="flex flex-col">
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