import { useState } from "react";
import { UploadedResume, OptimizedResume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DiffView } from "./diff-view";

const handleDownload = async (id: number) => {
  try {
    const response = await fetch(`/api/optimized-resume/${id}/download`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimized-resume-${id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download failed:', error);
  }
};

interface PreviewProps {
  resume: UploadedResume | OptimizedResume | null;
}

export function Preview({ resume }: PreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  if (!resume) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <p className="font-medium">No resume selected</p>
            <p className="text-sm text-muted-foreground">
              Upload a resume to get started with optimization
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOptimized = 'jobDescription' in resume;
  const originalContent = isOptimized ? (resume as OptimizedResume).originalContent : resume.content;
  const optimizedContent = resume.content;

  const getMetricsColor = (value: number) => {
    if (value >= 80) return "bg-emerald-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent Match";
    if (score >= 60) return "Good Match";
    if (score >= 40) return "Fair Match";
    return "Needs Improvement";
  };

  const MetricRow = ({ label, before, after }: { label: string, before?: number, after: number }) => (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {before !== undefined && (
            <>
              <span className="text-muted-foreground">Before: {before}%</span>
              <span className="text-muted-foreground">→</span>
            </>
          )}
          <span className={cn(
            "font-medium px-2 py-0.5 rounded text-xs",
            after >= 80 ? "bg-emerald-100 text-emerald-700" :
              after >= 60 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
          )}>
            {after}%
          </span>
        </div>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            getMetricsColor(after)
          )}
          style={{ width: `${after}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {getScoreLabel(after)}
      </p>
    </div>
  );

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                  {resume.metadata.filename}
                </h3>
                {isOptimized ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                    Optimized Version
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    Original Version
                  </span>
                )}
              </div>
              {isOptimized && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(true)}>
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Compare Versions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Resume Comparison</DialogTitle>
                      <DialogDescription>
                        Compare the original and optimized versions of your resume side by side.
                        Highlighted sections show improvements and optimizations.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      {isDialogOpen && (
                        <DiffView
                          beforeContent={originalContent}
                          afterContent={optimizedContent}
                          resumeId={(resume as OptimizedResume).id}
                          onDownload={handleDownload}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {optimizedContent}
              </pre>
            </div>
          </div>

          {isOptimized && (resume as OptimizedResume).metrics && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Resume Match Analysis</h4>
                  {(resume as OptimizedResume).metrics?.before && (
                    <div className="text-xs text-muted-foreground">
                      Showing improvement from original resume
                    </div>
                  )}
                </div>
                <div className="grid gap-6">
                  <MetricRow
                    label="Overall Match Score"
                    before={(resume as OptimizedResume).metrics?.before?.overall}
                    after={(resume as OptimizedResume).metrics?.after?.overall || 0}
                  />
                  <MetricRow
                    label="Keyword Alignment"
                    before={(resume as OptimizedResume).metrics?.before?.keywords}
                    after={(resume as OptimizedResume).metrics?.after?.keywords || 0}
                  />
                  <MetricRow
                    label="Skills Match"
                    before={(resume as OptimizedResume).metrics?.before?.skills}
                    after={(resume as OptimizedResume).metrics?.after?.skills || 0}
                  />
                  <MetricRow
                    label="Experience Relevance"
                    before={(resume as OptimizedResume).metrics?.before?.experience}
                    after={(resume as OptimizedResume).metrics?.after?.experience || 0}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}