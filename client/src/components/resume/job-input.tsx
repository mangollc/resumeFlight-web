import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OptimizedResume } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LoadingDialog } from "@/components/ui/loading-dialog";

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

export default function JobInput({ resumeId, onOptimized, initialJobDetails }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState(initialJobDetails?.url || "");
  const [jobDescription, setJobDescription] = useState(initialJobDetails?.description || "");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(initialJobDetails || null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const jobDetailsRef = useRef<HTMLDivElement>(null);

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
      setIsCollapsed(false);  // Expand the job details section

      toast({
        title: "Success",
        description: "Job details fetched successfully",
      });

      // Scroll to job details after a short delay to ensure rendering
      setTimeout(() => {
        jobDetailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

      setIsProcessing(false);
      onOptimized(data, details);
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
    const skillTypes = {
      technical: ["javascript", "python", "java", "c++", "typescript", "react", "node", "html", "css", "api", "rest", "graphql", "frontend", "backend", "fullstack"],
      database: ["sql", "nosql", "mongodb", "postgresql", "mysql", "oracle", "redis", "elasticsearch", "dynamodb", "database"],
      cloud: ["aws", "azure", "gcp", "cloud", "serverless", "lambda", "s3", "ec2", "heroku", "docker", "kubernetes", "ci/cd"],
      testing: ["jest", "mocha", "cypress", "selenium", "junit", "pytest", "testing", "qa"],
      tools: ["git", "github", "gitlab", "bitbucket", "jira", "confluence", "slack", "teams"]
    };

    const lowerSkill = skill.toLowerCase();

    if (skillTypes.technical.some(s => lowerSkill.includes(s))) {
      return "default";
    }
    if (skillTypes.database.some(s => lowerSkill.includes(s))) {
      return "destructive";
    }
    if (skillTypes.cloud.some(s => lowerSkill.includes(s))) {
      return "outline";
    }
    if (skillTypes.testing.some(s => lowerSkill.includes(s))) {
      return "secondary";
    }
    if (skillTypes.tools.some(s => lowerSkill.includes(s))) {
      return "outline";
    }
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
        <div ref={jobDetailsRef} className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div
            className="p-4 cursor-pointer flex justify-between items-center"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <h3 className="text-lg font-semibold flex items-center gap-2">
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Job Details
            </h3>
            <Badge variant="outline">
              {extractedDetails.positionLevel || 'Not Specified'}
            </Badge>
          </div>

          <div className={cn("overflow-hidden transition-all", 
            isCollapsed ? "max-h-0" : "max-h-[2000px]")}>
            <div className="p-6 pt-2 space-y-6">
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
            </div>
          </div>
        </div>
      )}

      <LoadingDialog
        open={isProcessing}
        title="Fetching Job Details"
        description="Please wait while we analyze the job posting and optimize your resume..."
      />
    </div>
  );
}