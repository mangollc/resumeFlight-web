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

interface SavePromptProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function SavePrompt({ isOpen, onConfirm, onCancel }: SavePromptProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Save Changes?</h3>
        <p className="mb-4">Do you want to save your changes?</p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

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

const Progress = ({ value, className }: { value: number; className: string }) => {
  return (
    <div
      className={cn("h-2 rounded-full bg-muted", className)}
      style={{ width: `${value}%` }}
    />
  );
};


const MetricRow = ({ label, before, after }: { label: string; before: number; after: number }) => {
  const scoreLabelAfter = getScoreLabel(after);
  const scoreLabelBefore = getScoreLabel(before);
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Before: {before}% ({scoreLabelBefore})</span>
          <span className="text-muted-foreground" aria-hidden="true">→</span>
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
            {after}% ({scoreLabelAfter})
          </span>
        </div>
      </div>
      <div className="flex gap-2">
        <Progress value={before} className={getMetricsColor(before)} />
        <Progress value={after} className={getMetricsColor(after)} />
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
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false); // Added state for save prompt


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
      setIsSavePromptOpen(false); //Close save prompt after save
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
    originalScores: data.originalScores,
    optimizedScores: data.optimizedScores,
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
      setIsSavePromptOpen(false); //Close save prompt when resume changes
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
              <Button variant="outline" size="sm" onClick={() => {
                if (isEditing && isEdited === false) {
                  setIsSavePromptOpen(true);
                } else {
                  setIsEditing(!isEditing);
                }
              }}>
                {isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
            {isEditing ? (
              <RichTextEditor content={editedContent} onChange={handleContentChange} readOnly={false} />
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
                <div className="mt-6">
                  <div className="space-y-4">
                    {["keywords", "skills", "experience", "education", "personalization", "aiReadiness"].map((metric) => (
                      <div key={metric} className="bg-muted/10 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium capitalize">{metric}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{matchScores.originalScores[metric] || 0}%</span>
                            <span className="text-muted-foreground">→</span>
                            <span className={cn(
                              "font-medium",
                              (matchScores.optimizedScores[metric] || 0) >= 80 ? "text-green-600" :
                              (matchScores.optimizedScores[metric] || 0) >= 60 ? "text-yellow-600" :
                              "text-red-600"
                            )}>{matchScores.optimizedScores[metric] || 0}%</span>
                          </div>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="absolute h-full bg-primary/30 rounded-full transition-all" 
                            style={{ width: `${matchScores.originalScores[metric] || 0}%` }}
                          />
                          <div 
                            className={cn(
                              "absolute h-full rounded-full transition-all",
                              (matchScores.optimizedScores[metric] || 0) >= 80 ? "bg-green-500" :
                              (matchScores.optimizedScores[metric] || 0) >= 60 ? "bg-yellow-500" :
                              "bg-red-500"
                            )}
                            style={{ width: `${matchScores.optimizedScores[metric] || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>e-y-3">
                          {["keywords", "skills", "experience", "education", "personalization", "aiReadiness"].map((metric) => (
                            <MetricRow key={`after-${metric}`} label={metric} before={matchScores.originalScores[metric] || 0} after={matchScores.optimizedScores[metric] || 0} />
                          ))}
                        </div>
                      </CollapsibleContent>
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
          <SavePrompt isOpen={isSavePromptOpen} onConfirm={() => {handleSave(editedContent); setIsSavePromptOpen(false);}} onCancel={() => setIsSavePromptOpen(false)}/>
        </div>
      </CardContent>
    </Card>
  );
}