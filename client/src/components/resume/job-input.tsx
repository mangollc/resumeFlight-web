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
  salary?: string;
  location: string;
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
  const [jobUrl, setJobUrl] = useState(initialJobDetails?.description || "");
  const [jobDescription, setJobDescription] = useState(initialJobDetails?.description || "");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(INITIAL_STEPS);
  const [optimizationVersion, setOptimizationVersion] = useState(1.0); 

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
    setExtractedDetails(null);
    setActiveTab("url");
    handleCancel();
    setProgressSteps(INITIAL_STEPS);
  };

  const getSkillBadgeVariant = (
    skill: string
  ): "language" | "framework" | "database" | "cloud" | "tool" | "soft" => {
    const skillTypes = {
      technical: [
        "javascript", "python", "java", "c++", "typescript", "html", "css",
        "api", "rest", "graphql", "frontend", "backend", "fullstack"
      ],
      framework: [
        "react", "node", "vue", "angular", "svelte", "next", "express",
        "django", "flask"
      ],
      database: [
        "sql", "nosql", "mongodb", "postgresql", "mysql", "oracle", "redis",
        "elasticsearch", "dynamodb", "database", "cassandra", "sqlite"
      ],
      cloud: [
        "aws", "azure", "gcp", "cloud", "serverless", "lambda", "s3", "ec2",
        "heroku", "docker", "kubernetes", "cicd", "devops", "terraform"
      ],
      tools: [
        "git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack",
        "teams", "vscode", "intellij", "webpack", "babel", "npm", "yarn"
      ],
      soft: [
        "communication", "leadership", "teamwork", "agile", "scrum", "kanban",
        "management", "analytical", "problem-solving"
      ]
    };

    const lowerSkill = skill.toLowerCase();

    if (skillTypes.technical.some((s) => lowerSkill.includes(s))) {
      return "language";
    }
    if (skillTypes.framework.some((s) => lowerSkill.includes(s))) {
      return "framework";
    }
    if (skillTypes.database.some((s) => lowerSkill.includes(s))) {
      return "database";
    }
    if (skillTypes.cloud.some((s) => lowerSkill.includes(s))) {
      return "cloud";
    }
    if (skillTypes.tools.some((s) => lowerSkill.includes(s))) {
      return "tool";
    }
    if (skillTypes.soft.some((s) => lowerSkill.includes(s))) {
      return "soft";
    }
    return "language";
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
        description: `${unsupportedSite} job postings cannot be automatically fetched due to their security measures. Please switch to manual input and paste the job description.`,
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
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setProgressSteps(INITIAL_STEPS);
        updateStepStatus("extract", "loading");

        const response = await apiRequest(
          "POST",
          `/api/resume/${resumeId}/optimize`,
          {
            ...data,
            version: optimizationVersion 
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to fetch job details");
        }

        updateStepStatus("extract", "completed");
        updateStepStatus("analyze", "loading");

        const jsonData = await response.json();

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
          title: data.jobDetails.title,
          company: data.jobDetails.company,
          location: data.jobDetails.location,
          salary: data.jobDetails.salary,
          positionLevel: data.jobDetails.positionLevel,
          keyRequirements: data.jobDetails.keyRequirements,
          skillsAndTools: data.jobDetails.skillsAndTools,
        };

        setExtractedDetails(details);
        setOptimizationVersion(prev => Number((prev + 0.1).toFixed(1))); 
        queryClient.invalidateQueries({ queryKey: ['/api/optimized-resumes'] });

        toast({
          title: "Success",
          description: "Job details fetched successfully",
          duration: 2000, 
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">Enter Job Details</h3>
        <p className="text-sm text-muted-foreground">
          Provide your job post URL or manually paste text in the manual input box.  Note: Indeed and ZipRecruiter URLs are not supported due to their security measures. Please use manual input for these job sites.
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
                onChange={handleUrlChange}
                className="w-full"
                disabled={isProcessing}
              />
              <div className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Enter the URL of the job posting for best results
                </p>
                <Alert className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Note: Indeed and ZipRecruiter URLs are not supported due to their security measures.
                    Please use manual input for these job sites.
                  </AlertDescription>
                </Alert>
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
            <span>Restart</span>
          </Button>
        </div>
      </form>

      {extractedDetails && !isProcessing && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 space-y-6">
            <div className="grid gap-4">
              <div>
                <p className="font-medium mb-1">Title</p>
                <p className="text-sm text-muted-foreground">
                  {extractedDetails.title || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Company</p>
                <p className="text-sm text-muted-foreground">
                  {extractedDetails.company || "Not specified"}
                </p>
              </div>
              <div>
                <p className="font-medium mb-1">Location</p>
                <p className="text-sm text-muted-foreground">
                  {extractedDetails.location || "Not specified"}
                </p>
              </div>
              {extractedDetails.salary && (
                <div>
                  <p className="font-medium mb-1">Salary</p>
                  <p className="text-sm text-muted-foreground">{extractedDetails.salary}</p>
                </div>
              )}
              <div>
                <p className="font-medium mb-1">Position Level</p>
                <p className="text-sm text-muted-foreground">
                  {extractedDetails.positionLevel || "Not specified"}
                </p>
              </div>
            </div>

            {extractedDetails.keyRequirements &&
              extractedDetails.keyRequirements.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Key Requirements</h4>
                  <ul className="list-disc list-inside space-y-2">
                    {extractedDetails.keyRequirements.map((requirement, index) => (
                      <li key={index} className="text-muted-foreground">
                        {requirement}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            {extractedDetails.skillsAndTools &&
              extractedDetails.skillsAndTools.length > 0 && (
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