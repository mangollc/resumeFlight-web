import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { FileText, Clock, Calendar, Building, MapPin, Download, ArrowRight, ExternalLink, Eye, Edit, Copy, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { type OptimizedResume } from "@shared/schema";
import { OtherJobsSection } from "@/components/ui/other-jobs-section";
import DownloadOptions from "@/components/resume/DownloadOptions";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Review } from "@/components/review";

export default function OptimizedResumes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});

  // Fetch optimized resumes
  const { data: optimizedResumes = [], isLoading } = useQuery({
    queryKey: ['/api/optimized-resumes'],
    queryFn: async () => {
      const response = await fetch('/api/optimized-resumes');
      if (!response.ok) throw new Error('Failed to fetch optimized resumes');
      return response.json();
    },
    select: (data) => {
      return [...data].sort((a, b) => {
        return (
          new Date(b.metadata.optimizedAt || b.createdAt).getTime() -
          new Date(a.metadata.optimizedAt || a.createdAt).getTime()
        );
      });
    },
  });

  const handleDownload = async (resumeId: string) => {
    try {
      setIsDownloading(prev => ({ ...prev, [resumeId]: true }));

      const response = await fetch(`/api/optimized-resume/${resumeId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from resume object
      const resume = optimizedResumes.find((r: OptimizedResume) => r.id === resumeId);
      a.download = resume?.metadata?.filename || 'resume.pdf';

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Resume downloaded successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(prev => ({ ...prev, [resumeId]: false }));
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (resumeId: string) => {
      const response = await apiRequest("DELETE", `/api/optimized-resume/${resumeId}`);
      if (!response.ok) {
        throw new Error("Failed to delete resume");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete resume",
        variant: "destructive",
      });
    },
  });

  const handleDelete = async (resumeId: string) => {
    try {
      await deleteMutation.mutateAsync(resumeId);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleReview = (resumeId: string) => {
    window.location.href = `/review/${resumeId}`;
  };

  return (
    <div className="flex-1 h-full bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Optimized Resumes
          </h1>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : optimizedResumes.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No optimized resumes yet</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Optimize your first resume to get started
            </p>
            <Button className="mt-6" onClick={() => window.location.href = '/dashboard'}>
              Create Your First Optimized Resume
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {optimizedResumes.map((resume: OptimizedResume) => (
              <Card key={resume.id} className="overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30 pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">{resume.jobDetails?.title || "Untitled Position"}</CardTitle>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-2 h-4 w-4" />
                        {format(new Date(resume.createdAt), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleReview(resume.id)}>
                          <Info className="mr-2 h-4 w-4" />
                          <span>Review</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDownload(resume.id)}>
                          <ArrowUpCircle className="mr-2 h-4 w-4" />
                          <span>Download</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this resume?')) {
                              handleDelete(resume.id);
                            }
                          }}
                          className="text-red-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center mt-2">
                    {resume.jobDetails?.company && (
                      <div className="text-sm text-muted-foreground flex items-center mr-4">
                        <Briefcase className="mr-1 h-4 w-4" />
                        {resume.jobDetails.company}
                      </div>
                    )}
                    {resume.jobDetails?.location && (
                      <div className="text-sm text-muted-foreground flex items-center">
                        <MapPin className="mr-1 h-4 w-4" />
                        {resume.jobDetails.location}
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{resume.metadata?.filename || "resume.pdf"}</span>
                    </div>
                    {resume.metadata?.version && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        v{resume.metadata.version}
                      </span>
                    )}
                  </div>

                  {resume.metrics?.overallScore && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Match Score</span>
                        <span className="text-sm font-semibold">{resume.metrics.overallScore}%</span>
                      </div>
                      <Progress 
                        value={resume.metrics.overallScore} 
                        className="h-2"
                        indicatorClassName={getScoreColor(resume.metrics.overallScore)}
                      />
                    </div>
                  )}

                  <div className="flex justify-end mt-4 space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDownload(resume.id)}
                      disabled={isDownloading[resume.id]}
                    >
                      {isDownloading[resume.id] ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleReview(resume.id)}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}