import { Resume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useState } from "react";

interface PreviewProps {
  resume: Resume | null;
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
      const response = await fetch(`/api/resume/${resume.id}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const filename = resume.optimizedContent 
        ? `optimized-${resume.metadata.filename}`
        : resume.metadata.filename;

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

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-1">
            <h3 className="font-semibold truncate max-w-[200px] sm:max-w-none">
              {resume.metadata.filename}
            </h3>
            <p className="text-sm text-muted-foreground">
              {resume.optimizedContent ? "Optimized" : "Original"} Version
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full sm:w-auto"
          >
            <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
            {isDownloading ? 'Downloading...' : 'Download'}
          </Button>
        </div>

        <div className="prose prose-sm sm:prose max-w-none dark:prose-invert">
          <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {resume.optimizedContent || resume.originalContent}
            </pre>
          </div>
        </div>

        {resume.optimizedContent && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-3">Optimization Details</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Keywords matched with job description
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Professional formatting applied
              </li>
              <li className="flex items-center">
                <span className="mr-2">•</span>
                Content tailored to position
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}