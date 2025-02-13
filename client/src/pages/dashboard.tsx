import { useState } from "react";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter, { CoverLetterType } from "@/components/resume/cover-letter";
import { type UploadedResume, type OptimizedResume } from "@shared/schema";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
    description: "Optimize your resume with AI"
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
  url?: string;
  description?: string;
  title?: string;
  company?: string;
  location?: string;
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
    setJobDetails(prev => ({ ...prev, ...details }));
    if (!completedSteps.includes(2)) {
      setCompletedSteps(prev => [...prev, 2]);
    }
    // Increment version for each optimization
    setOptimizationVersion(prev => Number((prev + 0.1).toFixed(1)));
  };

  const handleCoverLetterGenerated = (letter: CoverLetterType) => {
    setCoverLetter(letter);
    setCoverLetters(prev => [...prev, letter]); //add new letter to array.
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
      setCoverLetters(prev => [...prev, data]); // Add new version to array.

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

      // Create a FormData object to send the session data
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

      // Get the filename from the Content-Disposition header if available
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

  // Clear session data when starting over
  const handleStartOver = () => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setUploadedResume(null);
    setOptimizedResume(null);
    setCoverLetter(null);
    setJobDetails(null);
    setUploadMode('choose');
    setCoverLetters([]); // Clear cover letter versions
  };

  const handleReoptimize = async () => {
    if (!uploadedResume?.id || !jobDetails) return;

    try {
      setIsOptimizing(true); // Show loading state
      const data = {
        jobUrl: jobDetails.url,
        jobDescription: jobDetails.description,
        version: optimizationVersion + 0.1
      };

      const response = await apiRequest("POST", `/api/resume/${uploadedResume.id}/optimize`, data);
      if (!response.ok) {
        throw new Error('Failed to reoptimize resume');
      }

      const optimizedData = await response.json();
      handleOptimizationComplete(optimizedData, jobDetails);

      toast({
        title: "Success",
        description: `Resume optimized (v${optimizationVersion.toFixed(1)})`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reoptimize resume",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false); // Hide loading state
    }
  };

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < 5 && (
    (currentStep === 1 && !!uploadedResume) ||
    (currentStep === 2 && !!optimizedResume) ||
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
      setCurrentStep(prev => prev + 1);
      if (!completedSteps.includes(currentStep)) {
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
        >
          Next
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    const commonCardProps = {
      className: "border-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow w-full mx-auto relative"
    };

    const formatDownloadFilename = (filename: string, jobTitle: string, version: number) => {
      const baseName = filename.substring(0, filename.lastIndexOf('.'));
      return `${baseName}_${jobTitle}_v${version.toFixed(1)}`;
    };


    switch (currentStep) {
      case 1:
        return (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant={uploadMode === 'choose' ? "default" : "outline"}
                      onClick={() => setUploadMode('choose')}
                      className="w-full sm:w-auto"
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Choose Existing
                    </Button>
                    <Button
                      variant={uploadMode === 'upload' ? "default" : "outline"}
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
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Enter Job Details</h3>
                {jobDetails && (
                  <div className="mb-6 bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Current Job Details</h4>
                    <table className="w-full text-sm">
                      <tbody>
                        {jobDetails.url && (
                          <tr>
                            <td className="font-medium pr-4 py-1">URL:</td>
                            <td className="text-muted-foreground">{jobDetails.url}</td>
                          </tr>
                        )}
                        {jobDetails.description && (
                          <tr>
                            <td className="font-medium pr-4 py-1 align-top">Description:</td>
                            <td className="text-muted-foreground whitespace-pre-wrap">{jobDetails.description}</td>
                          </tr>
                        )}
                        {jobDetails.title && (
                          <tr>
                            <td className="font-medium pr-4 py-1">Title:</td>
                            <td className="text-muted-foreground">{jobDetails.title}</td>
                          </tr>
                        )}
                        {jobDetails.company && (
                          <tr>
                            <td className="font-medium pr-4 py-1">Company:</td>
                            <td className="text-muted-foreground">{jobDetails.company}</td>
                          </tr>
                        )}
                        {jobDetails.location && (
                          <tr>
                            <td className="font-medium pr-4 py-1">Location:</td>
                            <td className="text-muted-foreground">{jobDetails.location}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
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
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Optimized Resume Preview <span className="text-sm text-muted-foreground">(v{optimizationVersion.toFixed(1)})</span>
                </h3>
                <Preview
                  resume={optimizedResume}
                  coverLetter={coverLetter}
                />

                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={handleReoptimize}
                    variant="default"
                    className="w-auto bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    size="lg"
                    disabled={isOptimizing}
                  >
                    {isOptimizing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Optimizing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Optimize Again
                      </>
                    )}
                  </Button>
                </div>

                {renderNavigation()}
              </CardContent>
            </Card>

            <LoadingDialog
              open={isOptimizing}
              title="Reoptimizing Resume"
              description="Please wait while we optimize your resume using AI..."
            />
          </div>
        ) : null;

      case 4:
        return optimizedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Cover Letter Generator</h3>
                {!coverLetter ? (
                  <CoverLetter
                    resume={optimizedResume}
                    onGenerated={handleCoverLetterGenerated}
                    generatedCoverLetter={coverLetter}
                  />
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="bg-muted/30 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">
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
                          <Button
                            onClick={() => {
                              const selectedLetter = coverLetters.find(
                                (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                              ) || coverLetter;
                              if (selectedLetter) {
                                window.location.href = `/api/cover-letter/${selectedLetter.id}/download?filename=${
                                  formatDownloadFilename(
                                    selectedLetter.metadata.filename,
                                    optimizedResume.jobDetails?.title || '',
                                    selectedLetter.metadata.version
                                  )
                                }_cover.pdf`;
                              }
                            }}
                            variant="outline"
                          >
                            Download Cover Letter
                          </Button>
                        </div>
                      </div>
                      {coverLetters && coverLetters.length > 1 && (
                        <div className="mb-4">
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
                      <div className="prose prose-sm max-w-none">
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
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Summary</h2>
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Optimized Resume</h3>
                    <Preview
                      resume={optimizedResume}
                      coverLetter={coverLetter}
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Cover Letter</h3>
                    <div className="bg-muted/30 rounded-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">
                          Preview {coverLetters?.find(
                            (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                          )?.metadata.version ? `(v${coverLetters.find(
                            (l) => l.metadata.version.toString() === selectedCoverLetterVersion
                          )?.metadata.version.toFixed(1)})` : `(v${coverLetterVersion.toFixed(1)})`}
                        </h4>
                      </div>
                      {coverLetters && coverLetters.length > 1 && (
                        <div className="mb-4">
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
                      <div className="prose prose-sm max-w-none">
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

  const [sessionId] = useState(() => Date.now().toString()); // Used to track optimization session
  const [isDownloading, setIsDownloading] = useState(false);


  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Resume Optimization
        </h1>
        <p className="text-muted-foreground text-lg">
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
    </div>
  );
}