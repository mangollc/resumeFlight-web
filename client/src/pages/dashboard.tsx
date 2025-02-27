import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { WelcomeAnimation } from "@/components/ui/welcome-animation";
import { type UploadedResume, type OptimizedResume, type CoverLetter } from "@shared/schema";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import { Step } from "@/components/resume/step-tracker";
import ResumeStepTracker from "@/components/resume/step-tracker";
import { CoverLetterComponent } from "@/components/resume/CoverLetter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FileText, Upload, ArrowLeft, ArrowRight, RefreshCw, Loader2, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ResumeMetricsComparison } from "@/components/resume/ResumeMetricsComparison";
import DownloadOptions from "@/components/resume/DownloadOptions";


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
    title: "Summary",
    description: "Review all optimized documents"
  }
];

export type JobDetails = {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  salary?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
};

const optimizationSteps = [
  {
    id: "analyze",
    label: "Analyzing resume content",
    status: "pending"
  },
  {
    id: "keywords",
    label: "Extracting keywords and skills",
    status: "pending"
  },
  {
    id: "matching",
    label: "Matching with job requirements",
    status: "pending"
  },
  {
    id: "optimize",
    label: "Optimizing content and format",
    status: "pending"
  }
];

const coverLetterSteps = [
  {
    id: "analyze_resume",
    label: "Analyzing resume and job details",
    status: "pending"
  },
  {
    id: "draft",
    label: "Drafting personalized content",
    status: "pending"
  },
  {
    id: "format",
    label: "Formatting and finalizing",
    status: "pending"
  }
];

type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "loading" | "completed" | "error";
  score?: number;
};

const INITIAL_STEPS: ProgressStep[] = [
  { id: "analyze", label: "Analyzing Resume", status: "pending" },
  { id: "keywords", label: "Matching Keywords", status: "pending" },
  { id: "matching", label: "Calculating Match Score", status: "pending" },
  { id: "optimize", label: "Optimizing Content", status: "pending" }
];


export default function Dashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Initialize all state variables
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [optimizationVersion, setOptimizationVersion] = useState('1.0');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isComparingResumes, setIsComparingResumes] = useState(false);
  const [coverLetterVersion, setCoverLetterVersion] = useState('1.0');
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [selectedCoverLetterVersion, setSelectedCoverLetterVersion] = useState<string>("");
  const [coverLetters, setCoverLetters] = useState<CoverLetterType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [proverb, setProverb] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [currentOptimizationSteps, setCurrentOptimizationSteps] = useState<ProgressStep[]>(
    optimizationSteps.map(step => ({ ...step, status: "pending" as const }))
  );

  const [currentCoverLetterSteps, setCurrentCoverLetterSteps] = useState<ProgressStep[]>(
    coverLetterSteps.map(step => ({ ...step, status: "pending" as const }))
  );

  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [optimizedResumeData, setOptimizedResumeData] = useState<OptimizedResume[]>([]);
  const [optimizedResumeVersion, setOptimizedResumeVersion] = useState<string>("");

  // Welcome animation effect
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * jobProverbs.length);
    setProverb(jobProverbs[randomIndex]);
  }, []);

  useEffect(() => {
    if (currentStep === 1) {
      setShowWelcome(true);
      const timer = setTimeout(() => {
        setShowWelcome(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);


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

  // Update version increment logic
  const incrementVersion = (currentVersion: string): string => {
    const [major, minor] = currentVersion.split('.').map(Number);
    return `${major}.${minor + 1}`;
  };

  const handleOptimizationComplete = (resume: OptimizedResume, details: JobDetails) => {
    setOptimizedResume(resume);
    setOptimizedResumeData([resume]);
    setJobDetails(details);
    if (!completedSteps.includes(2)) {
      setCompletedSteps(prev => [...prev, 2]);
    }
    setOptimizationVersion(prev => incrementVersion(prev));
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
      // Calculate next version by incrementing the highest existing version
      const highestVersion = Math.max(...coverLetters.map(l =>
        parseFloat(l.metadata.version)
      ), 0);
      const nextVersion = `${Math.floor(highestVersion)}.${(highestVersion % 1 * 10 + 1).toFixed(0)}`;
      setCoverLetterVersion(nextVersion);

      // Reset cover letter steps
      setCurrentCoverLetterSteps(coverLetterSteps.map(step => ({ ...step, status: "pending" })));

      // Simulate progress through cover letter steps
      const updateStep = (stepId: string, status: "loading" | "completed") => {
        setCurrentCoverLetterSteps(prev =>
          prev.map(step =>
            step.id === stepId
              ? { ...step, status }
              : step
          )
        );
      };

      // Start analysis
      updateStep("analyze_resume", "loading");
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateStep("analyze_resume", "completed");

      // Draft content
      updateStep("draft", "loading");
      await new Promise(resolve => setTimeout(resolve, 2000));
      updateStep("draft", "completed");

      // Format and finalize
      updateStep("format", "loading");

      const response = await apiRequest(
        "POST",
        `/api/optimized-resume/${optimizedResume.id}/cover-letter`,
        {
          version: parseFloat(nextVersion),
          contactInfo: optimizedResume.contactInfo
        }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate cover letter');
      }

      const data = await response.json();
      handleCoverLetterGenerated(data);

      updateStep("format", "completed");

      toast({
        title: "Success",
        description: `Cover letter regenerated (v${nextVersion})`,
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate cover letter",
        variant: "destructive",
      });

      // Mark remaining steps as error
      setCurrentCoverLetterSteps(prev =>
        prev.map(step =>
          step.status === "pending" || step.status === "loading"
            ? { ...step, status: "error" }
            : step
        )
      );
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  };

  const handleDownload = async (resumeId: string) => {
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
      a.download = optimizedResume?.metadata.filename || 'resume.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({
        title: "Success",
        description: "Resume downloaded successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCoverLetter = async (version: string) => {
    if (!optimizedResume?.id) return;

    try {
      setIsDownloading(true);
      const selectedLetter = coverLetters.find(letter => 
        letter.metadata.version.toString() === version
      );

      if (!selectedLetter) {
        throw new Error('Cover letter not found');
      }

      const response = await fetch(`/api/optimized-resume/${optimizedResume.id}/cover-letter/${selectedLetter.id}/download`);
      if (!response.ok) {
        throw new Error('Failed to download cover letter');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover_letter_v${version}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Cover letter downloaded successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
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

  async function handleReoptimize() {
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
      const nextVersion = incrementVersion(optimizationVersion);

      // Reset optimization steps
      setCurrentOptimizationSteps(optimizationSteps.map(step => ({ ...step, status: "pending" })));

      // Simulate progress through optimization steps
      const updateStep = (stepId: string, status: "loading" | "completed" | "error") => {
        setCurrentOptimizationSteps(prev =>
          prev.map(step =>
            step.id === stepId
              ? { ...step, status }
              : step
          )
        );
      };

      // Start analysis
      updateStep("analyze", "loading");

      // Create a properly formatted optimization request with scoring
      const optimizationData = {
        jobDetails: jobDetails,
        version: nextVersion,
        includeScoring: true
      };

      const steps = [...INITIAL_STEPS];
      steps.forEach((step, index) => {
        setTimeout(() => {
          updateStep(step.id, "loading");
        }, index * 1000);
      });

      // Make the optimization request
      const response = await apiRequest(
        "POST",
        `/api/uploaded-resumes/${uploadedResume.id}/optimize`,
        optimizationData
      );

      if (!response.ok) {
        throw new Error('Failed to reoptimize resume');
      }

      // Mark steps as completed after successful response
      ["analyze", "keywords", "matching", "optimize"].forEach(stepId => {
        updateStep(stepId, "completed");
      });

      const optimizedData = await response.json();
      setOptimizedResume(optimizedData);
      setOptimizedResumeData([optimizedData]);
      setOptimizationVersion(nextVersion);

      // Invalidate queries to ensure latest data
      await queryClient.invalidateQueries({ queryKey: ['/api/optimized-resumes'] });

      toast({
        title: "Success",
        description: `Resume optimized (v${nextVersion})`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Error",
        description: "Failed to reoptimize resume. Please try again.",
        variant: "destructive",
      });

      // Mark remaining steps as error
      setCurrentOptimizationSteps(prev =>
        prev.map(step =>
          step.status === "pending" || step.status === "loading"
            ? { ...step, status: "error" }
            : step
        )
      );
    } finally {
      setIsOptimizing(false);
    }
  }

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
      window.scrollTo({ top: 0, behavior: "smooth" }); // Scroll to top after next
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

  const renderOptimizedContent = () => {
    if (!optimizedResume) return null;

    return (
      <div className="space-y-6">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Optimized Resume</h3>
            <DownloadOptions documentId={optimizedResume.id} documentType="resume" /> {/* Added DownloadOptions */}
          </div>
          <Preview resume={optimizedResume} showMetrics={true} />
        </div>
        {coverLetter && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Cover Letter</h3>
              <DownloadOptions documentId={coverLetter.id} documentType="cover-letter" /> {/* Added DownloadOptions */}
            </div>
            <CoverLetterComponent coverLetter={coverLetter} />
          </div>
        )}
      </div>
    );
  };

  const renderCurrentStep = () => {
    const commonCardProps = {
      className: "border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95"
    };

    switch (currentStep) {
      case 1:
        return (
          <div className="fade-in">
            <Card {...commonCardProps}>
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
                          }
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a resume" />
                        </SelectTrigger>
                        <SelectContent>
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
                  {/* Job Details Display Section */}
                  {(optimizedResume?.jobDetails || jobDetails) && (
                    <div className="mt-6 p-4 rounded-lg border bg-card">
                      <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium">Title</p>
                          <p className="text-muted-foreground">
                            {optimizedResume?.jobDetails?.title || jobDetails?.title}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Company</p>
                          <p className="text-muted-foreground">
                            {optimizedResume?.jobDetails?.company || jobDetails?.company}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-muted-foreground">
                            {optimizedResume?.jobDetails?.location || jobDetails?.location}
                          </p>
                        </div>
                        {(optimizedResume?.jobDetails?.salary || jobDetails?.salary) && (
                          <div>
                            <p className="font-medium">Salary</p>
                            <p className="text-muted-foreground">
                              {optimizedResume?.jobDetails?.salary || jobDetails?.salary}
                            </p>
                          </div>
                        )}
                        {(optimizedResume?.jobDetails?.positionLevel || jobDetails?.positionLevel) && (
                          <div>
                            <p className="font-medium">Position Level</p>
                            <p className="text-muted-foreground">
                              {optimizedResume?.jobDetails?.positionLevel || jobDetails?.positionLevel}
                            </p>
                          </div>
                        )}
                        {((optimizedResume?.jobDetails?.keyRequirements || jobDetails?.keyRequirements)?.length > 0) && (
                          <div>
                            <p className="font-medium">Key Requirements</p>
                            <ul className="list-disc list-inside text-muted-foreground">
                              {(optimizedResume?.jobDetails?.keyRequirements || jobDetails?.keyRequirements)?.map((req, index) => (
                                <li key={index}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {((optimizedResume?.jobDetails?.skillsAndTools || jobDetails?.skillsAndTools)?.length > 0) && (
                          <div>
                            <p className="font-medium">Skills & Tools</p>
                            <div className="flex flex-wrap gap-2">
                              {(optimizedResume?.jobDetails?.skillsAndTools || jobDetails?.skillsAndTools)?.map((skill, index) => (
                                <span key={index} className="px-2 py-1 bg-primary/10 rounded-md text-sm">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {optimizedResume?.jobDetails && (
                    <div className="mt-6 p-4 rounded-lg border bg-card">
                      <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium">Title</p>
                          <p className="text-muted-foreground">{optimizedResume.jobDetails.title}</p>
                        </div>
                        <div>
                          <p className="font-medium">Company</p>
                          <p className="text-muted-foreground">{optimizedResume.jobDetails.company}</p>
                        </div>
                        <div>
                          <p className="font-medium">Location</p>
                          <p className="text-muted-foreground">{optimizedResume.jobDetails.location}</p>
                        </div>
                        {optimizedResume.jobDetails.salary && (
                          <div>
                            <p className="font-medium">Salary</p>
                            <p className="text-muted-foreground">{optimizedResume.jobDetails.salary}</p>
                          </div>
                        )}
                        {optimizedResume.jobDetails.positionLevel && (
                          <div>
                            <p className="font-medium">Position Level</p>
                            <p className="text-muted-foreground">{optimizedResume.jobDetails.positionLevel}</p>
                          </div>
                        )}
                        {optimizedResume.jobDetails.keyRequirements && optimizedResume.jobDetails.keyRequirements.length > 0 && (
                          <div>
                            <p className="font-medium">Key Requirements</p>
                            <ul className="list-disclist-inside text-muted-foreground">
                              {optimizedResume.jobDetails.keyRequirements.map((req, index) => (
                                <li key={index}>{req}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {optimizedResume.jobDetails.skillsAndTools && optimizedResume.jobDetails.skillsAndTools.length > 0 && (
                          <div>
                            <p className="font-medium">Skills & Tools</p>
                            <div className="flex flex-wrap gap-2">
                              {optimizedResume.jobDetails.skillsAndTools.map((skill, index) => (
                                <span key={index} className="px-2 py-1 bg-primary/10 rounded-md text-sm">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>)}

                </div>
                {renderNavigation()}
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return uploadedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-8">
                <JobInput
                  resumeId={uploadedResume.id}
                  onOptimized={handleOptimizationComplete}
                  initialJobDetails={jobDetails}
                />                {renderNavigation()}
              </CardContent>
            </Card>
          </div>
        ) : null;
      case 3:
        return optimizedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-8">
                <div id="optimized-preview" className="space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-foreground/90">Resume Analysis</h3>
                  </div>
                  <ResumeMetricsComparison
                    metrics={optimizedResume.metrics}
                    analysis={optimizedResume.analysis}
                  />
                  <div className="pt-4">
                    <h3 className="text-xl font-semibold text-foreground/90 mb-6">Optimized Resume</h3>
                    <Preview
                      resume={optimizedResume}
                      showMetrics={false}
                    />
                  </div>
                </div>
                {renderNavigation()}
              </CardContent>
            </Card>
          </div>
        ) : null;

      case 4:
        return optimizedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
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
                    <CoverLetterComponent
                      resume={optimizedResume}
                      onGenerated={handleCoverLetterGenerated}
                    />
                ) : (
                  <div className="mt-6 space-y-8">
                    <CoverLetterComponent coverLetter={coverLetter} />
                  </div>
                )}
                {renderNavigation()}
              </CardContent>
            </Card>

            <LoadingDialog
              open={isGeneratingCoverLetter}
              title="Generating Cover Letter"
              description="Please wait while we generate your cover letter using AI..."
              steps={currentCoverLetterSteps}
              onOpenChange={setIsGeneratingCoverLetter}
            />
          </div>
        ) : null;

      case 5:
        return renderStep5();

      default:
        return null;
    }
  };

  const [sessionId] = useState(() => Math.floor(Math.random() * 1000000).toString());
  const [isDownloading, setIsDownloading] = useState(false);

  const handleCancel = () => {
    setIsOptimizing(false);
  };

  const { data: resumes } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
  });

  return (
    <>
        <div className="max-w-7xl mx-auto px-6 py-8 lg:pl-24">
          {/* Add Navbar here if needed */}
          <div className="min-h-screen flex flex-col">
            {proverb && (
              <div className="mb-8 mt-[-1rem] bg-primary/5 p-4 rounded-lg">
                <p className="text-center text-lg italic text-primary">{`"${proverb}"`}</p>
              </div>
            )}
            {showWelcome ? (
              <WelcomeAnimation />
            ) : (
              <div className="space-y-8">
                <ResumeStepTracker
                  steps={steps}
                  currentStep={currentStep}
                  completedSteps={completedSteps}
                />
                {renderCurrentStep()}
              </div>
            )}
          </div>
        </div>
        <LoadingDialog
          open={isOptimizing}
          title="Optimizing Resume"
          description={
            <div className="space-y-4">
              <p>Please wait while we optimize your resume using AI...</p>
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          }
          steps={currentOptimizationSteps}
          onOpenChange={(open) => {
            if (!open && isOptimizing) {
              handleCancel();
            }
          }}
        />
        <LoadingDialog
          open={isGeneratingCoverLetter}
          title="Generating Cover Letter"
          description="Please wait while we generate your cover letter using AI..."
          steps={currentCoverLetterSteps}
          onOpenChange={setIsGeneratingCoverLetter}
        />
    </>
  );
}

function formatDownloadFilename(filename: string, jobTitle: string, version: number): string {
  const baseFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  const formattedJobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(); // Sanitize job title for filename
  return `${baseFilename}_${formattedJobTitle}_v${version.toFixed(1)}`;
}

const renderStep5 = () => {
    // Resume selection
    const optimizedResumes = optimizedResumeData || [];

    // Initially select the latest version
    useEffect(() => {
      if (optimizedResumes.length > 0 && !optimizedResumeVersion) {
        const latestVersion = optimizedResumes.reduce((latest, resume) => {
          const version = resume.metadata?.version || 0;
          return version > latest ? version : latest;
        }, 0);

        setOptimizedResumeVersion(latestVersion.toString());
      }
    }, [optimizedResumes, optimizedResumeVersion]);

    // Find the selected resume
    const selectedResume = optimizedResumeVersion 
      ? optimizedResumes.find(r => r.metadata?.version.toString() === optimizedResumeVersion)
      : optimizedResumes[0];

    // Cover letter selection
    const [coverLetterVersion, setCoverLetterVersion] = useState<string>("");

    // Initially select the latest version
    useEffect(() => {
      if (coverLetters.length > 0 && !coverLetterVersion) {
        const latestVersion = coverLetters.reduce((latest, letter) => {
          const version = letter.metadata?.version || 0;
          return version > latest ? version : latest;
        }, 0);

        setCoverLetterVersion(latestVersion.toString());
      }
    }, [coverLetters, coverLetterVersion]);

    // Find the selected cover letter
    const selectedCoverLetter = coverLetterVersion
      ? coverLetters.find(l => l.metadata?.version.toString() === coverLetterVersion)
      : coverLetters[0];

    return (
      <>
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Your Optimized Documents</h2>
            <p className="text-muted-foreground">
              Your personalized resume and cover letter are ready to download in your preferred format.
            </p>
          </div>

          {optimizedResumes.length === 0 ? (
            <div className="text-center py-6 border rounded-lg">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No optimized documents available yet</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Please complete the previous steps to generate your job-optimized documents
              </p>
            </div>
          ) : (
            <>
              {/* Document Selection and Preview Cards */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Resume Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle>Optimized Resume</CardTitle>
                      {selectedResume && (
                        <DownloadOptions 
                          documentId={selectedResume.id} 
                          documentType="resume" 
                        />
                      )}
                    </div>
                    {optimizedResumes.length > 0 && (
                      <div className="mt-2">
                        <Select 
                          value={optimizedResumeVersion} 
                          onValueChange={setOptimizedResumeVersion}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            {optimizedResumes.map((resume) => (
                              <SelectItem 
                                key={resume.id} 
                                value={resume.metadata.version.toString()}
                              >
                                Version {resume.metadata.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 max-h-[500px] overflow-auto">
                    {selectedResume ? (
                      <div className="p-4">
                        <div className="border p-4 rounded bg-white">
                          <div className="whitespace-pre-wrap font-serif text-sm">
                            {selectedResume.content.substring(0, 500)}...
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No resume selected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cover Letter Card */}
                <Card className="overflow-hidden">
                  <CardHeader className="bg-muted/30 pb-4">
                    <div className="flex justify-between items-center">
                      <CardTitle>Cover Letter</CardTitle>
                      {selectedCoverLetter && (
                        <DownloadOptions 
                          documentId={selectedCoverLetter.id} 
                          documentType="cover-letter" 
                        />
                      )}
                    </div>
                    {coverLetters.length > 0 && (
                      <div className="mt-2">
                        <Select 
                          value={coverLetterVersion} 
                          onValueChange={setCoverLetterVersion}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select version" />
                          </SelectTrigger>
                          <SelectContent>
                            {coverLetters.map((letter) => (
                              <SelectItem 
                                key={letter.id} 
                                value={letter.metadata.version.toString()}
                              >
                                Version {letter.metadata.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0 max-h-[500px] overflow-auto">
                    {selectedCoverLetter ? (
                      <div className="p-4">
                        <div className="border p-4 rounded bg-white">
                          <div className="whitespace-pre-wrap font-serif text-sm">
                            {selectedCoverLetter.content.substring(0, 500)}...
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                        <p className="mt-2 text-muted-foreground">No cover letter selected</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Download Package Option */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Download Complete Package</CardTitle>
                  <CardDescription>
                    Get both your optimized resume and cover letter together in a single download
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button 
                    onClick={handleDownloadPackage}
                    className="w-full"
                    variant="outline"
                    disabled={isDownloading || !selectedResume || !selectedCoverLetter}
                  >
                    {isDownloading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="mr-2 h-4 w-4" />
                    )}
                    Download Complete Package
                  </Button>
                </CardFooter>
              </Card>

              {/* Navigation */}
              <div className="mt-8 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={() => router.push('/optimized-resumes')}
                >
                  Save & Go to All Documents
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </div>
        <LoadingDialog
          open={isOptimizing}
          title="Optimizing Resume"
          description={
            <div className="space-y-4">
              <p>Please wait while we optimize your resume using AI...</p>
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            </div>
          }
          steps={currentOptimizationSteps}
          onOpenChange={(open) => {
            if (!open && isOptimizing) {
              handleCancel();
            }
          }}
        />
        <LoadingDialog
          open={isGeneratingCoverLetter}
          title="Generating Cover Letter"
          description="Please wait while we generate your cover letter using AI..."
          steps={currentCoverLetterSteps}
          onOpenChange={setIsGeneratingCoverLetter}
        />
      </>
    );
  }