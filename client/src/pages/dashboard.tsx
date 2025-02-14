import { useState } from "react";
import { WelcomeAnimation } from "@/components/ui/welcome-animation";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import ComparisonView from "@/components/resume/comparison-view";
import { type UploadedResume, type OptimizedResume, type CoverLetter as CoverLetterType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, ArrowLeft, ArrowRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";


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
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterType | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');
  const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
  const [optimizationVersion, setOptimizationVersion] = useState(1.0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isComparingResumes, setIsComparingResumes] = useState(false);
  const [coverLetterVersion, setCoverLetterVersion] = useState(1.0);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [selectedCoverLetterVersion, setSelectedCoverLetterVersion] = useState<string>("");
  const [coverLetters, setCoverLetters] = useState<CoverLetterType[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);


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
    setCoverLetters(prev => [...prev, letter]);
    if (!completedSteps.includes(4)) {
      setCompletedSteps(prev => [...prev, 4]);
    }
    setSelectedCoverLetterVersion(letter.metadata.version.toString());
  };

  const handleRegenerateCoverLetter = async () => {
    if (!optimizedResume?.id) return;

    try {
      setIsGeneratingCoverLetter(true);
      const nextVersion = Number((coverLetterVersion + 0.1).toFixed(1));
      setCoverLetterVersion(nextVersion);

      const response = await apiRequest(
        "POST",
        `/api/optimized-resume/${optimizedResume.id}/cover-letter`,
        { version: nextVersion }
      );

      if (!response.ok) {
        throw new Error('Failed to regenerate cover letter');
      }

      const data = await response.json();
      setCoverLetter(data);
      setCoverLetters(prev => [...prev, data]);

      toast({
        title: "Success",
        description: `Cover letter regenerated (v${nextVersion.toFixed(1)})`,
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

      const response = await apiRequest(
        "POST",
        `/api/uploaded-resumes/${uploadedResume.id}/optimize`,
        {
          jobUrl: jobDetails.url,
          jobDescription: jobDetails.description,
          version: nextVersion,
          aiPrompt: `
I need to optimize this resume for the job description, focusing on improving the match scores across all metrics compared to version ${optimizationVersion.toFixed(1)}. Please make the following enhancements:

1. Keyword Optimization (Current: ${optimizedResume?.metrics?.after?.keywords}%):
   - Identify and incorporate more relevant industry-specific keywords from the job description
   - Align terminology with industry standards and job requirements
   - Use action verbs and power words that highlight achievements

2. Skills Enhancement (Current: ${optimizedResume?.metrics?.after?.skills}%):
   - Strengthen technical and soft skills alignment with job requirements
   - Highlight relevant certifications and tools
   - Add missing critical skills mentioned in the job posting

3. Experience Impact (Current: ${optimizedResume?.metrics?.after?.experience}%):
   - Transform bullet points to showcase measurable achievements and results
   - Quantify accomplishments with specific metrics and percentages
   - Emphasize leadership and project management experience
   - Focus on relevant experience that matches job requirements

4. Overall Optimization (Current: ${optimizedResume?.metrics?.after?.overall}%):
   - Improve formatting and readability
   - Ensure consistent professional tone
   - Highlight unique value propositions
   - Remove irrelevant information

Goals for the new version:
- Keyword score: Aim for at least ${Math.min(100, (optimizedResume?.metrics?.after?.keywords || 0) + 10)}%
- Skills score: Target minimum ${Math.min(100, (optimizedResume?.metrics?.after?.skills || 0) + 10)}%
- Experience score: Achieve at least ${Math.min(100, (optimizedResume?.metrics?.after?.experience || 0) + 10)}%
- Overall score: Reach minimum ${Math.min(100, (optimizedResume?.metrics?.after?.overall || 0) + 10)}%

While optimizing, maintain authenticity and natural language flow. Do not fabricate experience or skills.`
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reoptimize resume');
      }

      const optimizedData = await response.json();
      handleOptimizationComplete(optimizedData, jobDetails);
      setOptimizationVersion(nextVersion);

      toast({
        title: "Success",
        description: `Resume optimized (v${nextVersion})`,
      });
    } catch (error) {
      console.error('Optimization error:', error);
      toast({
        title: "Error",
        description: "Failed to reoptimize resume",
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
    (currentStep === 3) ||
    (currentStep === 4 && !!coverLetter)
  );

  const handleBack = () => {
    if (canGoBack) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);

      // For step 4 (cover letter), mark it as completed even when skipping
      if (currentStep === 4 && !coverLetter) {
        setCompletedSteps(prev => [...prev, currentStep]);
      } else if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
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

  const renderCurrentStep = () => {
    const commonCardProps = {
      className: "border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95"
    };

    const formatDownloadFilename = (filename: string, jobTitle: string, version: number) => {
      const baseName = filename.substring(0, filename.lastIndexOf('.'));
      return `${baseName}_${jobTitle}_v${version.toFixed(1)}`;
    };

    const formatJobDetails = (resume: OptimizedResume | null): string => {
      if (!resume || !resume.jobDetails) return "No job details available.";
      return `Title: ${resume.jobDetails.title || 'N/A'}\nCompany: ${resume.jobDetails.company || 'N/A'}\nLocation: ${resume.jobDetails.location || 'N/A'}\nURL: ${resume.jobDetails.url || 'N/A'}\nDescription: ${resume.jobDetails.description || 'N/A'}`;
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
      case 2:
        return uploadedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
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
      case 3:
        return optimizedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-8">
                <div id="optimized-preview">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-semibold text-foreground/90">Preview</h3>
                    {isOptimizing ? (
                      <Button disabled variant="outline">
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Optimizing...
                      </Button>
                    ) : (
                      <Button onClick={handleReoptimize} variant="default">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Optimize Again
                      </Button>
                    )}
                  </div>
                  <Preview
                    resume={optimizedResume}
                    coverLetter={coverLetter}
                    onVersionChange={(version) => {
                      // Fetch specific version data
                      fetch(`/api/optimized-resume/${optimizedResume.id}/version/${version}`)
                        .then(res => res.json())
                        .then(data => {
                          setOptimizedResume(data);
                          setOptimizationVersion(Number(version));
                        })
                        .catch(error => {
                          toast({
                            title: "Error",
                            description: "Failed to load resume version",
                            variant: "destructive",
                          });
                        });
                    }}
                  />
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
            />
          </div>
        ) : null;

      case 5:
        return optimizedResume && coverLetter ? (
          <div className="fade-in space-y-8">
            <Card {...commonCardProps}>
              <CardContent className="p-8">
                <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                  Final Review
                </h2>
                <div className="space-y-12">
                  <div>
                    <h3 className="text-xl font-semibold mb-6 text-foreground/90">
                      Preview
                    </h3>
                    <Preview
                      resume={optimizedResume}
                      coverLetter={coverLetter}
                    />
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-6 flex items-center space-x-2">
                      <span className="bg-gradient-to-r from-primary/90 to-primary/70 bg-clip-text text-transparent">
                        Cover Letter
                      </span>
                    </h3>
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
                          {coverLetters.length <= 1 ? (
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
                          ) : null}
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
                      <div className="flex justify-end mt-4">
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
                </div>
                {renderNavigation()}
              </CardContent>
            </Card>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const [sessionId] = useState(() => Date.now().toString());
  const [isDownloading, setIsDownloading] = useState(false);


  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-12">
        <WelcomeAnimation />
      </div>

      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent animate-gradient">
          Resume Optimization
        </h1>
        <p className="text-muted-foreground/90 text-lg">
          Transform your resume with AI-powered insights
        </p>
      </div>

      <div className="mb-16">
        <StepTracker
          currentStep={currentStep}
          steps={steps}
          completedSteps={completedSteps}
        />
      </div>

      <div className="mt-16">
        {renderCurrentStep()}
      </div>
      <LoadingDialog
        open={isOptimizing}
        title="Optimizing Resume"
        description="Please wait while we optimize your resume using AI..."
        onOpenChange={setIsOptimizing}
      />
    </div>
  );
}