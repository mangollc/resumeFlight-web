import { useQuery } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, MoreVertical, ExternalLink, Info, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useState, useMemo } from "react";
import { VersionTimeline } from "@/components/resume/version-timeline";
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
import { Card, CardContent } from "@/components/ui/card";

function formatJobDetails(resume: OptimizedResume) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-2">Job Details</h3>
        <div className="grid gap-4">
          <div>
            <p className="font-medium mb-1">Title</p>
            <p className="text-sm text-muted-foreground">
              {resume.jobDetails?.title || "Not specified"}
            </p>
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
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-2">Description</h3>
        <div className="text-sm text-muted-foreground whitespace-pre-wrap rounded-md bg-muted p-4">
          {resume.jobDescription}
        </div>
      </div>
    </div>
  );
}

const getMetricsColor = (value: number) => {
  if (value >= 80) return "bg-green-600";
  if (value >= 60) return "bg-yellow-500";
  return "bg-red-500";
};


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

  const formatDownloadFilename = (name: string, jobTitle: string, version?: number) => {
    // Extract initials properly
    const nameMatch = name.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
    const initials = nameMatch ? `${nameMatch[1][0]}${nameMatch[2][0]}`.toUpperCase() : 'XX';

    // Clean and format job title
    const cleanJobTitle = jobTitle
      ?.replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .toLowerCase()
      .substring(0, 30); // Limit length

    // Add version if provided
    const versionSuffix = version ? `_v${version.toFixed(1)}` : '';

    return `${initials}_${cleanJobTitle}${versionSuffix}`;
  };

  return (
    <>
      <TableRow
        className={`cursor-pointer hover:bg-muted/60 ${
          isExpanded
            ? 'bg-muted/5 dark:bg-muted/10'
            : 'even:bg-slate-50 dark:even:bg-slate-800/50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          {new Date(resume.createdAt).toLocaleDateString()}
        </TableCell>
        <TableCell>{resume.jobDetails?.title}</TableCell>
        <TableCell className="hidden sm:table-cell">
          {resume.jobDetails?.company}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Match</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {resume.metrics?.after?.overall || 0}%
                </span>
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
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/optimized-resume/${resume.id}/cover-letter/latest/download?filename=${
                    formatDownloadFilename(
                      resume.metadata.filename,
                      resume.jobDetails?.title || '',
                      resume.metadata.version
                    )
                  }_cover.pdf`}
                  download
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Latest Cover Letter
                </a>
              </DropdownMenuItem>
              {resume.jobUrl ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <a
                      href={resume.jobUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Job Posting
                    </a>
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuSeparator />
                  <Dialog>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Info className="mr-2 h-4 w-4" />
                        View Job Details
                      </DropdownMenuItem>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Job Details</DialogTitle>
                        <DialogDescription>
                          {formatJobDetails(resume)}
                        </DialogDescription>
                      </DialogHeader>
                    </DialogContent>
                  </Dialog>
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
          <TableCell colSpan={6} className="bg-muted/5 dark:bg-muted/10">
            <div className="py-4 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Original Resume Match</h4>
                  <div className="space-y-4">
                    {['overall', 'keywords', 'skills', 'experience'].map((metric) => (
                      <div key={`before-${metric}`} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize">{metric}</span>
                          <span className="font-medium">
                            {resume.metrics?.before?.[metric as keyof typeof resume.metrics.before] || 0}%
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
                <div className="space-y-4">
                  <h4 className="font-semibold">Optimized Resume Match</h4>
                  <div className="space-y-4">
                    {['overall', 'keywords', 'skills', 'experience'].map((metric) => (
                      <div key={`after-${metric}`} className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="capitalize">{metric}</span>
                          <span className="font-medium">
                            {resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0}%
                          </span>
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
  });

  const resumeGroups = useMemo(() => {
    if (!resumes) return [];

    const groups = resumes.reduce((acc, resume) => {
      const uploadedResumeId = resume.uploadedResumeId;
      if (!acc[uploadedResumeId]) {
        acc[uploadedResumeId] = [];
      }
      acc[uploadedResumeId].push(resume);
      return acc;
    }, {} as Record<number, OptimizedResume[]>);

    return Object.values(groups).map(group =>
      group.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    );
  }, [resumes]);

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Resume Versions</h1>

      {resumeGroups.length > 0 ? (
        <div className="space-y-6">
          {resumeGroups.map((group, index) => (
            <ResumeVersionGroup key={index} resumes={group} />
          ))}
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
  );
}

function ResumeVersionGroup({ resumes }: { resumes: OptimizedResume[] }) {
  const [selectedVersion, setSelectedVersion] = useState<OptimizedResume>(resumes[0]);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);

  const latestVersion = resumes[0];

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold">{latestVersion.jobDetails?.title}</h2>
            <p className="text-sm text-muted-foreground">{latestVersion.jobDetails?.company}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTimelineOpen(!isTimelineOpen)}
            className="flex items-center gap-2"
          >
            {isTimelineOpen ? (
              <>
                Hide Timeline
                <ChevronDown className="h-4 w-4" />
              </>
            ) : (
              <>
                Show Timeline
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {isTimelineOpen && (
          <div className="pt-4">
            <VersionTimeline
              versions={resumes}
              onVersionSelect={setSelectedVersion}
              selectedVersion={selectedVersion}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}