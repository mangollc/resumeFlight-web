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
  description?: string;
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
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);

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
    setExtractedDetails(null);
    setActiveTab("url");
    handleCancel();
  };

  const getSkillBadgeVariant = (skill: string) => {
    const skillTypes = {
      technical: ["javascript", "python", "java", "typescript", "html", "css"],
      framework: ["react", "node", "vue", "angular", "express"],
      database: ["sql", "mongodb", "postgresql", "mysql"],
      cloud: ["aws", "azure", "gcp", "docker"],
      tools: ["git", "github", "jira", "webpack"],
      soft: ["communication", "leadership", "teamwork"]
    };

    const lowerSkill = skill.toLowerCase();

    if (skillTypes.technical.some(s => lowerSkill.includes(s))) return "default";
    if (skillTypes.framework.some(s => lowerSkill.includes(s))) return "secondary";
    if (skillTypes.database.some(s => lowerSkill.includes(s))) return "destructive";
    if (skillTypes.cloud.some(s => lowerSkill.includes(s))) return "outline";
    if (skillTypes.tools.some(s => lowerSkill.includes(s))) return "ghost";
    if (skillTypes.soft.some(s => lowerSkill.includes(s))) return "default";
    return "default";
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

        // Validate LinkedIn URL if provided
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
            console.error('EventSource error:', error);
            evtSource.close();
            if (error instanceof Error) {
              reject(error);
            } else {
              reject(new Error("Failed to establish SSE connection with server"));
            }
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
          description: data.jobDetails.description,
          positionLevel: data.jobDetails.positionLevel,
          keyRequirements: Array.isArray(data.jobDetails.keyRequirements) ? data.jobDetails.keyRequirements : [],
          skillsAndTools: Array.isArray(data.jobDetails.skillsAndTools) ? data.jobDetails.skillsAndTools : []
        };

        setExtractedDetails(details);
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
                onChange={handleUrlChange}
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
                Processing...
              </>
            ) : (
              "Fetch Job Info"
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
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 space-y-6">
          <div className="grid gap-4">
            {Object.entries(extractedDetails)
              .filter(([key]) => !Array.isArray(extractedDetails[key as keyof JobDetails]) && key !== 'description' && key !== 'roleDetails')
              .map(([key, value]) => value && (
                <div key={key}>
                  <p className="font-medium mb-1">{key.charAt(0).toUpperCase() + key.slice(1)}</p>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
              ))}
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
                  <Badge key={index} variant={getSkillBadgeVariant(skill)}>
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
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