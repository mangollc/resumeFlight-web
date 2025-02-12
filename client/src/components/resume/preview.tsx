import { UploadedResume, OptimizedResume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useState } from "react";
import { Progress } from "@/components/ui/progress";

interface PreviewProps {
  resume: UploadedResume | OptimizedResume | null;
}

export default function Preview({ resume }: PreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const isOptimized = 'jobDescription' in resume;
      const endpoint = isOptimized ? `/api/optimized-resume/${resume.id}/download` : `/api/uploaded-resume/${resume.id}/download`;

      const response = await fetch(endpoint);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = resume.metadata.filename;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const isOptimized = 'jobDescription' in resume;

  const getMetricsColor = (value: number) => {
    if (value >= 80) return "bg-green-600";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="font-semibold truncate max-w-[200px] sm:max-w-none">
                {resume.metadata.filename}
              </h3>
              <div className="flex items-center gap-3">
                {isOptimized ? (
                  <>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 12 12">
                        <path d="M3.293 9.293a1 1 0 0 1 0-1.414L6.586 4.88 3.293 1.586a1 1 0 1 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"/>
                      </svg>
                      Optimized Version
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={isDownloading}
                    >
                      <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                      {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                  </>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800">
                    <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 12 12">
                      <circle cx="6" cy="6" r="5"/>
                    </svg>
                    Original Version
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
            <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {resume.content}
              </pre>
            </div>
          </div>

          {isOptimized && (
            <div className="mt-6 space-y-6">
              <div className="space-y-4">
                <h4 className="font-semibold">Resume Match Analysis</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Match</span>
                      <span className="font-medium">{resume.metrics.overall}%</span>
                    </div>
                    <Progress 
                      value={resume.metrics.overall} 
                      className={`h-2 ${getMetricsColor(resume.metrics.overall)}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Keywords</span>
                      <span className="font-medium">{resume.metrics.keywords}%</span>
                    </div>
                    <Progress 
                      value={resume.metrics.keywords} 
                      className={`h-2 ${getMetricsColor(resume.metrics.keywords)}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Skills</span>
                      <span className="font-medium">{resume.metrics.skills}%</span>
                    </div>
                    <Progress 
                      value={resume.metrics.skills} 
                      className={`h-2 ${getMetricsColor(resume.metrics.skills)}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Experience</span>
                      <span className="font-medium">{resume.metrics.experience}%</span>
                    </div>
                    <Progress 
                      value={resume.metrics.experience} 
                      className={`h-2 ${getMetricsColor(resume.metrics.experience)}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}