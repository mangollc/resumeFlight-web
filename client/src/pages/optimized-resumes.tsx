import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, MoreVertical, ExternalLink, Info, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { useLocation } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

function formatJobDetails(resume: OptimizedResume) {
  const getWorkArrangementBadge = (jobDetails: any) => {
    const arrangement = jobDetails?.workArrangement?.toLowerCase();
    if (!arrangement) return null;

    const variants = {
      remote: "outline",
      hybrid: "secondary",
      onsite: "default"
    } as const;

    return (
      <Badge variant={variants[arrangement as keyof typeof variants] || "default"}>
        {arrangement.charAt(0).toUpperCase() + arrangement.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div>
          <p className="font-medium mb-1">Job Title</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {resume.jobDetails?.title || "Not specified"}
            </p>
            {getWorkArrangementBadge(resume.jobDetails)}
          </div>
        </div>
        <div>
          <p className="font-medium mb-1">Company</p>
          <p className="text-sm text-muted-foreground">
            {resume.jobDetails?.company || "Not specified"}
          </p>
        </div>
        <div>
          <p className="font-medium mb-1">Location</p>
          <p className="text-sm text-muted-foreground">
            {resume.jobDetails?.location || "Not specified"}
          </p>
        </div>
        {resume.jobDetails?.keyRequirements && resume.jobDetails.keyRequirements.length > 0 && (
          <div>
            <p className="font-medium mb-1">Key Requirements</p>
            <ul className="list-disc list-inside space-y-1">
              {resume.jobDetails.keyRequirements.map((req, idx) => (
                <li key={idx} className="text-sm text-muted-foreground">{req}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
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

const formatScore = (value: number) => {
  return value?.toFixed(1) || '0';
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

function ResumeRow({ resume }: { resume: OptimizedResume }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

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

  const formatDownloadFilename = (name: string, jobTitle: string, version: string) => {
    const baseName = name.substring(0, name.lastIndexOf('.')) || name;
    const cleanJobTitle = jobTitle
      ?.replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase();

    return `${baseName}_${cleanJobTitle}_v${version}`;
  };

  const getScoreImprovement = (before: number, after: number) => {
    const improvement = after - before;
    if (improvement > 0) {
      return (
        <span className="text-emerald-600 dark:text-emerald-500 text-xs">
          (+{improvement.toFixed(1)}%)
        </span>
      );
    }
    return null;
  };

  return (
    <>
      <TableRow className={`group cursor-pointer hover:bg-muted/60 ${isExpanded ? 'bg-muted/5' : ''}`}>
        <TableCell className="w-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex flex-col">
            <span>{formatDate(resume.metadata.optimizedAt)}</span>
            <Badge variant="outline" className="w-fit mt-1">v{resume.metadata.version}</Badge>
          </div>
        </TableCell>
        <TableCell>
          <div className="font-medium">{resume.jobDetails?.title}</div>
          <div className="text-sm text-muted-foreground">{resume.jobDetails?.company}</div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Match</span>
              <div className="flex items-center gap-1.5">
                <span className={getMetricsColor(resume.metrics?.after?.overall || 0, 'text')}>
                  {formatScore(resume.metrics?.after?.overall)}%
                </span>
                {getScoreImprovement(
                  resume.metrics?.before?.overall || 0,
                  resume.metrics?.after?.overall || 0
                )}
              </div>
            </div>
            <Progress
              value={resume.metrics?.after?.overall || 0}
              className={`h-2 ${getMetricsColor(resume.metrics?.after?.overall || 0)}`}
            />
          </div>
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.preventDefault();
                  navigate(`/resume/${resume.uploadedResumeId}/optimize/review?optimizedId=${resume.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" />
                Review Optimization
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/optimized-resume/${resume.id}/download?filename=${
                    formatDownloadFilename(
                      resume.metadata.filename,
                      resume.jobDetails?.title || '',
                      resume.metadata.version
                    )
                  }.pdf`}
                  download
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume v{resume.metadata.version}
                </a>
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
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate(resume.id)}
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
          <TableCell colSpan={5} className="bg-muted/5 p-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Original Resume Metrics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Original Resume Match</h4>
                  <div className="space-y-3">
                    {['keywords', 'skills', 'experience'].map((metric) => (
                      <div key={`before-${metric}`} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize">{metric}</span>
                          <span className="font-medium">
                            {formatScore(resume.metrics?.before?.[metric as keyof typeof resume.metrics.before] || 0)}%
                          </span>
                        </div>
                        <Progress
                          value={resume.metrics?.before?.[metric as keyof typeof resume.metrics.before] || 0}
                          className={`h-2 ${getMetricsColor(resume.metrics?.before?.[metric as keyof typeof resume.metrics.before] || 0)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optimized Resume Metrics */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm">Optimized Resume Match</h4>
                  <div className="space-y-3">
                    {['keywords', 'skills', 'experience'].map((metric) => (
                      <div key={`after-${metric}`} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize">{metric}</span>
                          <div className="flex items-center gap-1.5">
                            <span className={getMetricsColor(resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0, 'text')}>
                              {formatScore(resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0)}%
                            </span>
                            {getScoreImprovement(
                              resume.metrics?.before?.[metric as keyof typeof resume.metrics.before] || 0,
                              resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0
                            )}
                          </div>
                        </div>
                        <Progress
                          value={resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0}
                          className={`h-2 ${getMetricsColor(resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0)}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Job Details Section */}
              <div>
                <h4 className="font-semibold text-sm mb-4">Job Details</h4>
                {formatJobDetails(resume)}
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
                  <TableHead className="w-[150px]">Date & Version</TableHead>
                  <TableHead>Position & Company</TableHead>
                  <TableHead className="hidden lg:table-cell w-[200px]">Match Score</TableHead>
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