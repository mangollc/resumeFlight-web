import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadFormProps {
  onSuccess: (resume: UploadedResume) => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // Use custom headers for multipart/form-data
      const response = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload resume");
      }

      const data = await response.json();
      return data as UploadedResume;
    },
    onSuccess: (data) => {
      // Update the cache with the new resume
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-resumes"] });

      // Call the success callback with the uploaded resume
      onSuccess(data);

      // Show success message
      toast({
        title: "Success",
        description: "Resume uploaded successfully"
      });

      // Reset form
      setFile(null);
    },
    onError: (error: Error) => {
      console.error('Upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload resume: " + (error.message || "Unknown error"),
        variant: "destructive"
      });
      
      // Show a more specific message for PDF issues
      if (file?.type === 'application/pdf') {
        toast({
          title: "PDF Upload Tips",
          description: "Make sure your PDF is not password protected or corrupted. PDFs with complex formatting may not parse correctly.",
          duration: 6000
        });
      }
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile && (
      droppedFile.type === 'application/pdf' || 
      droppedFile.type === 'application/msword' || 
      droppedFile.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )) {
      setFile(droppedFile);
    } else {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF or Word document",
        variant: "destructive"
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-4 transition-colors",
          "hover:border-primary/50 focus-within:border-primary",
          isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
          "cursor-pointer"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => {
            const selectedFile = e.target.files?.[0];
            if (selectedFile) {
              setFile(selectedFile);
            }
          }}
          className={cn(
            "absolute inset-0 w-full h-full opacity-0 cursor-pointer",
            "file:cursor-pointer"
          )}
          aria-label="Upload resume file"
        />
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <div className="rounded-full bg-primary/10 p-2">
            <FileUp className="h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {file ? file.name : "Click to upload or drag and drop"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, DOC, DOCX (Max 5MB)
            </p>
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!file || uploadMutation.isPending}
        className="w-full sm:w-auto"
      >
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Resume
          </>
        )}
      </Button>
    </form>
  );
}