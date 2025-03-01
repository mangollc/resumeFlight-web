
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader,
  CardTitle,
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
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
import type { OptimizedResume } from "../../shared/schema";
import { FileText, Download, Eye, RefreshCw } from "lucide-react";

export default function OptimizedResumesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);

  const {
    data: optimizedResumes = [],
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<OptimizedResume[]>({
    queryKey: ["/api/optimized-resumes"],
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (err: Error) => {
      console.error("Error fetching optimized resumes:", err);
      toast({
        title: "Error loading resumes",
        description: err.message || "Failed to load your optimized resumes",
        variant: "destructive",
      });
    }
  });

  const handleDownload = async (id: number) => {
    try {
      const response = await fetch(`/api/optimized-resumes/${id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-resume-${id}.docx`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "Your optimized resume is being downloaded",
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

  const handleViewDetails = (id: number) => {
    setSelectedResumeId(id);
    navigate(`/optimized-resume/${id}`);
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Optimized Resumes</h1>
        <p className="text-gray-500">Loading your optimized resumes...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto mt-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Optimized Resumes</h1>
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <div className="rounded-full bg-red-100 p-3 text-red-600 mb-4">
                <RefreshCw className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Error Loading Resumes</h3>
              <p className="text-sm text-gray-500 mb-4">
                {error instanceof Error ? error.message : "Failed to load your optimized resumes"}
              </p>
              <Button onClick={() => refetch()}>
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
                    <TableCell className="font-medium">
                      {resume.jobDetails?.title || 'Untitled Job'}
                    </TableCell>
                    <TableCell>
                      {resume.jobDetails?.company || 'Unknown Company'}
                    </TableCell>
                    <TableCell>
                      {formatDate(resume.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Ready
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(resume.id)}
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
