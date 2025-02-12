import { useState } from "react";
import { UploadedResume, OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Maximize2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PreviewProps {
  resume: UploadedResume | OptimizedResume | null;
}

export default function Preview({ resume }: PreviewProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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

  // Helper function to find and highlight differences between versions
  const markDifferences = (original: string, optimized: string) => {
    const originalWords = original.split(/\s+/);
    const optimizedWords = optimized.split(/\s+/);
    const markedOriginal: string[] = [];
    const markedOptimized: string[] = [];

    let i = 0, j = 0;
    while (i < originalWords.length || j < optimizedWords.length) {
      const origWord = originalWords[i] || '';
      const optWord = optimizedWords[j] || '';

      if (origWord === optWord) {
        markedOriginal.push(origWord);
        markedOptimized.push(optWord);
        i++;
        j++;
      } else {
        // Try to find next matching word
        let found = false;
        for (let k = 1; k < 3; k++) {
          if (originalWords[i + k] === optimizedWords[j]) {
            // Words removed from original
            for (let l = 0; l < k; l++) {
              markedOriginal.push(`<span class="bg-red-100 dark:bg-red-900/50 px-1 rounded">${originalWords[i + l]}</span>`);
            }
            i += k;
            found = true;
            break;
          } else if (originalWords[i] === optimizedWords[j + k]) {
            // Words added in optimized
            for (let l = 0; l < k; l++) {
              markedOptimized.push(`<span class="bg-green-100 dark:bg-green-900/50 px-1 rounded">${optimizedWords[j + l]}</span>`);
            }
            j += k;
            found = true;
            break;
          }
        }
        if (!found) {
          // Mark current words as changed
          markedOriginal.push(`<span class="bg-red-100 dark:bg-red-900/50 px-1 rounded">${origWord}</span>`);
          markedOptimized.push(`<span class="bg-green-100 dark:bg-green-900/50 px-1 rounded">${optWord}</span>`);
          i++;
          j++;
        }
      }
    }

    return {
      markedOriginal: markedOriginal.join(' '),
      markedOptimized: markedOptimized.join(' ')
    };
  };

  const ComparisonView = () => {
    if (!isOptimized) return null;

    const optimizedResume = resume as OptimizedResume;
    const { markedOriginal, markedOptimized } = markDifferences(
      optimizedResume.originalContent,
      optimizedResume.content
    );

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Original Version
            <span className="text-xs text-muted-foreground font-normal">
              (Removed content in red)
            </span>
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="max-h-[600px] overflow-y-auto rounded-md bg-muted p-4">
              <div 
                className="whitespace-pre-wrap font-sans text-sm"
                dangerouslySetInnerHTML={{ __html: markedOriginal }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Optimized Version
            <span className="text-xs text-muted-foreground font-normal">
              (Added/changed content in green)
            </span>
          </h3>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="max-h-[600px] overflow-y-auto rounded-md bg-muted p-4">
              <div 
                className="whitespace-pre-wrap font-sans text-sm"
                dangerouslySetInnerHTML={{ __html: markedOptimized }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 border border-green-200 dark:border-green-800">
                    <svg className="w-3 h-3 mr-1 fill-current" viewBox="0 0 12 12">
                      <path d="M3.293 9.293a1 1 0 0 1 0-1.414L6.586 4.88 3.293 1.586a1 1 0 1 1 1.414-1.414l4 4a1 1 0 0 1 0 1.414l-4 4a1 1 0 0 1-1.414 0z"/>
                    </svg>
                    Optimized Version
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800">
                    Original Version
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Compare Versions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Resume Comparison</DialogTitle>
                    </DialogHeader>
                    <ComparisonView />
                  </DialogContent>
                </Dialog>
                {isOptimized && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isDownloading}
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert">
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
                    <div className="flex justify-between items-center text-sm">
                      <span>Overall Match</span>
                      <span className="font-medium">
                        {(resume as OptimizedResume).metrics.overall}%
                      </span>
                    </div>
                    <Progress 
                      value={(resume as OptimizedResume).metrics.overall}
                      className={`h-2 ${getMetricsColor((resume as OptimizedResume).metrics.overall)}`}
                    />
                  </div>
                  {['keywords', 'skills', 'experience'].map((metric) => (
                    <div key={metric} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="capitalize">{metric}</span>
                        <span className="font-medium">
                          {(resume as OptimizedResume).metrics[metric as keyof OptimizedResume['metrics']]}%
                        </span>
                      </div>
                      <Progress 
                        value={(resume as OptimizedResume).metrics[metric as keyof OptimizedResume['metrics']]}
                        className={`h-2 ${getMetricsColor((resume as OptimizedResume).metrics[metric as keyof OptimizedResume['metrics']])}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}