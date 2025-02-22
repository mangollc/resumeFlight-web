import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { type ProgressStep } from "@/components/ui/progress-steps";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
}

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: OptimizedResume, details: JobDetails) => void;
  initialJobDetails?: JobDetails;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "extract", label: "Extracting job details", status: "pending" },
  { id: "analyze", label: "Analyzing requirements", status: "pending" },
  { id: "optimize", label: "Optimizing resume", status: "pending" },
];

const UNSUPPORTED_JOB_SITES = [
  { domain: "indeed.com", name: "Indeed" },
  { domain: "ziprecruiter.com", name: "ZipRecruiter" }
];

export default function JobInput({ resumeId, onOptimized, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const updateStepStatus = (stepId: string, status: ProgressStep["status"]) => {
    setProgressSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const handleCancel = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setProgressSteps(INITIAL_STEPS);
    setIsProcessing(false);
    fetchJobMutation.reset();
  };

  const handleReset = () => {
    setJobUrl("");
    setJobDescription("");
    setActiveTab("url");
    handleCancel();
  };

  const isValidLinkedInUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('linkedin.com') && urlObj.pathname.includes('/jobs/view/');
    } catch {
      return false;
    }
  };

  const checkUnsupportedJobSite = (url: string): string | null => {
    const unsupportedSite = UNSUPPORTED_JOB_SITES.find(site =>
      url.toLowerCase().includes(site.domain)
    );
    return unsupportedSite?.name || null;
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setJobUrl(url);

    const unsupportedSite = checkUnsupportedJobSite(url);
    if (unsupportedSite) {
      toast({
        title: `${unsupportedSite} Detection`,
        description: `${unsupportedSite} job postings cannot be automatically fetched. Please paste the description manually.`,
        variant: "destructive",
        duration: 6000,
      });
      setActiveTab("manual");
      setJobUrl("");
    }
  };

  const fetchJobMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      try {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        if (data.jobUrl && !isValidLinkedInUrl(data.jobUrl)) {
          throw new Error('Please provide a valid LinkedIn job posting URL');
        }

        console.log('Making optimization request...');

        const evtSource = new EventSource(`/api/resume/${resumeId}/optimize?${new URLSearchParams(data)}`);
        eventSourceRef.current = evtSource;

        return new Promise((resolve, reject) => {
          evtSource.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('Received event:', data);

              if (data.status === "started") {
                updateStepStatus("extract", "loading");
              } else if (data.status === "extracting_details") {
                updateStepStatus("extract", "loading");
              } else if (data.status === "analyzing_description") {
                updateStepStatus("extract", "completed");
                updateStepStatus("analyze", "loading");
              } else if (data.status === "optimizing_resume") {
                updateStepStatus("analyze", "completed");
                updateStepStatus("optimize", "loading");
              } else if (data.status === "completed") {
                updateStepStatus("optimize", "completed");
                evtSource.close();
                resolve(data.optimizedResume);
              } else if (data.status === "error") {
                throw new Error("Optimization failed");
              }
            } catch (error) {
              evtSource.close();
              reject(error);
            }
          };

          evtSource.onerror = (error) => {
            evtSource.close();
            reject(new Error("EventSource failed"));
          };
        });
      } catch (error) {
        console.error('Optimization error:', error);
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("An unexpected error occurred");
      }
    },
    onSuccess: (data) => {
      try {
        if (!data.jobDetails) {
          throw new Error('Invalid response format: missing job details');
        }

        const details: JobDetails = {
          title: data.jobDetails.title || "",
          company: data.jobDetails.company || "",
          location: data.jobDetails.location || "",
          salary: data.jobDetails.salary,
          positionLevel: data.jobDetails.positionLevel,
          keyRequirements: Array.isArray(data.jobDetails.keyRequirements) ? data.jobDetails.keyRequirements : [],
          skillsAndTools: Array.isArray(data.jobDetails.skillsAndTools) ? data.jobDetails.skillsAndTools : []
        };

        queryClient.invalidateQueries({ queryKey: ['/api/optimized-resumes'] });

        toast({
          title: "Success",
          description: "Resume optimization completed",
          duration: 2000,
        });

        setIsProcessing(false);
        onOptimized(data, details);
      } catch (error) {
        console.error('Error processing optimization result:', error);
        throw error;
      }
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);

      toast({
        title: "Error",
        description: error.message || "Failed to process job details",
        variant: "destructive",
      });

      setIsProcessing(false);
      setProgressSteps(prev =>
        prev.map(step =>
          step.status === "pending" || step.status === "loading"
            ? { ...step, status: "error" }
            : step
        )
      );
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
    setProgressSteps(INITIAL_STEPS);

    fetchJobMutation.mutate(
      activeTab === "url" ? { jobUrl } : { jobDescription: jobDescription.trim() }
    );
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
              <Input
                type="url"
                placeholder="Paste LinkedIn job posting URL here..."
                value={jobUrl}
                onChange={handleUrlChange}
                className="w-full"
                disabled={isProcessing}
              />
              <Alert className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Note: Only LinkedIn job URLs are supported. For other job sites, please use manual input.
                </AlertDescription>
              </Alert>
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
                Processing...
              </>
            ) : (
              "Start Optimization"
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