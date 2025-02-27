
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface DownloadOptionsProps {
  documentId: string;
  documentType: 'resume' | 'cover-letter';
  className?: string;
}

export default function DownloadOptions({ documentId, documentType, className = "" }: DownloadOptionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const { toast } = useToast();

  const handleDownload = async () => {
    if (!documentId) return;
    
    try {
      setIsDownloading(true);
      const url = documentType === 'resume' 
        ? `/api/optimized-resume/${documentId}/download?format=${format}`
        : `/api/optimized-resume/cover-letter/${documentId}/download?format=${format}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to download ${documentType}`);
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${documentType === 'resume' ? 'resume' : 'cover_letter'}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `${documentType === 'resume' ? 'Resume' : 'Cover Letter'} downloaded successfully`,
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: `Failed to download ${documentType}`,
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Select value={format} onValueChange={(value) => setFormat(value as 'pdf' | 'docx')}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Format" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pdf">PDF</SelectItem>
          <SelectItem value="docx">DOCX</SelectItem>
        </SelectContent>
      </Select>
      
      <Button 
        onClick={handleDownload}
        size="sm"
        disabled={isDownloading}
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        Download
      </Button>
    </div>
  );
}
