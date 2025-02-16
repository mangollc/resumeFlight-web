import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download } from "lucide-react";

interface CoverLetterProps {
  resume: OptimizedResume;
  onGenerated?: (coverLetter: CoverLetterType) => void;
  generatedCoverLetter?: CoverLetterType | null;
  readOnly?: boolean;
}

export default function CoverLetterComponent({ resume, onGenerated, generatedCoverLetter, readOnly = false }: CoverLetterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const contactInfo = resume.contactInfo || resume.jobDetails?.contactInfo;
      if (!contactInfo?.fullName || !contactInfo?.email || !contactInfo?.phone) {
        throw new Error("Complete contact information (name, email, and phone) is required to generate a cover letter");
      }

      const response = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`, {
        contactInfo: {
          fullName: contactInfo.fullName,
          email: contactInfo.email,
          phone: contactInfo.phone,
          address: contactInfo.address
        },
        version: resume.metadata.version || 1.0
      });

      if (!response.ok) {
        throw new Error("Failed to generate cover letter");
      }

      return response.json();
    },
    onSuccess: (data) => {
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

  const formatDownloadFilename = (name: string, version: number) => {
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
    return `${baseName}_cover_v${version.toFixed(1)}`;
  };

  const handleDownload = async () => {
    if (!generatedCoverLetter?.id) return;

    try {
      setIsDownloading(true);
      const response = await fetch(`/api/cover-letter/${generatedCoverLetter.id}/download`, {
        headers: {
          'Accept': 'application/pdf'
        }
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formatDownloadFilename(
        generatedCoverLetter.metadata.filename,
        generatedCoverLetter.metadata.version
      )}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
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
      {!readOnly && !generatedCoverLetter && (
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
      )}

      {(generatedCoverLetter || generateMutation.data) && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-semibold">Generated Cover Letter (v{generatedCoverLetter?.metadata.version.toFixed(1) || generateMutation.data?.metadata.version.toFixed(1)})</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Created on {new Date(generatedCoverLetter?.createdAt || generateMutation.data?.createdAt).toLocaleDateString()}
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
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="max-h-[300px] sm:max-h-[500px] overflow-y-auto rounded-md bg-muted p-3 sm:p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {generatedCoverLetter?.content || generateMutation.data?.content}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}