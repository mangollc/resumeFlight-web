import { useState } from "react";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { type UploadedResume, type OptimizedResume, type CoverLetterType } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, ArrowLeft, ArrowRight, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

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
    title: "Review",
    description: "Review your AI-optimized resume"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  },
  {
    id: 5,
    title: "Summary",
    description: "Download your optimized documents"
  }
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetterType | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');
  const [jobDetails, setJobDetails] = useState<{ url?: string, description?: string } | null>(null);

  const { data: resumes } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
  });

  const handleResumeUploaded = (resume: UploadedResume) => {
    setUploadedResume(resume);
    setCompletedSteps(prev => [...prev, 1]);
    setCurrentStep(2);
  };

  const handleOptimizationComplete = (resume: OptimizedResume, details: { url?: string, description?: string }) => {
    setOptimizedResume(resume);
    setJobDetails(details);
    setCompletedSteps(prev => [...prev, 2]);
    setCurrentStep(3);
  };

  const handleCoverLetterGenerated = (letter: CoverLetterType) => {
    setCoverLetter(letter);
    setCompletedSteps(prev => [...prev, 4]);
    setCurrentStep(5);
  };

  const canGoBack = currentStep > 1;
  const canGoNext = currentStep < 5 && (
    (currentStep === 1 && uploadedResume) ||
    (currentStep === 2 && optimizedResume) ||
    (currentStep === 3) ||
    (currentStep === 4 && coverLetter)
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

  const handleDownloadPackage = async () => {
    try {
      const response = await fetch(`/api/package/download/${optimizedResume?.id}`);
      if (!response.ok) throw new Error('Failed to download package');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'resume-package.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const renderCurrentStep = () => {
    const commonCardProps = {
      className: "border-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow w-full mx-auto"
    };

    const renderNavigation = () => (
      <div className="flex justify-between mt-6 pt-6 border-t">
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
    );

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
                    <div className="space-y-3">
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
                <h3 className="text-xl font-semibold mb-4">Optimized Resume Preview</h3>
                <Preview resume={optimizedResume} />
                {renderNavigation()}
              </CardContent>
            </Card>
          </div>
        ) : null;
      case 4:
        return optimizedResume ? (
          <div className="fade-in">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Cover Letter Generator</h3>
                <CoverLetter
                  resume={optimizedResume}
                  onGenerated={handleCoverLetterGenerated}
                  generatedCoverLetter={coverLetter}
                />
                {renderNavigation()}
              </CardContent>
            </Card>
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
                    <Preview resume={optimizedResume} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Cover Letter</h3>
                    <CoverLetter
                      resume={optimizedResume}
                      generatedCoverLetter={coverLetter}
                      readOnly
                    />
                  </div>
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">Download Options</h3>
                    <div className="flex justify-center">
                      <Button size="lg" onClick={handleDownloadPackage}>
                        <Download className="h-5 w-5 mr-2" />
                        Download Complete Package (ZIP)
                      </Button>
                    </div>
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