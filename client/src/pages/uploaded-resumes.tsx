import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { UploadedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FileText, Trash2, MoreVertical } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UploadedResumesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: resumes, isLoading, isError, error } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
    retry: 2,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/uploaded-resume/${id}`);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["/api/uploaded-resumes"] });
      const previousResumes = queryClient.getQueryData<UploadedResume[]>(["/api/uploaded-resumes"]);
      queryClient.setQueryData<UploadedResume[]>(["/api/uploaded-resumes"], (old) =>
        old?.filter((resume) => resume.id !== id)
      );
      return { previousResumes };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-resumes"] });
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
    },
    onError: (error: Error, _, context) => {
      if (context?.previousResumes) {
        queryClient.setQueryData(["/api/uploaded-resumes"], context.previousResumes);
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete resume",
        variant: "destructive",
      });
    },
  });

  if (isError) {
    return (
      <div className="flex-1 h-full">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-destructive mb-4">Error loading resumes</div>
            <div className="text-muted-foreground">{(error as Error)?.message || "Please try again later"}</div>
            <Button onClick={() => window.location.reload()} size="sm" className="mt-4">
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 h-full">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold">Uploaded Resumes</h1>
          <div className="flex-1" />
          <Button onClick={() => setLocation("/dashboard")} size="sm">
            Upload New Resume
          </Button>
        </div>

        {resumes && resumes.length > 0 ? (
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-primary/5">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] py-2 pl-4">
                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                      File Name
                    </span>
                  </TableHead>
                  <TableHead className="w-[35%] py-2">
                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                      Upload Date
                    </span>
                  </TableHead>
                  <TableHead className="w-[25%] py-2 pr-2 text-right">
                    <span className="text-xs uppercase tracking-wider font-semibold text-primary">
                      Actions
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumes.map((resume) => (
                  <TableRow key={resume.id} className="hover:bg-muted/50">
                    <TableCell className="py-2 pl-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="font-medium truncate max-w-[200px] sm:max-w-[250px]">
                          {resume.metadata.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="py-2 pr-2 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            disabled={deleteMutation.isPending}
                          >
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => setLocation(`/dashboard?resume=${resume.id}`)}
                            className="flex items-center cursor-pointer"
                            disabled={deleteMutation.isPending}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Optimize
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                className="text-destructive focus:text-destructive cursor-pointer"
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Resume</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this resume? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(resume.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="mt-4">
              <h2 className="text-lg font-semibold">No resumes uploaded</h2>
              <div className="mt-2 text-muted-foreground">
                Get started by uploading your first resume
              </div>
            </div>
            <Button onClick={() => setLocation("/dashboard")} size="sm" className="mt-4">
              Upload Resume
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}