import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import { Eye, Download, Loader2 } from "lucide-react";
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
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: optimizedResumes = [], isLoading, error, isError } = useQuery<OptimizedResume[]>({
    queryKey: ['/api/optimized-resumes'],
    queryFn: async () => {
      try {
        console.log('Fetching optimized resumes...');
        const response = await fetch('/api/optimized-resumes');

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          console.error('Failed to fetch optimized resumes:', response.status);
          return [];
        }

        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);

        if (!contentType || !contentType.includes('application/json')) {
          // Handle HTML response - log more details
          const text = await response.text();
          console.error('Expected JSON response but got:', contentType?.slice(0, 100));
          return [];
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          console.error('Response is not an array:', typeof data);
          return [];
        }

        return data;
      } catch (err) {
        console.error('Error fetching resumes:', err);
        return [];
      }
    },
    retry: 1,
    retryDelay: 1000
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading optimized resumes...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center space-y-4 p-8 border rounded-lg">
          <h2 className="text-xl font-semibold">Error loading resumes</h2>
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : "Unexpected error occurred"}
          </p>
          <Button onClick={() => refetch()}>Try Again</Button>
          <Button asChild className="ml-2">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!optimizedResumes || optimizedResumes.length === 0) {
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
      setIsDownloading(true);
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
        title: "Success",
        description: "Resume downloaded successfully",
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download resume",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Optimized Resumes</h1>
        <Button asChild>
          <Link href="/dashboard">Back to Dashboard</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <Table>
            <TableCaption>List of your optimized resumes</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Improvement</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {optimizedResumes.map((resume) => (
                <TableRow key={resume.id}>
                  <TableCell className="font-medium">
                    {resume.metadata?.optimizedAt 
                      ? format(new Date(resume.metadata.optimizedAt), 'MMM d, yyyy')
                      : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{resume.metadata?.version || '1.0'}</Badge>
                  </TableCell>
                  <TableCell>{resume.jobDetails?.title || 'N/A'}</TableCell>
                  <TableCell>{resume.jobDetails?.company || 'N/A'}</TableCell>
                  <TableCell>
                    {resume.metrics && (
                      <div className="flex items-center space-x-1">
                        <span className="text-green-600 font-medium">
                          +{Math.round((resume.metrics.after.overall - resume.metrics.before.overall) * 100)}%
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeView(resume.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResumeDownload(resume.id)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-1" />
                        )}
                        Download
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}