import React from 'react';
import { type OptimizedResume } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoverLetterProps {
  resume: OptimizedResume;
}

export default function CoverLetterComponent({ resume }: CoverLetterProps) {
  const { toast } = useToast();

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
    <Card className="p-6">
      <div className="prose max-w-none dark:prose-invert">
        <div className="whitespace-pre-wrap font-serif text-base">
          {resume.coverLetter}
        </div>
      </div>
      <div className="mt-6 flex gap-4">
        <Button onClick={() => downloadDocument('pdf')} variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button onClick={() => downloadDocument('docx')} variant="outline" size="sm">
          <FileDown className="mr-2 h-4 w-4" />
          Download DOCX
        </Button>
      </div>
    </Card>
  );
}
