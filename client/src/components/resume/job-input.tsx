import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { type ProgressStep } from "@/components/ui/progress-steps";

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
  onOptimized: (resume: OptimizedResume, details: JobDetails) => void;
  initialJobDetails?: JobDetails;
}

const INITIAL_STEPS: ProgressStep[] = [
  { id: "extract", label: "Extracting job details", status: "pending" },
  { id: "analyze", label: "Analyzing requirements", status: "pending" },
  { id: "optimize", label: "Optimizing resume", status: "pending" },
];

export default function JobInput({ resumeId, onOptimized, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState(initialJobDetails?.url || "");
  const [jobDescription, setJobDescription] = useState(initialJobDetails?.description || "");
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const updateStepStatus = (stepId: string, status: ProgressStep["status"]) => {
    setProgressSteps((steps) =>
      steps.map((step) => (step.id === stepId ? { ...step, status } : step))
    );
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setProgressSteps((steps) =>
      steps.map((step) =>
        step.status === "loading" || step.status === "pending"
          ? { ...step, status: "cancelled" }
          : step
      )
    );
    setIsProcessing(false);
    fetchJobMutation.reset();
  };

  const handleReset = () => {
    setJobUrl("");
    setJobDescription("");
    setActiveTab("url");
    handleCancel();
    setProgressSteps(INITIAL_STEPS);
  };

  const fetchJobMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      try {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setProgressSteps(INITIAL_STEPS);
        updateStepStatus("extract", "loading");

        const response = await apiRequest(
          "POST",
          `/api/resume/${resumeId}/optimize`,
          data,
          { signal: abortControllerRef.current.signal }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch job details");
        }

        updateStepStatus("extract", "completed");
        updateStepStatus("analyze", "loading");

        const jsonData = await response.json();

        if (abortControllerRef.current.signal.aborted) {
          throw new Error("cancelled");
        }

        updateStepStatus("analyze", "completed");
        updateStepStatus("optimize", "loading");

        return jsonData;
      } catch (error) {
        if (
          error instanceof Error &&
          (error.name === "AbortError" ||
            error.message === "cancelled" ||
            error.message === "Request aborted by client")
        ) {
          throw new Error("cancelled");
        }
        throw error;
      }
    },
    onSuccess: (data: OptimizedResume) => {
      if (!abortControllerRef.current?.signal.aborted) {
        updateStepStatus("optimize", "completed");

        const details: JobDetails = {
          url: jobUrl || undefined,
          description: jobDescription || undefined,
          title: data.jobDetails.title,
          company: data.jobDetails.company,
          location: data.jobDetails.location,
          salary: data.jobDetails.salary,
          positionLevel: data.jobDetails.positionLevel,
          keyRequirements: data.jobDetails.keyRequirements,
          skillsAndTools: data.jobDetails.skillsAndTools,
        };

        queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });

        toast({
          title: "Success",
          description: "Job details fetched successfully",
        });

        setIsProcessing(false);
        onOptimized(data, details);
      }
    },
    onError: (error: Error) => {
      if (
        error.message !== "cancelled" &&
        error.message !== "Request aborted by client"
      ) {
        if (error.message.includes("dynamically loaded or require authentication")) {
          toast({
            title: "LinkedIn Job Detection",
            description:
              "LinkedIn jobs require authentication. Please paste the description manually.",
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
      }
    },
    onSettled: () => {
      if (!fetchJobMutation.isSuccess || abortControllerRef.current?.signal.aborted) {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
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

  const getSkillBadgeVariant = (
    skill: string
  ): "default" | "secondary" | "destructive" | "outline" => {
    const skillTypes = {
      technical: [
        "javascript",
        "python",
        "java",
        "c++",
        "typescript",
        "react",
        "node",
        "html",
        "css",
        "api",
        "rest",
        "graphql",
        "frontend",
        "backend",
        "fullstack",
      ],
      database: [
        "sql",
        "nosql",
        "mongodb",
        "postgresql",
        "mysql",
        "oracle",
        "redis",
        "elasticsearch",
        "dynamodb",
        "database",
      ],
      cloud: [
        "aws",
        "azure",
        "gcp",
        "cloud",
        "serverless",
        "lambda",
        "s3",
        "ec2",
        "heroku",
        "docker",
        "kubernetes",
        "ci/cd",
      ],
      testing: ["jest", "mocha", "cypress", "selenium", "junit", "pytest", "testing", "qa"],
      tools: ["git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack", "teams"],
    };

    const lowerSkill = skill.toLowerCase();

    if (skillTypes.technical.some((s) => lowerSkill.includes(s))) {
      return "default";
    }
    if (skillTypes.database.some((s) => lowerSkill.includes(s))) {
      return "destructive";
    }
    if (skillTypes.cloud.some((s) => lowerSkill.includes(s))) {
      return "outline";
    }
    if (skillTypes.testing.some((s) => lowerSkill.includes(s))) {
      return "secondary";
    }
    if (skillTypes.tools.some((s) => lowerSkill.includes(s))) {
      return "outline";
    }
    return "default";
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Enter Job Details</h3>
        <p className="text-sm text-muted-foreground">
          Provide your job post URL or manually paste text in the manual input box
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "url" | "manual")}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger
              value="url"
              disabled={isProcessing || !!jobDescription}
              className={cn(
                activeTab === "url" && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Job URL
            </TabsTrigger>
            <TabsTrigger
              value="manual"
              disabled={isProcessing || !!jobUrl}
              className={cn(
                activeTab === "manual" && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Manual Input
            </TabsTrigger>
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
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Enter the URL of the job posting for best results
                </p>
                <p className="text-xs text-muted-foreground italic">
                  Example: https://www.linkedin.com/jobs/view/4120138359/
                </p>
              </div>
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
            <RotateCcw className="mr-2 h-4 w-4" />
            Restart
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