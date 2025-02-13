import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResume } from "@shared/schema";
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
import { Badge } from "@/components/ui/badge";

export interface JobDetails {
  title: string;
  company: string;
  salary?: string;
  location: string;
  url?: string;
  description?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
}

interface JobInputProps {
  resumeId: number;
  onNext: () => void;
  initialJobDetails?: Partial<JobDetails>;
}

export default function JobInput({ resumeId, onNext, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState(initialJobDetails?.url || "");
  const [jobDescription, setJobDescription] = useState(initialJobDetails?.description || "");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails as JobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchJobMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/optimize`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to fetch job details');
      }
      return res.json();
    },
    onSuccess: (data: OptimizedResume) => {
      const details: JobDetails = {
        url: jobUrl || undefined,
        description: jobDescription || undefined,
        title: data.jobDetails.title,
        company: data.jobDetails.company,
        location: data.jobDetails.location,
        salary: data.jobDetails.salary,
        positionLevel: data.jobDetails.positionLevel,
        keyRequirements: data.jobDetails.keyRequirements,
        skillsAndTools: data.jobDetails.skillsAndTools
      };

      setExtractedDetails(details);
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });

      toast({
        title: "Success",
        description: "Job details fetched successfully",
      });
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      if (error.message.includes("dynamically loaded or require authentication")) {
        toast({
          title: "LinkedIn Job Detection",
          description: "LinkedIn jobs require authentication. Please paste the description manually.",
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

  const handleSubmit = async (e: React.FormEvent) => {
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
    fetchJobMutation.mutate(
      activeTab === "url" ? { jobUrl } : { jobDescription: jobDescription.trim() }
    );
  };

  const getSkillBadgeVariant = (skill: string): "default" | "secondary" | "destructive" | "outline" => {
    return "default";
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
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

        <Button
          type="submit"
          disabled={(!jobUrl && !jobDescription.trim()) || isProcessing}
          className="w-full md:w-auto"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Fetch Job Info"
          )}
        </Button>
      </form>

      {extractedDetails && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Job Details</h3>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium w-1/4">Title</TableCell>
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
                      <TableCell>
                        <Badge variant="secondary">
                          {extractedDetails.positionLevel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {extractedDetails.keyRequirements && extractedDetails.keyRequirements.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Key Requirements</h4>
                <ul className="list-disc list-inside space-y-2">
                  {extractedDetails.keyRequirements.map((requirement, index) => (
                    <li key={index} className="text-muted-foreground">{requirement}</li>
                  ))}
                </ul>
              </div>
            )}

            {extractedDetails.skillsAndTools && extractedDetails.skillsAndTools.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Required Skills & Tools</h4>
                <div className="flex flex-wrap gap-2">
                  {extractedDetails.skillsAndTools.map((skill, index) => (
                    <Badge
                      key={index}
                      variant={getSkillBadgeVariant(skill)}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <Button onClick={onNext} size="lg">
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}