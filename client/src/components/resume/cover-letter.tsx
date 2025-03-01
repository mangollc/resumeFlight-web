import React, { useState } from 'react';
import { type OptimizedResume } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CoverLetterProps {
  resume: OptimizedResume;
}

export default function CoverLetterComponent({ resume }: CoverLetterProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverLetter, setCoverLetter] = useState(resume.coverLetter);

  const generateCoverLetter = async (isRegenerate: boolean = false) => {
    try {
      setIsGenerating(true);
      const version = isRegenerate ? (parseFloat(resume.version || '0') + 0.1).toFixed(1) : 0.1;

      // Get contact info for cover letter generation.  Handles missing contact info gracefully.
      const contactInfo = resume.contactInfo || {
        fullName: "Applicant",
        email: "email@example.com",
        phone: "555-555-5555",
        linkedin: "",
        location: ""
      };

      const response = await apiRequest('/api/optimized-resume/' + resume.id + '/cover-letter', {
        method: 'POST',
        body: {
          version: parseFloat(version),
          contactInfo: contactInfo
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Unknown error" })); //More robust error handling
        const errorMessage = errorData.message || "Failed to generate cover letter";
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setCoverLetter(data.content);

      toast({
        title: "Success",
        description: isRegenerate ? "Cover letter regenerated successfully" : "Cover letter generated successfully",
      });
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate cover letter",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadDocument = async (format: 'pdf' | 'docx') => {
    try {
      toast({
        title: "Processing",
        description: "Preparing your cover letter for download...",
      });

      const response = await fetch(`/api/documents/cover-letter/${resume.id}/download?format=${format}`, {
        method: 'GET',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download cover letter");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${resume.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Cover letter downloaded successfully",
      });
    } catch (error) {
      console.error("Error downloading cover letter:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download cover letter",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {!coverLetter ? (
        <div className="text-center py-8">
          <Button 
            onClick={() => generateCoverLetter(false)} 
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate Cover Letter"}
          </Button>
          {isGenerating && <p className="mt-2 text-sm text-muted-foreground">This may take a minute or two...</p>}
        </div>
      ) : (
        <>
          <Card className="p-6">
            <div className="prose max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap font-serif text-base">
                {coverLetter}
              </div>
            </div>
          </Card>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => generateCoverLetter(true)} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <Button onClick={() => downloadDocument('pdf')} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button onClick={() => downloadDocument('docx')} variant="outline" size="sm">
              <FileDown className="mr-2 h-4 w-4" />
              Download DOCX
            </Button>
          </div>
        </>
      )}
    </div>
  );
}