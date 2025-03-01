import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { type OptimizedResume } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

export default function OptimizedResumesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: optimizedResumes = [], isLoading, error } = useQuery<OptimizedResume[]>({
    queryKey: ['/api/optimized-resumes'],
    retry: 2,
    staleTime: 30000,
  });

  // Function to download a resume
  const handleDownload = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/optimized-resumes/${resumeId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-resume-${resumeId}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: "Your resume is being downloaded",
      });
    } catch (err) {
      console.error("Download error:", err);
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Failed to download resume",
        variant: "destructive",
      });
    }
  };

  // Function to view resume details
  const handleView = (resumeId: number) => {
    navigate(`/optimized-resume/${resumeId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Optimized Resumes</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 mb-4"></div>
              <p>Loading your optimized resumes...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Optimized Resumes</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-red-100 p-3 text-red-600 mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Error Loading Resumes</h3>
              <p className="text-sm text-gray-500 mb-4">
                {error instanceof Error ? error.message : "Failed to load resumes"}
              </p>
              <Button onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Optimized Resumes</h1>

      {optimizedResumes.length === 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-gray-100 p-3 text-gray-600 mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">No Optimized Resumes Yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                You haven't optimized any resumes yet. Go to the dashboard to get started.
              </p>
              <Button onClick={() => navigate("/")}>
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Optimized Resumes</CardTitle>
            <CardDescription>
              View and download your AI-optimized resumes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimizedResumes.map((resume) => (
                  <TableRow key={resume.id}>
                    <TableCell>{resume.jobDetails?.title || "Untitled Position"}</TableCell>
                    <TableCell>{resume.jobDetails?.company || "Unknown Company"}</TableCell>
                    <TableCell>
                      {resume.createdAt 
                        ? formatDistanceToNow(new Date(resume.createdAt), { addSuffix: true })
                        : "Unknown"
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleView(resume.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownload(resume.id)}
                        >
                          <Download className="h-4 w-4 mr-1" /> Download
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}