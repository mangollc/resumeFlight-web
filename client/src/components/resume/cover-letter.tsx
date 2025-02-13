import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedResume, CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface CoverLetterProps {
  resume: OptimizedResume;
  onGenerated?: (coverLetter: CoverLetterType) => void;
  generatedCoverLetter?: CoverLetterType | null;
  readOnly?: boolean;
}

export default function CoverLetterComponent({ resume, onGenerated, generatedCoverLetter, readOnly = false }: CoverLetterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`);
      return res.json();
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
          <CardContent className="p-6">
            <div className="space-y-1 mb-4">
              <h4 className="font-semibold">Generated Cover Letter</h4>
              <p className="text-sm text-muted-foreground">
                Created on {new Date(generatedCoverLetter?.createdAt || generateMutation.data?.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
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