import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Preview from "@/components/resume/preview";
import { OptimizedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: any;
  onDownload?: (id: string) => void;
}

export function ReviewSection({ optimizedResume, coverLetter, onDownload }: ReviewSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      if (onDownload) {
        await onDownload(optimizedResume.id.toString());
      } else {
        const response = await fetch(`/api/optimized-resume/${optimizedResume.id}/download`);
        if (!response.ok) {
          throw new Error('Failed to download resume');
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = optimizedResume?.metadata.filename || 'resume.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      toast({
        title: "Success",
        description: "Resume downloaded successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Final Review
        </h2>
        <div className="space-y-12">
          <div>
            <h3 className="text-xl font-semibold mb-6 text-foreground/90">
              Optimized Resume
            </h3>
            <Preview resume={optimizedResume} />
            <div className="mt-4 flex justify-end">
              <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download Resume
              </Button>
            </div>
          </div>

          {/* Cover Letter Section */}
          {coverLetter && (
            <div>
              <h3 className="text-xl font-semibold mb-6 flex items-center space-x-2">
                <span className="bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50 bg-clip-text text-transparent">
                  Cover Letter
                </span>
              </h3>
              <div className="bg-muted/30 rounded-lg p-8 transition-all duration-300 hover:bg-muted/40">
                <div className="prose prose-sm max-w-none text-foreground/80">
                  <pre className="whitespace-pre-wrap">
                    {coverLetter.content}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}