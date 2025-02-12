import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Resume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: Resume) => void;
}

export default function JobInput({ resumeId, onOptimized }: JobInputProps) {
  const { toast } = useToast();
  const [jobDescription, setJobDescription] = useState("");

  const optimizeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/optimize`, {
        jobDescription,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      onOptimized(data);
      toast({
        title: "Success",
        description: "Resume optimized successfully",
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
    if (jobDescription.trim()) {
      optimizeMutation.mutate();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Textarea
        placeholder="Paste job description here..."
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        className="min-h-[200px]"
      />

      <Button
        type="submit"
        disabled={!jobDescription.trim() || optimizeMutation.isPending}
        className="w-full"
      >
        {optimizeMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Optimizing...
          </>
        ) : (
          "Optimize Resume"
        )}
      </Button>
    </form>
  );
}
