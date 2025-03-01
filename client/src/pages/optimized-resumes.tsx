import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { format } from "date-fns";
import {
  CircleAlert,
  Download,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast"; // Added missing import
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { OptimizedResume } from "../../shared/schema";
import { MoreVertical, ChevronDown as OrigChevronDown, ChevronRight as OrigChevronRight, Trash2 as OrigTrash2, Info, ChartBar, LucideIcon, Star, ArrowUpRight, Gauge, CheckCircle, XCircle, AlertTriangle, CircleAlert as OrigCircleAlert, Lightbulb, GraduationCap, Briefcase, Award, Brain, User, Mail, Phone, MapPin, Calendar, FileText as OrigFileText, Code, ArrowUpCircle, HelpCircle, FileDown, BarChart2 } from "lucide-react";
import { apiRequest, queryClient as origQueryClient } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";


const getScoreColor = (score: number) => {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const getScoreTextColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-yellow-500";
  return "text-red-500";
};

function MetricRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{label}</span>
        <span className={`text-sm font-medium ${getScoreTextColor(score)}`}>
          {score.toFixed(1)}%
        </span>
      </div>
      <Progress value={score} className={`h-2 ${getScoreColor(score)}`} />
    </div>
  );
}

const queryClient = useQueryClient();

function ResumeRow({ resume, onDelete, onDownload }: { 
  resume: OptimizedResume; 
  onDelete: (id: number) => void;
  onDownload: (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx', resumeId: number) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { toast } = useToast();

  if (!resume) {
    return null;
  }

  // Ensure analysis data is never undefined
  const analysisData = resume.analysis || {
    strengths: [],
    improvements: [],
    gaps: [],
    suggestions: []
  };

  // Ensure other needed properties exist
  const metadata = resume.metadata || {};
  const jobDetails = resume.jobDetails || {};

  return (
    <>
      <TableRow
        key={resume.id}
        onClick={() => setIsExpanded(!isExpanded)}
        className="cursor-pointer hover:bg-muted/50"
      >
        <TableCell>
          <div className="font-medium">{jobDetails?.title || "Untitled Position"}</div>
          <div className="text-sm text-muted-foreground">
            {jobDetails?.company || "Unknown Company"}
          </div>
        </TableCell>
        <TableCell>{metadata.version || "1.0"}</TableCell>
        <TableCell>
          {metadata?.optimizedAt
            ? format(new Date(metadata.optimizedAt), "MMM d, yyyy")
            : "N/A"}
        </TableCell>
        <TableCell className="flex justify-end items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload("resume", "docx", resume.id);
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            DOCX
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDownload("resume", "pdf", resume.id);
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            PDF
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Resume</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this optimized resume? This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onDelete(resume.id);
                  }}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={4} className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-2">Resume Analysis</h3>
                  <div className="space-y-4">
                    <div 
                      className={`border-l-4 px-3 py-2 rounded-sm cursor-pointer hover:bg-muted/50 ${activeSection === 'strengths' ? 'border-green-500 bg-muted/50' : 'border-muted'}`}
                      onClick={() => setActiveSection(activeSection === 'strengths' ? '' : 'strengths')}
                    >
                      <h4 className="font-medium flex items-center justify-between">
                        Strengths
                        {activeSection === 'strengths' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </h4>
                      {activeSection === 'strengths' && analysisData.strengths && analysisData.strengths.length > 0 && (
                        <ul className="mt-2 pl-4 list-disc space-y-1">
                          {analysisData.strengths.map((strength, idx) => (
                            <li key={idx} className="text-sm">{strength}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div 
                      className={`border-l-4 px-3 py-2 rounded-sm cursor-pointer hover:bg-muted/50 ${activeSection === 'improvements' ? 'border-amber-500 bg-muted/50' : 'border-muted'}`}
                      onClick={() => setActiveSection(activeSection === 'improvements' ? '' : 'improvements')}
                    >
                      <h4 className="font-medium flex items-center justify-between">
                        Areas for Improvement
                        {activeSection === 'improvements' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </h4>
                      {activeSection === 'improvements' && analysisData.improvements && analysisData.improvements.length > 0 && (
                        <ul className="mt-2 pl-4 list-disc space-y-1">
                          {analysisData.improvements.map((item, idx) => (
                            <li key={idx} className="text-sm">{item}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div 
                      className={`border-l-4 px-3 py-2 rounded-sm cursor-pointer hover:bg-muted/50 ${activeSection === 'gaps' ? 'border-red-500 bg-muted/50' : 'border-muted'}`}
                      onClick={() => setActiveSection(activeSection === 'gaps' ? '' : 'gaps')}
                    >
                      <h4 className="font-medium flex items-center justify-between">
                        Skills Gaps
                        {activeSection === 'gaps' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </h4>
                      {activeSection === 'gaps' && analysisData.gaps && analysisData.gaps.length > 0 && (
                        <ul className="mt-2 pl-4 list-disc space-y-1">
                          {analysisData.gaps.map((gap, idx) => (
                            <li key={idx} className="text-sm">{gap}</li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div 
                      className={`border-l-4 px-3 py-2 rounded-sm cursor-pointer hover:bg-muted/50 ${activeSection === 'suggestions' ? 'border-blue-500 bg-muted/50' : 'border-muted'}`}
                      onClick={() => setActiveSection(activeSection === 'suggestions' ? '' : 'suggestions')}
                    >
                      <h4 className="font-medium flex items-center justify-between">
                        Suggestions
                        {activeSection === 'suggestions' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </h4>
                      {activeSection === 'suggestions' && analysisData.suggestions && analysisData.suggestions.length > 0 && (
                        <ul className="mt-2 pl-4 list-disc space-y-1">
                          {analysisData.suggestions.map((suggestion, idx) => (
                            <li key={idx} className="text-sm">{suggestion}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="text-lg font-medium mb-2">Job Details</h3>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-sm font-medium">Position</h4>
                      <p>{jobDetails?.title || "Not specified"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Company</h4>
                      <p>{jobDetails?.company || "Not specified"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Location</h4>
                      <p>{jobDetails?.location || "Not specified"}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Requirements</h4>
                      {jobDetails?.requirements && jobDetails.requirements.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {jobDetails.requirements.map((req, idx) => (
                            <Badge key={idx} variant="outline">{req}</Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No specific requirements listed</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

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
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <CircleAlert className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-muted-foreground">Failed to load resumes</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </div>
    );
  }

  if (!resumes || resumes.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">No optimized resumes found</p>
            <Button onClick={() => window.location.href = '/dashboard'}>Go to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const downloadDocument = async (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx', resumeId: number) => {
    try {
      toast({
        title: "Downloading...",
        description: `Preparing your ${type} for download`,
      });

      const response = await fetch(`/api/download/${type}/${resumeId}?format=${format}`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`Failed to download document: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or use default
      let filename = `${type}-${resumeId}.${format}`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `Your ${type} has been downloaded`,
      });
    } catch (err) {
      console.error('Download error:', err);
      toast({
        title: "Download Failed",
        description: err instanceof Error ? err.message : "Failed to download document",
        variant: "destructive",
      });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/resume/optimized/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete resume');
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/optimized-resumes"] });
      toast({
        title: "Success",
        description: "Resume deleted successfully",
        duration: 2000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resume",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Optimized Resumes</h2>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/dashboard">Create New</Link>
          </Button>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Job Position</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Created On</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumes.map((resume) => (
            <ResumeRow 
              key={resume.id} 
              resume={resume} 
              onDelete={(id) => deleteMutation.mutate(id)}
              onDownload={downloadDocument}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}