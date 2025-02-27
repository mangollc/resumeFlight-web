import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: resumes = [], isLoading, isError, error } = useQuery({
    queryKey: ["/api/uploaded-resumes"],
    queryFn: async () => {
      const response = await fetch("/api/uploaded-resumes", {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch resumes');
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format');
      }

      return response.json();
    },
    retry: 1
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      console.log(`Deleting uploaded resume with ID: ${id}`);
      
      // Explicitly log the exact API endpoint being called
      const apiEndpoint = `/api/resumes/uploaded/${id}`;
      console.log(`Calling DELETE endpoint: ${apiEndpoint}`);
      
      const response = await fetch(apiEndpoint, {
        method: "DELETE",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log(`Delete response status: ${response.status}`);
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          console.error("Delete error response:", errorData);
          throw new Error(errorData.message || errorData.error || 'Failed to delete resume');
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          throw new Error(`Server returned ${response.status}: Failed to delete resume`);
        }
      }
      
      // Handle successful response
      try {
        const contentType = response.headers.get('content-type');
        console.log(`Response content type: ${contentType}`);
        
        if (contentType && contentType.includes('application/json')) {
          const jsonData = await response.json();
          console.log("Delete success response:", jsonData);
          return jsonData;
        }
        
        // If not JSON or empty response, log and return success object
        console.log("Non-JSON response received on deletion, assuming success");
        return { success: true, message: "Resume deleted successfully" };
      } catch (error) {
        console.log("Error parsing success response:", error);
        // Even if we can't parse the response, we'll consider it a success
        // since the HTTP status was in the 200 range
        return { success: true, message: "Resume deleted" };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/uploaded-resumes"] });
      toast({
        title: "Success",
        description: "Resume deleted successfully",
        duration: 2000,
      });
    },
    onError: (error: any) => {
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
        <div className="max-w-5xl mx-auto">
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
        <div className="max-w-5xl mx-auto">
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
      <div className="max-w-5xl mx-auto space-y-6">
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