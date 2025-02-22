
import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Preview from "@/components/resume/preview";
import { OptimizedResume } from "@/types";

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: any;
  onDownload: (id: string) => void;
}

export function ReviewSection({ optimizedResume, coverLetter, onDownload }: ReviewSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (id: string) => {
    setIsDownloading(true);
    await onDownload(id);
    setIsDownloading(false);
  };

  return (
    <div className="space-y-8 p-6">
      <div>
        <h3 className="text-2xl font-semibold mb-6 text-foreground/90">
          Resume Optimization Review
        </h3>
        <Preview resume={optimizedResume} />
        <div className="mt-4 flex justify-end">
          <Button onClick={() => handleDownload(optimizedResume.id)} disabled={isDownloading}>
            {isDownloading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Download Resume
          </Button>
        </div>
      </div>

      {coverLetter && (
        <div>
          <h3 className="text-2xl font-semibold mb-6 text-foreground/90">
            Cover Letter
          </h3>
          <Card>
            <CardContent className="p-6">
              <pre className="whitespace-pre-wrap font-sans">{coverLetter.content}</pre>
            </CardContent>
          </Card>
          <div className="mt-4 flex justify-end">
            <Button onClick={() => handleDownload(coverLetter.id)} disabled={isDownloading}>
              {isDownloading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download Cover Letter
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
