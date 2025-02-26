import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown } from "lucide-react";

interface MetricsProps {
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
}

export function ResumeMetricsComparison({ before, after }: MetricsProps) {
  const metrics = [
    { key: 'keywords', label: 'Keywords Match' },
    { key: 'skills', label: 'Skills Match' },
    { key: 'experience', label: 'Experience Match' },
    { key: 'education', label: 'Education Match' },
    { key: 'personalization', label: 'Personalization' },
    { key: 'aiReadiness', label: 'AI Readiness' }
  ];

  const getImprovement = (beforeVal: number, afterVal: number) => {
    const diff = afterVal - beforeVal;
    return {
      value: Math.abs(diff),
      isPositive: diff > 0
    };
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Card */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Overall Match Score</h3>
          <Badge variant={after.overall > 80 ? "default" : "outline"}>
            {after.overall}%
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <Progress value={after.overall} className="flex-1" />
          <div className="flex items-center gap-2">
            {getImprovement(before.overall, after.overall).isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm font-medium">
              {getImprovement(before.overall, after.overall).value}%
            </span>
          </div>
        </div>
      </Card>

      {/* Detailed Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        {metrics.map(({ key, label }) => (
          <Card key={key} className="p-4">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium text-sm">{label}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {before[key as keyof typeof before]}% →{" "}
                </span>
                <Badge variant="outline">
                  {after[key as keyof typeof after]}%
                </Badge>
              </div>
            </div>
            <Progress 
              value={after[key as keyof typeof after]} 
              className="h-2"
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
