import React from 'react';
import { type OptimizedResume } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface PreviewProps {
  resume: OptimizedResume;
  className?: string;
  showMetrics?: boolean;
}

const getMetricsColor = (value: number) => {
  if (value >= 80) return "bg-green-600";
  if (value >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

export default function Preview({ resume, className, showMetrics = true }: PreviewProps) {
  if (!resume) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card className="p-6">
          <div className="text-muted-foreground">No resume selected</div>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card className="p-6">
        <div className="prose max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap font-serif text-base">
            {resume.optimisedResume}
          </div>
        </div>
      </Card>

      {showMetrics && resume.metrics?.after && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Resume Metrics</h3>
          <div className="space-y-4">
            {Object.entries(resume.metrics.after).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="capitalize">{key}</span>
                  <span className="font-medium">{value}%</span>
                </div>
                <Progress
                  value={value}
                  className={`h-2 ${getMetricsColor(value)}`}
                />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}