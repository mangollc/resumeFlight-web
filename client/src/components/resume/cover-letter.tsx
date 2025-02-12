import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedResume, CoverLetter } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Download, FileText, Loader2 } from "lucide-react";

interface CoverLetterProps {
  resume: OptimizedResume;
  onGenerated?: (coverLetter: CoverLetter) => void;
}

export default function CoverLetterComponent({ resume, onGenerated }: CoverLetterProps) {
  const { toast } = useToast();
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`);
      return res.json();
    },
    onSuccess: (data) => {
      setCoverLetter(data);
      queryClient.invalidateQueries({ queryKey: ["/api/cover-letter"] });
      if (onGenerated) onGenerated(data);
      toast({
        title: "Success",
        description: "Cover letter generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async () => {
    if (!coverLetter) return;

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/cover-letter/${coverLetter.id}/download`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = coverLetter.metadata.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Cover Letter</h3>
          <p className="text-sm text-muted-foreground">
            Generate a tailored cover letter based on your resume and job description
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            "Generate Cover Letter"
          )}
        </Button>
      </div>

      {coverLetter && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <div className="space-y-1">
                <h4 className="font-semibold">Generated Cover Letter</h4>
                <p className="text-sm text-muted-foreground">
                  Created on {new Date(coverLetter.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
              >
                <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                {isDownloading ? 'Downloading...' : 'Download'}
              </Button>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {coverLetter.content}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}