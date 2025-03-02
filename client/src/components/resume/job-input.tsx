import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { OptimizedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResumeMetricsComparison } from "./ResumeMetricsComparison";

interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
  workplaceType?: string;
}

const INITIAL_STEPS = [
  { id: "extract", label: "Extracting job details", status: "pending" },
  { id: "analyze", label: "Analyzing requirements", status: "pending" },
  // { id: "optimize", label: "Optimizing resume", status: "pending" }, // Removed optimization step
];

const UNSUPPORTED_JOB_SITES = [
  { domain: "indeed.com", name: "Indeed" },
  { domain: "ziprecruiter.com", name: "ZipRecruiter" },
];

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: OptimizedResume, details: JobDetails) => void;
  initialJobDetails?: JobDetails;
}

export default function JobInput({ resumeId, onOptimized, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [uploadedResume, setUploadedResume] = useState({ id: resumeId });


  useEffect(() => {
    //No changes needed here
  }, []);

  const updateStepStatus = (stepId: string, status: ProgressStep["status"]) => {
    setProgressSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleCancel = () => {
    setProgressSteps(INITIAL_STEPS);
    setIsProcessing(false);
    fetchJobMutation.reset();
    optimizeResumeMutation.reset(); //added reset for the new mutation
  };

  const handleReset = () => {
    setJobUrl("");
    setJobDescription("");
    setExtractedDetails(null);
    setActiveTab("url");
    handleCancel();
  };

  const getSkillBadgeVariant = (skill: string) => {
    //No changes needed here
  };

  const isValidLinkedInUrl = (url: string): boolean => {
    //No changes needed here
  };

  const checkUnsupportedJobSite = (url: string): string | null => {
    //No changes needed here
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    //No changes needed here
  };

  // Fetch job details mutation
  const fetchJobMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      if (!resumeId) {
        throw new Error("Resume ID is required");
      }

      const params = new URLSearchParams();
      if (data.jobUrl) params.append("jobUrl", data.jobUrl);
      if (data.jobDescription) params.append("jobDescription", data.jobDescription);

      const response = await apiRequest(
        'POST',
        `/api/job-details/extract`,
        data
      );

      if (!response.ok) {
        throw new Error('Failed to extract job details');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const details: JobDetails = {
        title: data.title || "",
        company: data.company || "",
        location: data.location || "",
        salary: data.salary,
        description: data.description,
        positionLevel: data.positionLevel,
        keyRequirements: Array.isArray(data.keyRequirements) ? data.keyRequirements : [],
        skillsAndTools: Array.isArray(data.skillsAndTools) ? data.skillsAndTools : [],
        workplaceType: data.workplaceType,
      };

      setExtractedDetails(details);
      updateStepStatus("extract", "completed");
      // updateStepStatus("analyze", "completed"); //this line is moved to optimizeResumeMutation.onSuccess
      toast({
        title: "Success",
        description: "Job details extracted successfully",
        duration: 2000,
      });

      setIsProcessing(false);
    },
    onError: (error: Error) => {
      console.error("Job details extraction error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to extract job details. Please try again.",
        variant: "destructive",
      });

      setIsProcessing(false);
      setProgressSteps((prev) =>
        prev.map((step) => ({
          ...step,
          status: step.status === "pending" || step.status === "loading" ? "error" : step.status,
        }))
      );
    },
  });

  // Optimization mutation (added)
  const optimizeResumeMutation = useMutation({
    mutationFn: async (details: JobDetails) => {
      if (!resumeId || !details) {
        throw new Error("Resume ID and job details are required");
      }
      const response = await apiRequest(
        'POST',
        `/api/uploaded-resumes/${resumeId}/optimize`,
        {details}
      );
      if (!response.ok) {
        throw new Error("Failed to optimize resume");
      }
      return response.json();
    },
    onSuccess: (data) => {
      onOptimized(data, extractedDetails!);
      updateStepStatus("analyze", "completed"); //Moved from fetchJobMutation.onSuccess
      toast({
        title: "Success",
        description: "Resume optimization completed",
        duration: 2000,
      });
      setIsProcessing(false);
    },
    onError: (error) => {
      console.error("Resume optimization error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to optimize resume. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
      updateStepStatus("analyze", "error");
    },
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!jobUrl && !jobDescription) {
        toast({
          title: "Error",
          description: "Please enter either a job URL or description",
          variant: "destructive",
        });
        return;
      }

      if (jobDescription && jobDescription.length < 50) {
        toast({
          title: "Warning",
          description: "Job description seems too short for effective analysis",
          variant: "warning",
        });
        return;
      }

      if (jobUrl && !jobUrl.startsWith("http")) {
        toast({
          title: "Error",
          description: "Please enter a valid URL starting with http:// or https://",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);
      setProgressSteps(INITIAL_STEPS);
      updateStepStatus("extract", "loading");

      fetchJobMutation.mutate(
        activeTab === "url" ? { jobUrl } : { jobDescription: jobDescription.trim() }
      );
    } catch (error) {
      console.error("Error during form submission:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred during submission. Please try again later.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Enter Job Details</h3>
        <p className="text-sm text-muted-foreground">
          Provide your job post URL or manually paste text in the manual input box.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "url" | "manual")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="url" disabled={isProcessing || !!jobDescription}>
              Job URL
            </TabsTrigger>
            <TabsTrigger value="manual" disabled={isProcessing || !!jobUrl}>
              Manual Input
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url" className="space-y-4">
            <div className="flex flex-col space-y-2">
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-[11px]">
                  Only LinkedIn job URLs are supported (e.g. https://linkedin.com/jobs/view/123456). Many job sites use bot protection - for those, please copy-paste all job details in the manual input tab.
                </AlertDescription>
              </Alert>
              <Input
                type="url"
                placeholder="Paste LinkedIn job posting URL here..."
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className="w-full"
                disabled={isProcessing}
              />
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
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={(!jobUrl && !jobDescription.trim()) || isProcessing}
            className="w-full md:w-auto"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              "Analyze Job"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isProcessing}
            className="w-full md:w-auto"
          >
            Reset
          </Button>
        </div>
      </form>

      {extractedDetails && !isProcessing && (
        <div className="space-y-6">
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
            {extractedDetails.title && (
              <div>
                <p className="font-medium mb-1">Title</p>
                <p className="text-sm text-muted-foreground">{extractedDetails.title}</p>
              </div>
            )}

            {extractedDetails.positionLevel && (
              <div>
                <p className="font-medium mb-1">Position Level</p>
                <p className="text-sm text-muted-foreground">{extractedDetails.positionLevel}</p>
              </div>
            )}

            {extractedDetails.company && (
              <div>
                <p className="font-medium mb-1">Company</p>
                <p className="text-sm text-muted-foreground">{extractedDetails.company}</p>
              </div>
            )}

            {extractedDetails.location && (
              <div>
                <p className="font-medium mb-1">Location</p>
                <p className="text-sm text-muted-foreground">
                  {extractedDetails.location}
                  {extractedDetails.workplaceType && (
                    <Badge variant="outline" className="ml-2">
                      {extractedDetails.workplaceType}
                    </Badge>
                  )}
                </p>
              </div>
            )}

            {extractedDetails.salary && (
              <div>
                <p className="font-medium mb-1">Salary</p>
                <p className="text-sm text-muted-foreground">{extractedDetails.salary}</p>
              </div>
            )}
          </div>

          {extractedDetails.skillsAndTools && extractedDetails.skillsAndTools.length > 0 && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
              <h4 className="font-semibold mb-2">Required Skills & Tools</h4>
              <div className="flex flex-wrap gap-2">
                {extractedDetails.skillsAndTools.map((skill, index) => (
                  <Badge key={index} variant="default">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Button onClick={()=> {
            setIsProcessing(true);
            updateStepStatus("analyze", "loading");
            optimizeResumeMutation.mutate(extractedDetails);
          }} disabled={!extractedDetails || isProcessing}>Optimize Resume</Button>
        </div>
      )}


      <LoadingDialog
        open={isProcessing}
        title="Analyzing Job Details"
        description="Please wait while we analyze the job posting..."
        steps={progressSteps}
        onOpenChange={(open) => {
          if (!open && isProcessing) {
            handleCancel();
          }
        }}
      />
    </div>
  );
}