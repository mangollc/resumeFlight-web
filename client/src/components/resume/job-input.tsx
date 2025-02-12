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

interface JobDetails {
  title: string;
  company: string;
  salary?: string;
  location: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
}

interface JobInputProps {
  resumeId: number;
  onOptimized: (resume: OptimizedResume) => void;
}

export default function JobInput({ resumeId, onOptimized }: JobInputProps) {
  const { toast } = useToast();
  const [jobUrl, setJobUrl] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [extractedDetails, setExtractedDetails] = useState<JobDetails | null>(null);
  const [activeTab, setActiveTab] = useState<"url" | "manual">("url");
  const [isProcessing, setIsProcessing] = useState(false);

  const optimizeMutation = useMutation({
    mutationFn: async (data: { jobUrl?: string; jobDescription?: string }) => {
      const res = await apiRequest("POST", `/api/resume/${resumeId}/optimize`, data);
      return res.json();
    },
    onSuccess: (data: OptimizedResume) => {
      setExtractedDetails({
        title: data.jobDetails.title,
        company: data.jobDetails.company,
        location: data.jobDetails.location,
        salary: data.jobDetails.salary,
        positionLevel: data.jobDetails.positionLevel,
        keyRequirements: data.jobDetails.keyRequirements,
        skillsAndTools: data.jobDetails.skillsAndTools
      });
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      onOptimized(data);
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

  const getSkillBadgeColor = (skill: string) => {
    // Categorize skills and return appropriate color classes
    const skillTypes = {
      programming: ["javascript", "python", "java", "c++", "typescript", "react", "node"],
      software: ["photoshop", "figma", "sketch", "adobe", "office", "excel"],
      database: ["sql", "mongodb", "postgresql", "mysql", "oracle"],
      tools: ["git", "docker", "kubernetes", "aws", "azure", "jira"]
    };

    const lowerSkill = skill.toLowerCase();
    if (skillTypes.programming.some(s => lowerSkill.includes(s))) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100";
    }
    if (skillTypes.software.some(s => lowerSkill.includes(s))) {
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100";
    }
    if (skillTypes.database.some(s => lowerSkill.includes(s))) {
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100";
    }
    if (skillTypes.tools.some(s => lowerSkill.includes(s))) {
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100";
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
              {extractedDetails.keyRequirements && (
                <TableRow>
                  <TableCell className="font-medium">Key Requirements</TableCell>
                  <TableCell>
                    <ul className="list-disc list-inside space-y-1">
                      {extractedDetails.keyRequirements.map((requirement, index) => (
                        <li key={index}>{requirement}</li>
                      ))}
                    </ul>
                  </TableCell>
                </TableRow>
              )}
              {extractedDetails.skillsAndTools && (
                <TableRow>
                  <TableCell className="font-medium">Skills & Tools</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {extractedDetails.skillsAndTools.map((skill, index) => (
                        <span
                          key={index}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSkillBadgeColor(skill)} border border-current/20`}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </TableCell>
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