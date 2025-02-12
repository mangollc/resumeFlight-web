import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Resume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobDetails {
  title: string;
  company: string;
  salary?: string;
  location: string;
  description: string;
  positionLevel?: string;
  candidateProfile?: string;
}

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: Resume) => void;
}

export default function JobInput({ resumeId, onOptimized }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(null);

  const optimizeMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/optimize`, data);
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedDetails(data.jobDetails);
      queryClient.invalidateQueries({ queryKey: ["/api/resume"] });
      onOptimized(data);
      toast({
        title: "Success",
        description: "Resume optimized successfully",
      });
    },
    onError: (error: Error) => {
      // Check if it's a LinkedIn authentication error
      if (error.message.includes("dynamically loaded or require authentication")) {
        toast({
          title: "LinkedIn Job Detection",
          description: "LinkedIn jobs require authentication. Please copy and paste the job description manually.",
          variant: "destructive",
          duration: 6000,
        });
        // Switch to manual input tab
        const manualTab = document.querySelector('[value="manual"]') as HTMLElement;
        if (manualTab) {
          manualTab.click();
        }
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
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

    optimizeMutation.mutate(
      jobUrl ? { jobUrl } : { jobDescription: jobDescription.trim() }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="url" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="url">Job URL</TabsTrigger>
          <TabsTrigger value="manual">Manual Input</TabsTrigger>
        </TabsList>

        <TabsContent value="url" className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Input
              type="url"
              placeholder="Paste job posting URL here..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full"
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
            />
            <p className="text-sm text-muted-foreground">
              Manually enter the job description if URL is not available
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {extractedDetails && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm space-y-4">
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
              {extractedDetails.salary && (
                <TableRow>
                  <TableCell className="font-medium">Salary</TableCell>
                  <TableCell>{extractedDetails.salary}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell className="font-medium">Location</TableCell>
                <TableCell>{extractedDetails.location}</TableCell>
              </TableRow>
              {extractedDetails.positionLevel && (
                <TableRow>
                  <TableCell className="font-medium">Position Level</TableCell>
                  <TableCell>{extractedDetails.positionLevel}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {extractedDetails.candidateProfile && (
            <div className="p-4">
              <h4 className="font-medium mb-2">Ideal Candidate Profile</h4>
              <p className="text-sm text-muted-foreground">{extractedDetails.candidateProfile}</p>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={(!jobUrl && !jobDescription.trim()) || optimizeMutation.isPending}
        className="w-full md:w-auto"
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