import { useState, useEffect } from "react";
import { useQuery, useMutation, UseMutationResult } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  MoreVertical,
  ChevronDown,
  ChevronRight,
  Trash2,
  Info,
  ChartBar,
  LucideIcon,
  Star,
  ArrowUpRight,
  Gauge,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CircleAlert,
  Lightbulb,
  GraduationCap,
  Briefcase,
  Award,
  Brain,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Code,
  ArrowUpCircle,
  HelpCircle,
  FileDown,
  BarChart2,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";


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

function ResumeRow({
  resume,
  deleteMutation,
  downloadDocument
}: {
  resume: OptimizedResume;
  deleteMutation: UseMutationResult;
  downloadDocument: (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx', resumeId: number) => Promise<void>;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const { toast } = useToast();

  // Ensure analysis data is never undefined and has arrays
  const analysisData = {
    strengths: resume?.analysis?.strengths || [],
    improvements: resume?.analysis?.improvements || [],
    gaps: resume?.analysis?.gaps || [], 
    suggestions: resume?.analysis?.suggestions || []
  };

  // Ensure other needed properties exist
  const metadata = resume?.metadata || {};
  const jobDetails = resume?.jobDetails || {};
  const jobTitle = jobDetails?.title || 'Position';
  const company = jobDetails?.company || 'Company';

  return (
    <>
      <TableRow
        className={`group transition-colors ${isExpanded ? "bg-muted/50" : "hover:bg-muted/30"}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <TableCell className="w-4">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </TableCell>
        <TableCell>
          <div className="text-sm">#{resume.id}</div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-0.5">
            <div className="text-sm">{new Date(resume.metadata.optimizedAt).toLocaleDateString()}</div>
            <div className="text-xs text-muted-foreground">{new Date(resume.metadata.optimizedAt).toLocaleTimeString()}</div>
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm font-medium">{resume.metadata.version}</div>
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <div className="text-sm">{jobTitle}</div>
            <div className="text-xs text-muted-foreground">{company}</div>
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell text-right">
          <div className="flex items-center justify-end gap-2">
            <span className={`text-sm ${getScoreTextColor(resume.metrics.after.overall)}`}>
              {resume.metrics.after.overall.toFixed(1)}%
            </span>
          </div>
        </TableCell>
        <TableCell className="w-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Download Resume</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument("resume", "pdf", resume.id)}>
                <FileText className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("resume", "docx", resume.id)}>
                <FileText className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Download Cover Letter</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "pdf", resume.id)}>
                <FileText className="mr-2 h-4 w-4" />
                PDF Format
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => downloadDocument("cover-letter", "docx", resume.id)}>
                <FileText className="mr-2 h-4 w-4" />
                DOCX Format
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Optimized Resume</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the optimized resume and its
                      corresponding cover letter. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(resume.id);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30 border-t border-muted">
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-card rounded-lg border p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <ChartBar className="h-5 w-5 text-primary" />
                    Resume Metrics
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      <div className="bg-primary/5 rounded-lg p-4">
                        <MetricRow
                          label="Overall Score"
                          score={resume.metrics.after.overall}
                        />
                      </div>
                      <MetricRow
                        label="Skills"
                        score={resume.metrics.after.skills}
                      />
                      <MetricRow
                        label="Keywords"
                        score={resume.metrics.after.keywords}
                      />
                      <MetricRow
                        label="Education"
                        score={resume.metrics.after.education}
                      />
                    </div>
                    <div className="space-y-6">
                      <MetricRow
                        label="Experience"
                        score={resume.metrics.after.experience}
                      />
                      <MetricRow
                        label="AI Readiness"
                        score={resume.metrics.after.aiReadiness}
                      />
                      <MetricRow
                        label="Personalization"
                        score={resume.metrics.after.personalization}
                      />
                      <MetricRow
                        label="Confidence"
                        score={resume.metrics.after.confidence}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-4">Analysis</h3>
                  <div className="space-y-3">
                    <div className="rounded-lg border">
                      <button
                        onClick={() => setActiveSection(activeSection === 'strengths' ? '' : 'strengths')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                          <span className="font-medium text-sm">Strengths</span>
                          <span className="text-xs text-muted-foreground">
                            {analysisData.strengths?.length || 0}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${activeSection === 'strengths' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeSection === 'strengths' && (
                        <div className="px-4 pb-3 space-y-2">
                          {analysisData.strengths?.map((strength, idx) => (
                            <div key={idx} className="text-sm text-emerald-600 flex gap-2 items-start">
                              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{strength}</span>
                            </div>
                          ))}
                          {analysisData.strengths.length === 0 && (
                            <div className="text-sm text-muted-foreground flex gap-2 items-center">
                              <Info className="h-4 w-4" />
                              <span>No strengths identified yet</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border">
                      <button
                        onClick={() => setActiveSection(activeSection === 'improvements' ? '' : 'improvements')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ArrowUpCircle className="h-4 w-4 text-amber-500" />
                          <span className="font-medium text-sm">Improvements</span>
                          <span className="text-xs text-muted-foreground">
                            {analysisData.improvements?.length || 0}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${activeSection === 'improvements' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeSection === 'improvements' && (
                        <div className="px-4 pb-3 space-y-2">
                          {analysisData.improvements?.map((improvement, idx) => (
                            <div key={idx} className="text-sm text-amber-600 flex gap-2 items-start">
                              <ArrowUpCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{improvement}</span>
                            </div>
                          ))}
                          {analysisData.improvements.length === 0 && (
                            <div className="text-sm text-muted-foreground flex gap-2 items-center">
                              <Info className="h-4 w-4" />
                              <span>No improvements identified yet</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg border">
                      <button
                        onClick={() => setActiveSection(activeSection === 'gaps' ? '' : 'gaps')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                          <span className="font-medium text-sm">Gaps</span>
                          <span className="text-xs text-muted-foreground">
                            {analysisData.gaps?.length || 0}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${activeSection === 'gaps' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeSection === 'gaps' && (
                        <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
                          {analysisData.gaps?.map((gap, idx) => (
                            <div key={idx} className="text-sm text-red-600 flex gap-2 items-start">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{gap}</span>
                            </div>
                          ))}
                          {analysisData.gaps.length === 0 && (
                            <div className="text-sm text-muted-foreground flex gap-2 items-center">
                              <Info className="h-4 w-4" />
                              <span>No gaps identified</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border">
                      <button
                        onClick={() => setActiveSection(activeSection === 'suggestions' ? '' : 'suggestions')}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-500" />
                          <span className="font-medium text-sm">Suggestions</span>
                          <span className="text-xs text-muted-foreground">
                            {analysisData.suggestions?.length || 0}
                          </span>
                        </div>
                        <ChevronDown className={`h-4 w-4 transition-transform ${activeSection === 'suggestions' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeSection === 'suggestions' && (
                        <div className="px-4 pb-3 space-y-2">
                          {analysisData.suggestions?.map((suggestion, idx) => (
                            <div key={idx} className="text-sm text-blue-600 flex gap-2 items-start">
                              <Lightbulb className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </div>
                          ))}
                          {analysisData.suggestions.length === 0 && (
                            <div className="text-sm text-muted-foreground flex gap-2 items-center">
                              <Info className="h-4 w-4" />
                              <span>No suggestions available</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function OptimizedResumesPage() {
  const { data: resumes = [], isLoading, error } = useQuery<OptimizedResume[]>({
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
            <Button onClick={() => window.location.reload()}>Try Again</Button>
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

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadDocument = async (type: 'resume' | 'cover-letter', format: 'pdf' | 'docx', resumeId: number) => {
    try {
      setIsDownloading(true);
      const endpoint = `/api/documents/${type}/${resumeId}/download?format=${format}`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Accept': format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `Failed to download ${type}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Handle case where server returned JSON error instead of file
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to download ${type}`);
      }

      const blob = await response.blob();
      if (blob.size === 0) {
        throw new Error('Downloaded file is empty');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${resumeId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} downloaded successfully`,
        duration: 3000,
      });
    } catch (error: any) {
      console.error(`Error downloading ${type}:`, error);
      toast({
        title: "Error",
        description: error.message || `Failed to download ${type}. Try again.`,
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 h-full">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
              <div className="h-12 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
            Optimized Resumes
          </h1>
        </div>

        {resumes && resumes.length > 0 ? (
          <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-4"></TableHead>
                  <TableHead className="w-20">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      ID
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Date/Time
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Version
                    </span>
                  </TableHead>
                  <TableHead>
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Job Details
                    </span>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell text-right">
                    <span className="text-xs uppercase tracking-wider font-medium text-muted-foreground">
                      Match Score
                    </span>
                  </TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resumes?.map((resume) => (
                  <ResumeRow key={resume.id} resume={resume} deleteMutation={deleteMutation} downloadDocument={downloadDocument} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-b from-background to-muted/20 rounded-lg border-2 border-dashed">
            <FileText className="mx-auto h-16 w-16 text-primary/60 animate-heartbeat" />
            <h3 className="mt-6 text-xl font-semibold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent animate-typing">
              Ready to Enhance Your Resume?
            </h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto opacity-0 animate-[fadeIn_1s_ease-in_forwards_0.5s]">
              Transform your resume with AI-powered optimization to stand out from the crowd
            </p>
          </div>
        )}
      </div>
    </div>
  );
}