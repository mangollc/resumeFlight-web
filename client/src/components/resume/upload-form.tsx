import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Resume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface UploadFormProps {
  onSuccess: (resume: Resume) => void;
}

export default function UploadForm({ onSuccess }: UploadFormProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      return res.json();
    },
    onSuccess: (resume: Resume) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      onSuccess(resume);
      toast({
        title: "Success",
        description: "Resume uploaded successfully",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Input
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <p className="text-sm text-muted-foreground">
          Supported formats: PDF, DOCX
        </p>
      </div>

      <Button
        type="submit"
        disabled={!file || uploadMutation.isPending}
        className="w-full"
      >
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          "Upload Resume"
        )}
      </Button>
    </form>
  );
}
