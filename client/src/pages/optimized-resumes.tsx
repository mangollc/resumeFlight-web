import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { OptimizedResume } from "../../shared/schema";


export default function OptimizedResumesPage() {
  const { data: resumes = [], isLoading, error, refetch } = useQuery<OptimizedResume[]>({
    queryKey: ["/api/optimized-resumes"],
    select: (data) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        return [];
      }
      return [...data].sort((a, b) => {
        if (!a.metadata?.optimizedAt || !b.metadata?.optimizedAt) {
          return 0;
        }
        return (
          new Date(b.metadata.optimizedAt).getTime() -
          new Date(a.metadata.optimizedAt).getTime()
        );
      });
    },
  });

  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('');

  // Handle loading and empty states
  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground">Loading optimized resumes...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Error loading resumes</h2>
          <p>{error instanceof Error ? error.message : "Unknown error"}</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!resumes || resumes.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4 p-8 border rounded-lg">
          <h2 className="text-xl font-semibold">No optimized resumes found</h2>
          <p className="text-muted-foreground">
            You haven't optimized any resumes yet. Start by uploading a resume and job description.
          </p>
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleResumeView = (resumeId: number) => {
    window.location.href = `/dashboard?optimizedId=${resumeId}`;
  };

  const handleResumeDownload = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/optimized-resume/${resumeId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from the response headers if possible
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition && contentDisposition.match(/filename="?([^"]*)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `optimized-resume-${resumeId}.docx`;

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Resume Downloaded",
        description: "Your optimized resume has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error downloading resume:", error);
      toast({
        title: "Download Failed",
        description: "There was an error downloading your resume. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Your Optimized Resumes</h1>

      <Table>
        <TableCaption>A list of your optimized resumes.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Date</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="w-[180px]">Version</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumes.map((resume) => (
            <TableRow key={resume.id}>
              <TableCell className="font-medium">
                {resume.metadata?.optimizedAt 
                  ? format(new Date(resume.metadata.optimizedAt), 'MMM d, yyyy')
                  : 'Unknown date'}
              </TableCell>
              <TableCell>
                <div className="font-medium">
                  {resume.jobDetails?.title || "Unknown Job"}
                </div>
                {resume.jobDetails?.location && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {resume.jobDetails.location}
                  </div>
                )}
              </TableCell>
              <TableCell>{resume.jobDetails?.company || "Unknown Company"}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  v{resume.metadata?.version || "1.0"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleResumeView(resume.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => handleResumeDownload(resume.id)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}