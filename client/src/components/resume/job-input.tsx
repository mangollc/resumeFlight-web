import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResume, JobDetails } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: OptimizedResume, details: JobDetails) => void;
  initialJobDetails?: JobDetails;
}

export default function JobInput({ resumeId, onOptimized, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState(initialJobDetails?.url || "");
  const [jobDescription, setJobDescription] = useState(initialJobDetails?.description || "");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);

  const optimizeMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/optimize`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to optimize resume');
      }
      const responseData = await res.json();
      return responseData;
    },
    onSuccess: (data: OptimizedResume) => {
      const details: JobDetails = {
        url: jobUrl || undefined,
        description: jobDescription || undefined,
        title: data.jobDetails.title,
        company: data.jobDetails.company,
        location: data.jobDetails.location,
      };

      setExtractedDetails(details);
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      onOptimized(data, details);

      toast({
        title: "Success",
        description: "Resume optimized successfully. You can optimize again with the same input if needed.",
      });
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("dynamically loaded or require authentication")) {
        toast({
          title: "LinkedIn Job Detection",
          description: "LinkedIn jobs require authentication. Please copy and paste the job description manually.",
          variant: "destructive",
          duration: 6000,
        });
        setActiveTab("manual");
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
      setIsProcessing(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobUrl && !jobDescription.trim()) {
      toast({
        title: "Error",
        description: "Please provide either a job URL or description",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    optimizeMutation.mutate(
      activeTab === "url" ? { jobUrl } : { jobDescription: jobDescription.trim() }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "url" | "manual")} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="url" disabled={isProcessing || !!jobDescription}>Job URL</TabsTrigger>
          <TabsTrigger value="manual" disabled={isProcessing || !!jobUrl}>Manual Input</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Input
              type="url"
              placeholder="Paste job posting URL here..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full"
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              Enter the URL of the job posting for best results
            </p>
          </div>
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Textarea
              placeholder="Or paste job description here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="min-h-[200px] w-full"
              disabled={isProcessing}
            />
            <p className="text-sm text-muted-foreground">
              Manually enter the job description if URL is not available
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {extractedDetails && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead colSpan={2} className="text-center">
                  Job Details
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Title</TableCell>
                <TableCell>{extractedDetails.title}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Company</TableCell>
                <TableCell>{extractedDetails.company}</TableCell>
              </TableRow>
              {extractedDetails.location && (
                <TableRow>
                  <TableCell className="font-medium">Location</TableCell>
                  <TableCell>{extractedDetails.location}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Button
        type="submit"
        disabled={(!jobUrl && !jobDescription.trim()) || isProcessing}
        className="w-full md:w-auto"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Optimizing...
          </>
        ) : (
          extractedDetails ? "Optimize Again" : "Optimize Resume"
        )}
      </Button>
    </form>
  );
}