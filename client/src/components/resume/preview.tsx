import { useState, useEffect } from "react";
import { UploadedResume, OptimizedResume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Maximize2, Download, LineChart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import DiffView from "./diff-view";
import { Confetti } from "@/components/ui/confetti";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {Badge} from "@/components/ui/badge"; // Added Badge component

interface PreviewProps {
  resume: UploadedResume | OptimizedResume | null;
}

const getMetricsColor = (value: number): string => {
  if (value >= 80) return "bg-emerald-500 dark:bg-emerald-400";
  if (value >= 60) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
};

const getScoreLabel = (score: number): string => {
  if (score >= 80) return "Excellent Match";
  if (score >= 60) return "Good Match";
  if (score >= 40) return "Fair Match";
  return "Needs Improvement";
};

const MetricRow = ({ label, before, after }: { label: string; before?: number; after: number }) => {
  const scoreLabel = getScoreLabel(after);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {before !== undefined && (
            <>
              <span className="text-muted-foreground">Before: {before}%</span>
              <span className="text-muted-foreground" aria-hidden="true">→</span>
            </>
          )}
          <span
            className={cn(
              "font-medium px-2 py-0.5 rounded text-xs",
              after >= 80
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100"
                : after >= 60
                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100"
                : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
            )}
            aria-label={`Current score: ${after}%`}
          >
            {after}%
          </span>
        </div>
      </div>
      <div
        className="relative h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={after}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} progress: ${after}%`}
      >
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out rounded-full",
            getMetricsColor(after)
          )}
          style={{ width: `${after}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground" aria-label={scoreLabel}>
        {scoreLabel}
      </div>
    </div>
  );
};

const getInitials = (text: string): string => {
  const nameMatch = text.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)/i);
  return nameMatch ? `${nameMatch[1][0]}${nameMatch[2][0]}`.toUpperCase() : "XX";
};

const RichTextEditor = ({ content, readOnly, onChange }: { content: string; readOnly: boolean; onChange: (content: string) => void }) => {
  // Placeholder for a real rich text editor
  return (
    <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
      <pre className="whitespace-pre-wrap font-sans text-sm">
        {content}
      </pre>
    </div>
  );
};


export default function Preview({ resume }: PreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScores, setMatchScores] = useState<{
    originalScores: any;
    optimizedScores: any;
    analysis: { strengths: string[]; gaps: string[]; suggestions: string[] };
  } | null>(null);
  const [isScoresExpanded, setIsScoresExpanded] = useState(false);
  const { toast } = useToast();
  const [isEdited, setIsEdited] = useState(false); // Added state for edited status
  const [selectedFormat, setSelectedFormat] = useState('pdf'); // Added state for download format
  const [isEditing, setIsEditing] = useState(false); // Added state for editing mode
  const [editedContent, setEditedContent] = useState(resume?.content || ""); //State to hold edited content


  const handleSave = async (content: string) => {
    try {
      const response = await fetch(`/api/optimized-resume/${resume.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to save changes');
      setIsEdited(true);
      setIsEditing(false); //Exit edit mode after save
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent);
  };

  const analyzeResume = async () => {
    if (!resume || !("id" in resume)) return;

    try {
      setIsAnalyzing(true);
      const response = await fetch(`/api/optimized-resume/${resume.id}/analyze`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to analyze resume");
      }

      const data = await response.json();
      setMatchScores(data);
      setIsScoresExpanded(true);

      // Update match scores state
  setMatchScores({
    before: data.originalScores,
    after: data.optimizedScores,
    analysis: data.analysis
  });
  
  if (data.optimizedScores.overall >= 80) {
    setShowConfetti(true);
    toast({
      title: "Outstanding Achievement! 🎉",
      description: "Your resume has achieved excellent optimization scores.",
    });
  }
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Unable to analyze the resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (!resume) {
      setMatchScores(null);
      setIsScoresExpanded(false);
      setIsEdited(false); // Reset edited status when resume changes
      setEditedContent(""); // Clear edited content
      setIsEditing(false); // Exit edit mode
    } else {
      setEditedContent(resume.content); //update edited content when resume changes.
    }
  }, [resume]);

  if (!resume) {
    return (
      <Card className="h-full">
        <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <div className="space-y-2">
            <div className="font-medium">No resume selected</div>
            <div className="text-sm text-muted-foreground">
              Upload a resume to get started with optimization
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isOptimized = "jobDescription" in resume;
  const originalContent = isOptimized ? (resume as OptimizedResume).originalContent : resume.content;
  const optimizedContent = resume.content;

  const formatFilename = () => {
    const initials = getInitials(originalContent);
    const jobTitle = isOptimized
      ? (resume as OptimizedResume).jobDetails?.title?.replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, "_")
          .toLowerCase()
          .substring(0, 30)
      : "resume";
    return `${initials}_${jobTitle}_${isEdited ? 'edited' : 'original'}`;
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/optimized-resume/${resume.id}/download?format=${selectedFormat}&edited=${isEdited}`
      );
      if (!response.ok) {
        throw new Error("Failed to download resume");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${formatFilename()}.${selectedFormat}`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the resume. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <Card className="h-full">
      <Confetti trigger={showConfetti} />
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="font-semibold truncate max-w-[200px] sm:max-w-none">
                  {resume.metadata.filename}
                  {resume.metadata.version && ( // Added conditional rendering for version
                    <Badge variant="outline" className="ml-2">
                      v{typeof resume.metadata.version === 'number' ? resume.metadata.version.toFixed(1) : resume.metadata.version}
                    </Badge>
                  )}
                </div>
                {isOptimized ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100">
                    Optimized
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                    Original
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isOptimized && (
                  <>
                    <Button onClick={handleDownload} variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download Resume
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={analyzeResume}
                      disabled={isAnalyzing}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <LineChart className="h-4 w-4 mr-2" />
                      {isAnalyzing ? "Analyzing..." : "Analyze Match"}
                    </Button>
                  </>
                )}
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Compare Versions
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Resume Comparison</DialogTitle>
                      <DialogDescription>
                        Compare the original and optimized versions of your resume side by side.
                        Highlighted sections show improvements and optimizations.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="mt-4">
                      {isDialogOpen && (
                        <DiffView
                          beforeContent={originalContent}
                          afterContent={optimizedContent}
                          resumeId={(resume as OptimizedResume).id}
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
            {isEditing ? (
              <RichTextEditor content={editedContent} onChange={handleContentChange} />
            ) : (
              <div className="whitespace-pre-wrap formatted-content">{optimizedContent}</div>
            )}
          </div>

          {isOptimized && matchScores && (
            <Collapsible open={isScoresExpanded} onOpenChange={setIsScoresExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Resume Match Analysis</span>
                  <span className={`transform transition-transform ${isScoresExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-6">
                      <MetricRow
                        label="Match Score"
                        before={matchScores.originalScores.overall}
                        after={matchScores.optimizedScores.overall}
                      />
                      <MetricRow
                        label="Keyword Alignment"
                        before={matchScores.originalScores.keywords}
                        after={matchScores.optimizedScores.keywords}
                      />
                      <MetricRow
                        label="Skills Match"
                        before={matchScores.originalScores.skills}
                        after={matchScores.optimizedScores.skills}
                      />
                      <MetricRow
                        label="Experience Relevance"
                        before={matchScores.originalScores.experience}
                        after={matchScores.optimizedScores.experience}
                      />
                    </div>

                    {matchScores?.analysis && (
                      <div className="mt-6 space-y-4 border-t pt-4">
                        <h4 className="font-medium">Analysis Results</h4>
                        {matchScores.analysis.strengths.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Strengths</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {matchScores.analysis.strengths.map((strength, i) => (
                                <li key={i} className="text-sm text-emerald-600 dark:text-emerald-400">
                                  {strength}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {matchScores.analysis.gaps.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Areas for Improvement</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {matchScores.analysis.gaps.map((gap, i) => (
                                <li key={i} className="text-sm text-red-600 dark:text-red-400">
                                  {gap}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {matchScores.analysis.suggestions.length > 0 && (
                          <div>
                            <h4 className="font-medium mb-2">Suggestions</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {matchScores.analysis.suggestions.map((suggestion, i) => (
                                <li key={i} className="text-sm text-blue-600 dark:text-blue-400">
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          <LoadingDialog
            open={isAnalyzing}
            onOpenChange={setIsAnalyzing}
            title="Analyzing Resume"
            description="Please wait while we analyze your resume against the job requirements..."
            steps={[
              {
                id: "analyze",
                label: "Analyzing resume content",
                status: isAnalyzing ? "loading" : "completed",
              },
              {
                id: "compare",
                label: "Comparing with job requirements",
                status: isAnalyzing ? "loading" : "completed",
              },
              {
                id: "calculate",
                label: "Calculating match scores",
                status: isAnalyzing ? "loading" : "completed",
              },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}