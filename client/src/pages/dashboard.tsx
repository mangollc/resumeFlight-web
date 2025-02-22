import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { WelcomeAnimation } from "@/components/ui/welcome-animation";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import ComparisonView from "@/components/resume/comparison-view";
import { type UploadedResume, type OptimizedResume, type CoverLetter as CoverLetterType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, ArrowLeft, ArrowRight, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from 'framer-motion';


const jobProverbs = [
  "Your next career move starts with a great resume",
  "Every masterpiece starts with a single draft",
  "Small improvements lead to big opportunities",
  "Your skills are your superpower",
  "Today's preparation determines tomorrow's success",
  "Excellence is not a skill, it's an attitude",
  "Your dream job is looking for you too",
  "Let your resume tell your story",
  // Adding 10 more inspiring proverbs
  "Every expert was once a beginner",
  "The best investment is in yourself",
  "Success is built one opportunity at a time",
  "Your potential is limitless, your resume should show it",
  "Great careers are built on great foundations",
  "The perfect job doesn't exist, create it",
  "Your next chapter begins with your next application",
  "Turn experience into excellence",
  "Progress over perfection, always",
  "Opportunities multiply as they are seized"
];

const steps: Step[] = [
  {
    id: 1,
    title: "Upload Resume",
    description: "Upload your current resume in PDF or DOCX format"
  },
  {
    id: 2,
    title: "Job Details",
    description: "Enter the job description or provide a job posting URL"
  },
  {
    id: 3,
    title: "Optimize",
    description: "Get your resume optimized by AI"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  },
  {
    id: 5,
    title: "Review",
    description: "Review optimized documents"
  }
];

export type JobDetails = {
  url?: string | undefined;
  description?: string | undefined;
  title?: string | undefined;
  company?: string | undefined;
  location?: string | undefined;
};

export default function Dashboard() {
  const { user } = useAuth();
  const params = useParams<{ id?: string }>();
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Extract optimizedId from URL if present
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const optimizedId = searchParams.get('optimizedId');
  // Check both params.id and optimizedId for review mode
  const isReviewMode = Boolean(params.id && optimizedId);

  // State for review mode
  const [isLoadingReview, setIsLoadingReview] = useState(isReviewMode);
  const [reviewLoadError, setReviewLoadError] = useState<string | null>(null);

  // Initialize all state variables
  const [currentStep, setCurrentStep] = useState(isReviewMode ? 5 : 1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterType | null>(null);
  const [showWelcome, setShowWelcome] = useState(!isReviewMode);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [optimizationVersion, setOptimizationVersion] = useState(1.0);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isComparingResumes, setIsComparingResumes] = useState(false);
  const [coverLetterVersion, setCoverLetterVersion] = useState(1.0);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [selectedCoverLetterVersion, setSelectedCoverLetterVersion] = useState<string>("");
  const [coverLetters, setCoverLetters] = useState<CoverLetterType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [proverb, setProverb] = useState("");

  // Fetch optimized resume data in review mode
  useEffect(() => {
    if (isReviewMode && optimizedId) {
      const loadReviewData = async () => {
        try {
          setIsLoadingReview(true);
          setReviewLoadError(null);

          const response = await apiRequest('GET', `/api/optimized-resume/${optimizedId}`);
          if (!response.ok) {
            throw new Error('Failed to fetch optimization session');
          }

          const data = await response.json();

          // Set all the necessary data
          setOptimizedResume(data);
          setUploadedResume(data.uploadedResume);
          setCoverLetter(data.coverLetter);
          setCompletedSteps([1, 2, 3, 4, 5]); // Mark all steps as completed in review mode

        } catch (error) {
          const err = error as Error;
          console.error('Error loading optimization session:', err);
          setReviewLoadError(err.message);
          toast({
            title: "Error",
            description: "Failed to load optimization session",
            variant: "destructive",
          });
        } finally {
          setIsLoadingReview(false);
        }
      };

      loadReviewData();
    }
  }, [isReviewMode, optimizedId, toast]);

  // Welcome animation effect
  useEffect(() => {
    if (!isReviewMode) {
      const randomIndex = Math.floor(Math.random() * jobProverbs.length);
      setProverb(jobProverbs[randomIndex]);

      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isReviewMode]);

  const { data: resumes } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
  });

  const handleResumeUploaded = async (resume: UploadedResume) => {
    try {
      setUploadedResume(resume);
      if (!completedSteps.includes(1)) {
        setCompletedSteps(prev => [...prev, 1]);
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/uploaded-resumes"] });
      setUploadMode('choose');

      toast({
        title: "Success",
        description: "Resume uploaded successfully",
        duration: 2000, // Set to 2 seconds
      });
    } catch (error) {
      console.error('Error handling resume upload:', error);
      toast({
        title: "Error",
        description: "Failed to process uploaded resume",
        variant: "destructive",
      });
    }
  };

  const handleOptimizationComplete = (resume: OptimizedResume, details: JobDetails) => {
    setOptimizedResume(resume);
    setJobDetails(details);
    if (!completedSteps.includes(2)) {
      setCompletedSteps(prev => [...prev, 2]);
    }
    setOptimizationVersion(prev => Number((prev + 0.1).toFixed(1)));
  };

  const handleCoverLetterGenerated = (letter: CoverLetterType) => {
    setCoverLetter(letter);
    // Ensure no duplicate versions in the array
    const existingVersions = new Set(coverLetters.map(l => l.metadata.version));
    if (!existingVersions.has(letter.metadata.version)) {
      setCoverLetters(prev => [...prev, letter]);
    }
    if (!completedSteps.includes(4)) {
      setCompletedSteps(prev => [...prev, 4]);
    }
    setSelectedCoverLetterVersion(letter.metadata.version.toString());
    setCoverLetterVersion(letter.metadata.version);
  };

  const handleRegenerateCoverLetter = async () => {
    if (!optimizedResume?.id) return;

    try {
      setIsGeneratingCoverLetter(true);
      const nextVersion = Number((Math.max(...coverLetters.map(l => l.metadata.version), 0) + 0.1).toFixed(1));
      setCoverLetterVersion(nextVersion);

      const response = await apiRequest(
        "POST",
        `/api/optimized-resume/${optimizedResume.id}/cover-letter`,
        {
          version: nextVersion,
          contactInfo: optimizedResume.contactInfo
        }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate cover letter');
      }

      const data = await response.json();
      handleCoverLetterGenerated(data);

      toast({
        title: "Success",
        description: `Cover letter regenerated (v${nextVersion.toFixed(1)})`,
        duration: 2000, // Set to 2 seconds
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate cover letter",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleDownloadPackage = async () => {
    if (!optimizedResume?.id) return;

    try {
      setIsDownloading(true);

      const formData = new FormData();
      formData.append('sessionId', sessionId);
      if (jobDetails) {
        formData.append('jobDetails', JSON.stringify(jobDetails));
      }
      if (coverLetter) {
        formData.append('coverLetterId', coverLetter.id.toString());
      }

      const response = await fetch(`/api/optimized-resume/${optimizedResume.id}/package/download`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/zip',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download package');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `resume-package-${Date.now()}.zip`;
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Package downloaded successfully",
        duration: 2000, // Set to 2 seconds
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download package",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleStartOver = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setUploadedResume(null);
    setOptimizedResume(null);
    setCoverLetter(null);
    setJobDetails(null);
    setUploadMode('choose');
    setCoverLetters([]);
  };

  const handleReoptimize = async () => {
    if (!uploadedResume?.id || !jobDetails) {
      toast({
        title: "Error",
        description: "Missing required information for optimization",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsOptimizing(true);
      const nextVersion = Number((optimizationVersion + 0.1).toFixed(1));

      const optimizationData = {
        jobDetails,
        version: nextVersion
      };

      const response = await apiRequest(
        "POST",
        `/api/uploaded-resumes/${uploadedResume.id}/optimize`,
        optimizationData
      );

      if (!response.ok) {
        throw new Error('Failed to reoptimize resume');
      }

      const optimizedData = await response.json();
      setOptimizedResume(optimizedData);
      setOptimizationVersion(nextVersion);

      // Invalidate queries to ensure latest data
      await queryClient.invalidateQueries({ queryKey: ['/api/optimized-resumes'] });

      toast({
        title: "Success",
        description: `Resume optimized (v${nextVersion.toFixed(1)})`,
        duration: 2000, // Set to 2 seconds
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Error",
        description: "Failed to reoptimize resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < 5 && (
    (currentStep === 1 && !!uploadedResume) ||
    (currentStep === 2 && !!jobDetails) ||
    (currentStep === 3 && !!optimizedResume) ||
    (currentStep === 4)
  );

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const nextStep = currentStep + 1;

      if (currentStep === 4 && !coverLetter) {
        setCompletedSteps(prev => Array.from(new Set([...prev, 4])));
      } else if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => Array.from(new Set([...prev, currentStep])));
      }

      setCurrentStep(nextStep);
    }
  };

  const renderNavigation = () => (
    <div className="flex justify-center mt-6 pt-6 border-t">
      <div className="space-x-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={!canGoBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={!canGoNext}
          variant="gradient"
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const formatDownloadFilename = (filename: string, jobTitle: string, version: number) => {
    const baseName = filename.substring(0, filename.lastIndexOf('.'));
    return `${baseName}_${jobTitle}_v${version.toFixed(1)}`;
  };

  const formatJobDetails = (resume: OptimizedResume | null): string => {
    if (!resume || !resume.jobDetails) return "No job details available.";
    return `Title: ${resume.jobDetails.title || 'N/A'}\nCompany: ${resume.jobDetails.company || 'N/A'}\nLocation: ${resume.jobDetails.location || 'N/A'}\nURL: ${resume.jobDetails.url || 'N/A'}\nDescription: ${resume.jobDetails.description || 'N/A'}`;
  };

  const renderStep1 = () => (
    <div className="fade-in">
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold mb-6 text-foreground/90">Choose your uploaded Resume or Upload a new one</h3>
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant={uploadMode === 'choose' ? "gradient" : "outline"}
                onClick={() => setUploadMode('choose')}
                className="w-full sm:w-auto"
              >
                <FileText className="mr-2 h-4 w-4" />
                Choose Existing
              </Button>
              <Button
                variant={uploadMode === 'upload' ? "gradient" : "outline"}
                onClick={() => setUploadMode('upload')}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload New
              </Button>
            </div>
            {uploadMode === 'choose' && resumes && resumes.length > 0 ? (
              <div className="relative z-50 w-full">
                <Select
                  value={uploadedResume?.id?.toString()}
                  onValueChange={(value) => {
                    const resume = resumes.find(r => r.id.toString() === value);
                    if (resume) {
                      setUploadedResume(resume);
                      setCompletedSteps(prev => [...prev, 1]);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a resume" />
                  </SelectTrigger>
                  <SelectContent
                    className="absolute w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]"
                  >
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id.toString()}>
                        {resume.metadata.filename}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : uploadMode === 'choose' ? (
              <div className="text-center py-6 bg-muted/30 rounded-lg">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-3">No resumes uploaded yet</p>
                <Button
                  variant="link"
                  onClick={() => setUploadMode('upload')}
                  className="text-primary"
                >
                  Upload your first resume
                </Button>
              </div>
            ) : null}

            {uploadMode === 'upload' && (
              <UploadForm onSuccess={handleResumeUploaded} />
            )}
          </div>
          {renderNavigation()}
        </CardContent>
      </Card>
    </div>
  );

  const renderStep2 = () => uploadedResume ? (
    <div className="fade-in">
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
        <CardContent className="p-8">
          <JobInput
            resumeId={uploadedResume.id}
            onOptimized={handleOptimizationComplete}
            initialJobDetails={jobDetails}
          />
          {renderNavigation()}
        </CardContent>
      </Card>
    </div>
  ) : null;

  const renderStep3 = () => optimizedResume ? (
    <div className="fade-in">
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
        <CardContent className="p-8">
          <div id="optimized-preview">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground/90">Preview</h3>
            </div>
            <Preview
              resume={optimizedResume}
            />
          </div>
          {renderNavigation()}
        </CardContent>
      </Card>
    </div>
  ) : null;

  const renderStep4 = () => optimizedResume ? (
    <div className="fade-in">
      <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
        <CardContent className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-foreground/90">Cover Letter Generator</h3>
            {!coverLetter && (
              <Button
                variant="outline"
                onClick={handleNext}
                className="text-muted-foreground"
              >
                Skip Cover Letter
              </Button>
            )}
          </div>
          {!coverLetter ? (
            <CoverLetter
              resume={optimizedResume}
              onGenerated={handleCoverLetterGenerated}
              generatedCoverLetter={coverLetter}
            />
          ) : (
            <div className="mt-6 space-y-8">
              <div className="bg-muted/30 rounded-lg p-8 transition-all duration-300 hover:bg-muted/40">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="font-semibold text-foreground/90">
                    Preview {coverLetters?.find(
                      (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                    )?.metadata.version ? `(v${coverLetters.find(
                      (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                    )?.metadata.version.toFixed(1)})` : `(v${coverLetterVersion.toFixed(1)})`}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={handleRegenerateCoverLetter}
                      variant="default"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      disabled={isGeneratingCoverLetter}
                    >
                      {isGeneratingCoverLetter ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Regenerate Cover Letter
                        </>
                      )}
                    </Button>
                    {coverLetters.length <= 1 && (
                      <Button
                        onClick={() => {
                          if (coverLetter) {
                            window.location.href = `/api/cover-letter/${coverLetter.id}/download?filename=${
                              formatDownloadFilename(
                                coverLetter.metadata.filename,
                                optimizedResume.jobDetails?.title || '',
                                coverLetter.metadata.version
                              )
                            }_cover.pdf`;
                          }
                        }}
                        variant="outline"
                        className="transition-all duration-300 hover:bg-primary/10"
                      >
                        Download Cover Letter
                      </Button>
                    )}
                  </div>
                </div>
                {coverLetters && coverLetters.length > 1 && (
                  <div className="mb-6">
                    <Select
                      value={selectedCoverLetterVersion}
                      onValueChange={setSelectedCoverLetterVersion}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {coverLetters.map((letter) => (
                          <SelectItem
                            key={letter.metadata.version}
                            value={letter.metadata.version.toString()}
                          >
                            Version {letter.metadata.version.toFixed(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="prose prose-sm max-w-none text-foreground/80">
                  <pre className="whitespace-pre-wrap">
                    {coverLetters?.find(
                      (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                    )?.content || coverLetter.content}
                  </pre>
                </div>
              </div>
              {coverLetters && coverLetters.length > 1 && (
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      const selectedLetter = coverLetters.find(
                        (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                      );
                      if (selectedLetter) {
                        window.location.href = `/api/cover-letter/${selectedLetter.id}/download`;
                      }
                    }}
                    variant="outline"
                    className="transition-all duration-300 hover:bg-primary/10"
                  >
                    Download Version {selectedCoverLetterVersion}
                  </Button>
                </div>
              )}
            </div>
          )}
          {renderNavigation()}
        </CardContent>
      </Card>

      <LoadingDialog
        open={isGeneratingCoverLetter}
        title="Generating Cover Letter"
        description="Please wait while we generate your cover letter using AI..."
        onOpenChange={setIsGeneratingCoverLetter}
      />
    </div>
  ) : null;


  const renderStep5 = () => (
    <div>Step 5</div>
  );

  const renderReviewStep5 = () => {
    // Show loading state while fetching review data
    if (isLoadingReview) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading optimization session...</p>
          </div>
        </div>
      );
    }

    // Show error state if review mode loading failed
    if (reviewLoadError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
            <p className="text-muted-foreground">{reviewLoadError}</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/optimized-resumes'}
            >
              Return to Optimized Resumes
            </Button>
          </div>
        </div>
      );
    }

    // Render review content
    if (!optimizedResume || !uploadedResume) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive" />
            <p className="text-muted-foreground">Unable to load optimization session</p>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/optimized-resumes'}
            >
              Return to Optimized Resumes
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="fade-in space-y-8">
        <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              Optimization Review
            </h2>
            <div className="space-y-12">
              {/* Resume Preview */}
              <div>
                <h3 className="text-xl font-semibold mb-6 text-foreground/90">
                  Optimized Resume
                </h3>
                <Preview resume={optimizedResume} />
              </div>

              {/* Cover Letter (if available) */}
              {coverLetter && (
                <div>
                  <h3 className="text-xl font-semibold mb-6 text-foreground/90">
                    Cover Letter
                  </h3>
                  <div className="bg-muted/30 rounded-lg p-8">
                    <pre className="whitespace-pre-wrap text-sm text-foreground/80">
                      {coverLetter.content}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStep = (step: number) => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      case 5:
        if (isReviewMode) {
          return renderReviewStep5();
        }
        return renderStep5();
      default:
        return null;
    }
  };

  const [sessionId] = useState(() => Math.floor(Math.random() * 1000000).toString());
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCancel = () => {
    setIsOptimizing(false);
    //Add any other cancellation logic here if needed.
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 lg:pl-24">
      <motion.div
        initial={{ opacity: 0, y: showWelcome ? 40 : 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: showWelcome ? 2.4 : 0 }}
        className="space-y-8"
      >
        {!isReviewMode && (
          <div className="text-center transition-all duration-500 ease-in-out">
            <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/50 bg-clip-text text-transparent">
              {proverb}
            </h2>
          </div>
        )}
        <StepTracker
          steps={steps}
          currentStep={currentStep}
          completedSteps={isReviewMode ? [1, 2, 3, 4, 5] : completedSteps}
        />
        {renderStep(currentStep)}
      </motion.div>
      {!isReviewMode && showWelcome && (
        <WelcomeAnimation
          onAnimationComplete={() => setShowWelcome(false)}
          text={`Welcome back, ${user?.name || 'Anonymous User'}!`}
        />
      )}
      {isReviewMode && renderStep(currentStep)}
      <LoadingDialog
        open={isOptimizing}
        title="Optimizing Resume"
        description="Please wait while we optimize your resume using AI..."
        onOpenChange={(open) => {
          if (!open && isOptimizing) {
            handleCancel();
          }
        }}
      />
    </div>
  );
}