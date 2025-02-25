import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Trash2,
  MoreVertical,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const getScoreTextColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
};

function MetricRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{label}</span>
        <span className={`text-sm font-medium ${getScoreTextColor(score)}`}>
          {score.toFixed(1)}%
        </span>
      </div>
      <Progress value={score} className={`h-2 ${getScoreColor(score)}`} />
    </div>
  );
}

function ResumeRow({ resume }: { resume: OptimizedResume }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/optimized-resume/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      toast({
        title: "Success",
        description: "Resume deleted successfully",
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
        description: `${type === "resume" ? "Resume" : "Cover Letter"} downloaded successfully`,
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

  return (
    <>
      <TableRow
        className={`group transition-colors ${isExpanded ? "bg-muted/50" : "hover:bg-muted/30"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="text-sm">{new Date(resume.metadata.optimizedAt).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{resume.metadata.version}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="text-sm">{resume.jobDetails?.title || "N/A"}</div>
            <div className="text-xs text-muted-foreground">{resume.jobDetails?.company || "N/A"}</div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-right">
          <div className="flex items-center justify-end gap-2">
            <span className={`text-sm ${getScoreTextColor(resume.metrics.after.overall)}`}>
              {resume.metrics.after.overall.toFixed(1)}%
            </span>
          </div>
        </TableCell>
        <TableCell className="w-8">
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
                <FileText className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("resume", "docx")}>
                <FileText className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Download Cover Letter</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "pdf")}>
                <FileText className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "docx")}>
                <FileText className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>
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
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Resume Metrics</h3>
                  <div className="space-y-4">
                    <MetricRow
                      label="Overall Score"
                      score={resume.metrics.after.overall}
                    />
                    <MetricRow
                      label="Skills"
                      score={resume.metrics.after.skills}
                    />
                    <MetricRow
                      label="Keywords"
                      score={resume.metrics.after.keywords}
                    />
                    <MetricRow
                      label="Education"
                      score={resume.metrics.after.education}
                    />
                    <MetricRow
                      label="Experience"
                      score={resume.metrics.after.experience}
                    />
                    <MetricRow
                      label="AI Readiness"
                      score={resume.metrics.after.aiReadiness}
                    />
                    <MetricRow
                      label="Personalization"
                      score={resume.metrics.after.personalization}
                    />
                    <MetricRow
                      label="Confidence"
                      score={resume.metrics.after.confidence}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Analysis</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Strengths</h4>
                      <ul className="space-y-2">
                        {(resume.metrics.after.strengths || []).map((strength, idx) => (
                          <li
                            key={idx}
                            className="text-sm text-emerald-600 flex gap-2"
                          >
                            <span>•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Improvements</h4>
                      <ul className="space-y-2">
                        {(resume.metrics.after.improvements || []).map(
                          (improvement, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-amber-600 flex gap-2"
                            >
                              <span>•</span>
                              <span>{improvement}</span>
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Gaps</h4>
                      <ul className="space-y-2">
                        {resume.metrics.after.gaps?.map((gap, idx) => (
                          <li key={idx} className="text-sm text-red-600 flex gap-2">
                            <span>•</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                        {(!resume.metrics.after.gaps ||
                          resume.metrics.after.gaps.length === 0) && (
                          <li className="text-sm text-muted-foreground">
                            No gaps identified yet
                          </li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">Suggestions</h4>
                      <ul className="space-y-2">
                        {resume.metrics.after.suggestions?.map(
                          (suggestion, idx) => (
                            <li
                              key={idx}
                              className="text-sm text-blue-600 flex gap-2"
                            >
                              <span>•</span>
                              <span>{suggestion}</span>
                            </li>
                          )
                        )}
                        {(!resume.metrics.after.suggestions ||
                          resume.metrics.after.suggestions.length === 0) && (
                          <li className="text-sm text-muted-foreground">
                            No suggestions available yet
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
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
  const { data: resumes, isLoading } = useQuery<OptimizedResume[]>({
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
              <TableHeader>
                <TableRow>
                  <TableHead className="w-4"></TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Date
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Job Details
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Match Score
                    </span>
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
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