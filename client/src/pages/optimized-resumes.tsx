import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume, ResumeMatchScore } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, MoreVertical, ExternalLink, ChevronDown, ChevronRight, HelpCircle } from "lucide-react";
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
}

const getMetricsColor = (value: number, type: 'bg' | 'text' = 'bg') => {
  if (type === 'bg') {
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
  return value?.toFixed(1) || '0';
};

const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(new Date(dateString));
};

const getScoreMethodologyTooltip = (scoreType: string) => {
  switch (scoreType) {
    case 'overall':
      return "Overall score is calculated as a weighted average of keywords (30%), skills (40%), and experience (30%) matches with the job requirements.";
    case 'keywords':
      return "Keyword score measures how well your resume's terminology matches the job posting's key terms and industry language.";
    case 'skills':
      return "Skills score evaluates the alignment between your technical/professional capabilities and the job's required qualifications.";
    case 'experience':
      return "Experience score assesses how well your work history and achievements match the job's required level and type of experience.";
    default:
      return "";
  }
};

const ScoreTooltip = ({ type, children }: { type: string; children: React.ReactNode }) => (
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
  const { toast } = useToast();
  const currentVersion = resume.metadata.version;
  const matchScore = resume.metrics?.after?.overall || 0;
  const versionMetric = resume.versionMetrics?.find(v => v.version === currentVersion);
  const confidence = versionMetric?.confidence || 0;

  const getScoresDisplay = (scores: any) => {
    if (!scores) return null;

    return (
      <div className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <ScoreTooltip type="overall">
              <span>Match Score</span>
            </ScoreTooltip>
            <div className="flex items-center gap-2">
              <span className={getMetricsColor(matchScore, 'text')}>
                {formatScore(matchScore)}%
              </span>
              <span className="text-muted-foreground text-sm">
                (Confidence: {formatScore(matchConfidence)}%)
              </span>
            </div>
          </div>
          <Progress
            value={matchScore}
            className={`h-2 ${getMetricsColor(matchScore)}`}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-sm">
            <ScoreTooltip type="keywords">
              <div className="text-muted-foreground mb-1">Keywords</div>
            </ScoreTooltip>
            <Progress
              value={scores.keywords || 0}
              className={`h-1.5 ${getMetricsColor(scores.keywords || 0)}`}
            />
            <div className={`text-xs mt-1 ${getMetricsColor(scores.keywords || 0, 'text')}`}>
              {formatScore(scores.keywords)}%
            </div>
          </div>
          <div className="text-sm">
            <ScoreTooltip type="skills">
              <div className="text-muted-foreground mb-1">Skills</div>
            </ScoreTooltip>
            <Progress
              value={scores.skills || 0}
              className={`h-1.5 ${getMetricsColor(scores.skills || 0)}`}
            />
            <div className={`text-xs mt-1 ${getMetricsColor(scores.skills || 0, 'text')}`}>
              {formatScore(scores.skills)}%
            </div>
          </div>
          <div className="text-sm">
            <ScoreTooltip type="experience">
              <div className="text-muted-foreground mb-1">Experience</div>
            </ScoreTooltip>
            <Progress
              value={scores.experience || 0}
              className={`h-1.5 ${getMetricsColor(scores.experience || 0)}`}
            />
            <div className={`text-xs mt-1 ${getMetricsColor(scores.experience || 0, 'text')}`}>
              {formatScore(scores.experience)}%
            </div>
          </div>
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

  const downloadDocument = async (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx') => {
    try {
      const endpoint = type === 'resume'
        ? `/api/optimized-resume/${resume.id}/download`
        : `/api/cover-letter/${resume.id}/download`;

      const response = await fetch(`${endpoint}?format=${format}`);
      if (!response.ok) throw new Error(`Failed to download ${type}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type === 'resume' ? 'resume' : 'cover_letter'}_v${resume.metadata.version}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${type === 'resume' ? 'Resume' : 'Cover Letter'} downloaded successfully as ${format.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Download error:', error);
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
        className={`group cursor-pointer hover:bg-muted/60 ${isExpanded ? 'bg-muted/5' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span>{formatDate(resume.metadata.optimizedAt)}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="w-fit">
              ID: {resume.id}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className="w-fit">v{resume.metadata.version}</Badge>
        </TableCell>
        <TableCell className="hidden lg:table-cell w-[300px]">
          {getScoresDisplay(resume.metrics.after)}
        </TableCell>
        <TableCell className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuLabel className="text-xs text-muted-foreground mt-2">Download Resume</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument('resume', 'pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument('resume', 'docx')}>
                <Download className="mr-2 h-4 w-4" />
                Download as DOCX
              </DropdownMenuItem>

              <DropdownMenuLabel className="text-xs text-muted-foreground mt-2">Download Cover Letter</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument('cover-letter', 'pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Download as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument('cover-letter', 'docx')}>
                <Download className="mr-2 h-4 w-4" />
                Download as DOCX
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
                      This will permanently delete the optimized resume and its corresponding cover letter.
                      This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
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
          <TableCell colSpan={6} className="bg-muted/5 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Original Scores</h4>
                  {getScoresDisplay(resume.metrics.before)}
                </div>
                <div>
                  <h4 className="font-medium mb-4">Optimized Scores</h4>
                  {getScoresDisplay(resume.metrics.after)}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Analysis</h3>
                <div className="space-y-4">
                  {resume.analysis && resume.analysis.strengths && resume.analysis.strengths.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Strengths</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {resume.analysis.strengths.map((strength: string, idx: number) => (
                          <li key={idx} className="text-sm text-emerald-600 dark:text-emerald-400">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resume.analysis && resume.analysis.gaps && resume.analysis.gaps.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Areas for Improvement</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {resume.analysis.gaps.map((gap: string, idx: number) => (
                          <li key={idx} className="text-sm text-red-600 dark:text-red-400">
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {resume.analysis && resume.analysis.suggestions && resume.analysis.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Suggestions</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {resume.analysis.suggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="text-sm text-blue-600 dark:text-blue-400">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
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
        return new Date(b.metadata.optimizedAt).getTime() - new Date(a.metadata.optimizedAt).getTime();
      });
    }
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
    <div className="flex-1 h-full">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Optimized Resumes</h1>
        </div>

        {resumes && resumes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-4"></TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Resume ID</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="hidden lg:table-cell">Match Score</TableHead>
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
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No optimized resumes yet</h3>
            <p className="text-muted-foreground">
              Upload and optimize a resume to see it here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}