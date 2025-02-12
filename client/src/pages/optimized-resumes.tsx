import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, MoreVertical, ExternalLink, Info, ChevronDown, ChevronRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
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
                  href={`/api/optimized-resume/${resume.id}/download`}
                  download
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Resume
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href={`/api/optimized-resume/${resume.id}/cover-letter/download`}
                  download
                  className="flex items-center"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Cover Letter
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold">Optimized Resumes</h1>
      </div>

      {resumes && resumes.length > 0 ? (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader className="bg-primary/5 dark:bg-primary/10">
              <TableRow>
                <TableHead className="w-[30px]"></TableHead>
                <TableHead className="w-[100px] font-bold text-primary">Date</TableHead>
                <TableHead className="font-bold text-primary">Position</TableHead>
                <TableHead className="hidden sm:table-cell font-bold text-primary">Company</TableHead>
                <TableHead className="hidden lg:table-cell font-bold text-primary">Match Score</TableHead>
                <TableHead className="text-right font-bold text-primary">Actions</TableHead>
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
  );
}