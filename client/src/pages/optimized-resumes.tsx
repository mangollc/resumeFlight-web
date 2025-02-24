import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume, ResumeMatchScore } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Download,
  FileText,
  Trash2,
  MoreVertical,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface ResumeWithScore extends OptimizedResume {
  matchScore?: ResumeMatchScore;
  versionMetrics?: any[];
  analysis?: any; // Add analysis property
}

const getMetricsColor = (value: number, type: "bg" | "text" = "bg") => {
  if (type === "bg") {
    if (value >= 80) return "bg-emerald-600 dark:bg-emerald-500";
    if (value >= 60) return "bg-yellow-500";
    return "bg-red-500";
  } else {
    if (value >= 80) return "text-emerald-600 dark:text-emerald-500";
    if (value >= 60) return "text-yellow-500";
    return "text-red-500";
  }
};

const formatScore = (value: number): string => {
  return value?.toFixed(1) || "0";
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).format(new Date(dateString));
};

const getScoreMethodologyTooltip = (scoreType: string) => {
  switch (scoreType) {
    case "overall":
      return "Overall score is calculated as a weighted average of keywords (30%), skills (40%), and experience (30%) matches with the job requirements.";
    case "keywords":
      return "Keyword score measures how well your resume's terminology matches the job posting's key terms and industry language.";
    case "skills":
      return "Skills score evaluates the alignment between your technical/professional capabilities and the job's required qualifications.";
    case "experience":
      return "Experience score assesses how well your work history and achievements match the job's required level and type of experience.";
    case "education":
      return "Education score assesses the relevance of your education to the job requirements.";
    case "personalization":
      return "Personalization score measures how well your resume is tailored to the specific job description.";
    case "aiReadiness":
      return "AI Readiness score evaluates how well your resume is optimized for Applicant Tracking Systems (ATS) and AI-powered recruitment tools.";
    default:
      return "";
  }
};

const ScoreTooltip = ({
  type,
  children,
}: {
  type: string;
  children: React.ReactNode;
}) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          {children}
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="max-w-xs text-sm">{getScoreMethodologyTooltip(type)}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

function ResumeRow({ resume }: { resume: ResumeWithScore }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Added state for analysis
  const { toast } = useToast();

  const getScoresDisplay = (scores: any) => {
    if (!scores) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ScoreTooltip type="overall">
            <span className="text-sm text-muted-foreground">Match Score:</span>
          </ScoreTooltip>
          <div className="flex items-center gap-2">
            <span className={getMetricsColor(scores.overall, "text")}>
              {formatScore(scores.overall)}%
            </span>
            <span className="text-muted-foreground text-sm">
              (Confidence: {formatScore(scores.confidence)}%)
            </span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {["keywords", "skills", "experience", "education", "personalization", "aiReadiness"].map((metric) => (
            <div key={metric} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground capitalize">
                <span>{metric}</span>
                <span>{formatScore(scores[metric])}%</span>
              </div>
              <Progress
                value={scores[metric] || 0}
                className={`h-1 ${getMetricsColor(scores[metric] || 0)}`}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/optimized-resume/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      toast({
        title: "Success",
        description: "Resume and its cover letter deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadDocument = async (
    type: "resume" | "cover-letter",
    format: "pdf" | "docx",
  ) => {
    try {
      const endpoint =
        type === "resume"
          ? `/api/optimized-resume/${resume.id}/download`
          : `/api/cover-letter/${resume.id}/download`;

      const response = await fetch(`${endpoint}?format=${format}`);
      if (!response.ok) throw new Error(`Failed to download ${type}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type === "resume" ? "resume" : "cover_letter"}_v${resume.metadata.version}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${type === "resume" ? "Resume" : "Cover Letter"} downloaded successfully as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: `Failed to download ${type}`,
        variant: "destructive",
      });
    }
  };

  const analyzeResume = async () => {
    try {
      setIsAnalyzing(true);
      const response = await fetch(`/api/optimized-resume/${(resume as OptimizedResume).id}/analyze`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to analyze resume');
      const data = await response.json();

      const updatedResume = {
        ...resume,
        analysis: data.analysis,
      };
      queryClient.setQueryData(["/api/optimized-resumes"], (oldData: any) => {
        return oldData.map((r: any) =>
          r.id === updatedResume.id ? updatedResume : r
        );
      });
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] }); //added to refresh the data
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Error",
        description: "Failed to analyze resume",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <TableRow
        className={`group transition-colors ${isExpanded ? "bg-muted/50" : "hover:bg-muted/30"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-4">
          {/* Button removed */}
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="text-sm">{new Date(resume.metadata.optimizedAt).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{new Date(resume.metadata.optimizedAt).toLocaleTimeString()}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="text-sm">ID: {resume.id}</div>
            <div className="text-xs text-muted-foreground">v{resume.metadata.version}</div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {resume.jobDetails?.title || "N/A"}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {resume.jobDetails?.company || "N/A"}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="flex items-center gap-2">
            <span className={getMetricsColor(resume.metrics.after.overall || 0, "text")}>
              {formatScore(resume.metrics.after.overall || 0)}%
            </span>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <span className="text-muted-foreground">
            {formatScore(resume.metrics.after.overall || 0)}%
          </span>
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download Resume</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument("resume", "pdf")}>
                <Download className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("resume", "docx")}>
                <Download className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Download Cover Letter</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "pdf")}>
                <Download className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "docx")}>
                <Download className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>

              {resume.jobUrl && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href={resume.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Job Posting
                    </a>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Optimized Resume</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the optimized resume and its
                      corresponding cover letter. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(resume.id);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 border-t border-muted">
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="font-medium">Original Scores</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ScoreTooltip type="overall">
                        <span className="text-sm text-muted-foreground">Match Score:</span>
                      </ScoreTooltip>
                      <div className="flex items-center gap-2">
                        <span className={getMetricsColor(resume.matchScore?.originalScores.overall || 0, "text")}>
                          {formatScore(resume.matchScore?.originalScores.overall || 0)}%
                        </span>
                        <span className="text-muted-foreground text-sm">
                          (Confidence: {formatScore(resume.matchScore?.originalScores.confidence || 0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {["keywords", "skills", "experience", "education", "personalization", "aiReadiness"].map((metric) => (
                        <div key={metric} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <span className="capitalize">{metric}</span>
                                  <HelpCircle className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-sm">{getScoreMethodologyTooltip(metric)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <span>
                              {formatScore(resume.matchScore?.originalScores[metric] || 0)}%
                            </span>
                          </div>
                          <Progress
                            value={resume.matchScore?.originalScores[metric] || 0}
                            className={`h-1 ${getMetricsColor(resume.matchScore?.originalScores[metric] || 0)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                    <h4 className="font-medium">Optimized Scores</h4>
                    <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <ScoreTooltip type="overall">
                        <span className="text-sm text-muted-foreground">Match Score:</span>
                      </ScoreTooltip>
                      <div className="flex items-center gap-2">
                        <span className={getMetricsColor(resume.matchScore?.optimizedScores.overall || 0, "text")}>
                          {formatScore(resume.matchScore?.optimizedScores.overall || 0)}%
                        </span>
                        <span className="text-muted-foreground text-sm">
                          (Confidence: {formatScore(resume.matchScore?.optimizedScores.confidence || 0)}%)
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {["keywords", "skills", "experience", "education", "personalization", "aiReadiness"].map((metric) => (
                        <div key={metric} className="space-y-1">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger className="flex items-center gap-1">
                                  <span className="capitalize">{metric}</span>
                                  <HelpCircle className="h-3 w-3" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-sm">{getScoreMethodologyTooltip(metric)}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {formatScore(resume.matchScore?.originalScores[metric] || 0)}%
                              </span>
                              <span>→</span>
                              <span className="font-medium text-emerald-600">
                                {formatScore(resume.matchScore?.optimizedScores[metric] || 0)}%
                              </span>
                            </div>
                          </div>
                          <Progress
                            value={resume.matchScore?.optimizedScores[metric] || 0}
                            className={`h-1 ${getMetricsColor(resume.matchScore?.optimizedScores[metric] || 0)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 mt-8">
                <h3 className="text-lg font-medium">Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {resume.matchScore?.analysis && (
                    <>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Matches</h4>
                        <ul className="space-y-2">
                          {resume.matchScore?.analysis?.matches?.map((match, idx) => (
                            <li key={idx} className="text-sm text-blue-600 dark:text-blue-400 flex gap-2">
                              <span>•</span>
                              <span>{match}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Improvements</h4>
                        <ul className="space-y-2">
                          {resume.matchScore?.analysis?.improvements?.map((improvement, idx) => (
                            <li key={idx} className="text-sm text-amber-600 dark:text-amber-400 flex gap-2">
                              <span>•</span>
                              <span>{improvement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Gaps</h4>
                        <ul className="space-y-2">
                          {resume.matchScore?.analysis?.gaps?.map((gap, idx) => (
                            <li key={idx} className="text-sm text-red-600 dark:text-red-400 flex gap-2">
                              <span>•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm">Suggestions</h4>
                        <ul className="space-y-2">
                          {resume.matchScore?.analysis?.suggestions?.map((suggestion, idx) => (
                            <li key={idx} className="text-sm text-blue-600 dark:text-blue-400 flex gap-2">
                              <span>•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            </TableCell>
          </TableRow>
        )}
      </>
  );
}

export default function OptimizedResumesPage() {
  const { data: resumes, isLoading } = useQuery<ResumeWithScore[]>({
    queryKey: ["/api/optimized-resumes"],
    select: (data) => {
      return [...data].sort((a, b) => {
        return (
          new Date(b.metadata.optimizedAt).getTime() -
          new Date(a.metadata.optimizedAt).getTime()
        );
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex-1 h-full">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Optimized Resumes
          </h1>
        </div>

        {resumes && resumes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-4"></TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Date
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Resume ID
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Job Position
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Company Name
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-28">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Match Score
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-28">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Confidence Score
                    </span>
                  </TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumes.map((resume) => (
                  <ResumeRow key={resume.id} resume={resume} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-b from-background to-muted/20 rounded-lg border-2 border-dashed">
            <FileText className="mx-auto h-16 w-16 text-primary/60 animate-heartbeat" />
            <h3 className="mt-6 text-xl font-semibold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent animate-typing">
              Ready to Enhance Your Resume?
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto opacity-0 animate-[fadeIn_1s_ease-in_forwards_0.5s]">
              Transform your resume with AI-powered optimization to stand out from the crowd
            </p>
          </div>
        )}
      </div>
    </div>
  );
}