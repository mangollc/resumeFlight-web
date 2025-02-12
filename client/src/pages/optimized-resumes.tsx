import { useQuery, useMutation } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText, Trash2, MoreVertical, ExternalLink, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
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

function MetricsDialog({ resume }: { resume: OptimizedResume }) {
  return (
    <Dialog>
      <DialogTrigger className="contents">
        <TableRow className="cursor-pointer hover:bg-muted/50">
          <TableCell>{resume.id}</TableCell>
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
                <span>Overall</span>
                <div className="flex items-center gap-2">
                  {resume.metrics?.before && (
                    <span className="text-muted-foreground text-xs">
                      {resume.metrics.before.overall}% →
                    </span>
                  )}
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
            <MoreVertical className="h-4 w-4 inline-block" />
          </TableCell>
        </TableRow>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resume Match Analysis</DialogTitle>
          <DialogDescription>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="grid gap-4">
                  {['overall', 'keywords', 'skills', 'experience'].map((metric) => (
                    <div key={metric} className="space-y-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="capitalize">{metric}</span>
                        <div className="flex items-center gap-2">
                          {resume.metrics?.before && (
                            <span className="text-muted-foreground">
                              Before: {resume.metrics.before[metric as keyof typeof resume.metrics.before]}%
                            </span>
                          )}
                          <span className="font-medium">
                            After: {resume.metrics?.after?.[metric as keyof typeof resume.metrics.after] || 0}%
                          </span>
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
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

export default function OptimizedResumesPage() {
  const { toast } = useToast();
  const { data: resumes, isLoading } = useQuery<OptimizedResume[]>({
    queryKey: ["/api/optimized-resumes"],
  });

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
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Position</TableHead>
                <TableHead className="hidden sm:table-cell">Company</TableHead>
                <TableHead className="hidden lg:table-cell">Metrics</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumes.map((resume) => (
                <MetricsDialog key={resume.id} resume={resume} />
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