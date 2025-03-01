
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

interface OptimizedResume {
  id: number;
  userId: number;
  uploadedResumeId: number;
  createdAt: string;
  updatedAt: string;
  optimisedResume: string;
  analysis: {
    strengths: string[];
    improvements: string[];
    gaps: string[];
    suggestions: string[];
  };
  metadata: {
    version?: string | number;
    optimizedAt?: string;
    filename?: string;
    [key: string]: any;
  };
  jobDetails: {
    title?: string;
    company?: string;
    location?: string;
    description?: string;
    requirements?: string[];
    [key: string]: any;
  };
}

export default function OptimizedResumesPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [optimizedResumes, setOptimizedResumes] = useState<OptimizedResume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Function to download a resume
  const handleDownload = async (resumeId: number) => {
    try {
      const response = await fetch(`/api/optimized-resumes/${resumeId}/download`);
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
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
  
  // Fetch optimized resumes
  useEffect(() => {
    const fetchResumes = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/optimized-resumes', {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `Server returned ${response.status}: ${response.statusText}`;
          try {
            // Try to parse error as JSON
            const errorJson = JSON.parse(errorText);
            if (errorJson.message) {
              errorMessage = errorJson.message;
            }
          } catch (e) {
            // If not valid JSON, use the text as is but truncated
            if (errorText.length > 100) {
              errorMessage += ` - ${errorText.substring(0, 100)}...`;
            } else if (errorText) {
              errorMessage += ` - ${errorText}`;
            }
          }
          throw new Error(errorMessage);
        }
        
        // Validate the JSON content type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned a non-JSON response. Please contact support.');
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Server returned an invalid response format');
        }
        
        setOptimizedResumes(data);
      } catch (err) {
        console.error('Error fetching resumes:', err);
        setError(err instanceof Error ? err.message : 'Failed to load resumes');
        toast({
          title: "Error loading resumes",
          description: err instanceof Error ? err.message : "Failed to load your optimized resumes",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchResumes();
  }, [toast]);
  
  // Function to retry fetching
  const handleRetry = () => {
    window.location.reload();
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
                {error}
              </p>
              <Button onClick={handleRetry}>
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
