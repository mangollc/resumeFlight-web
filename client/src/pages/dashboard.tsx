import { useState } from "react";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { type UploadedResume, type OptimizedResume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    title: "Review Optimization",
    description: "Review your AI-optimized resume"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  },
  {
    id: 5,
    title: "Download Package",
    description: "Download your optimized resume and cover letter"
  }
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [hasCoverLetter, setHasCoverLetter] = useState(false);

  const handleResumeUploaded = (resume: UploadedResume) => {
    setUploadedResume(resume);
    setCompletedSteps(prev => [...prev, 1]);
    setCurrentStep(2);
  };

  const handleOptimizationComplete = (resume: OptimizedResume) => {
    setOptimizedResume(resume);
    setCompletedSteps(prev => [...prev, 2, 3]);
    setCurrentStep(4);
  };

  const handleCoverLetterGenerated = () => {
    setHasCoverLetter(true);
    setCompletedSteps(prev => [...prev, 4]);
    setCurrentStep(5);
  };

  const renderCurrentStep = () => {
    const commonCardProps = {
      className: "border-2 border-primary/10 shadow-md hover:shadow-lg transition-shadow"
    };

    switch (currentStep) {
      case 1:
        return (
          <div className="mt-12 transition-all duration-500 ease-in-out">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <UploadForm onSuccess={handleResumeUploaded} />
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return uploadedResume ? (
          <div className="mt-12 space-y-8 transition-all duration-500 ease-in-out">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Current Resume</h3>
                <Preview resume={uploadedResume} />
              </CardContent>
            </Card>
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Enter Job Details</h3>
                <JobInput 
                  resumeId={uploadedResume.id} 
                  onOptimized={handleOptimizationComplete}
                />
              </CardContent>
            </Card>
          </div>
        ) : null;
      case 3:
        return optimizedResume ? (
          <div className="mt-12 transition-all duration-500 ease-in-out">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Optimized Resume Preview</h3>
                <Preview resume={optimizedResume} />
              </CardContent>
            </Card>
          </div>
        ) : null;
      case 4:
        return optimizedResume ? (
          <div className="mt-12 transition-all duration-500 ease-in-out">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold mb-4">Generate Cover Letter</h3>
                <CoverLetter 
                  resume={optimizedResume}
                  onGenerated={handleCoverLetterGenerated}
                />
              </CardContent>
            </Card>
          </div>
        ) : null;
      case 5:
        return optimizedResume ? (
          <div className="mt-12 space-y-8 transition-all duration-500 ease-in-out">
            <Card {...commonCardProps}>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Application Package Summary</h2>
                <div className="space-y-8">
                  {/* Optimized Resume Section */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Optimized Resume</h3>
                    <Preview resume={optimizedResume} />
                  </div>

                  {/* Cover Letter Section */}
                  {hasCoverLetter && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4">Cover Letter</h3>
                      <CoverLetter 
                        resume={optimizedResume}
                        onGenerated={() => {}}
                        readOnly
                      />
                    </div>
                  )}

                  {/* Download Options */}
                  <div className="border-t pt-6">
                    <h3 className="text-xl font-semibold mb-4">Download Options</h3>
                    <div className="flex flex-wrap gap-4">
                      <Button size="lg" className="bg-primary hover:bg-primary/90">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume (PDF)
                      </Button>
                      {hasCoverLetter && (
                        <Button size="lg" variant="outline" className="border-primary hover:bg-primary/10">
                          <FileText className="h-4 w-4 mr-2" />
                          Download Cover Letter (PDF)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Resume Optimization
        </h1>
        <p className="text-muted-foreground">
          Transform your resume with AI-powered insights
        </p>
      </div>

      {/* Step Tracker */}
      <StepTracker
        currentStep={currentStep}
        steps={steps}
        completedSteps={completedSteps}
      />

      {/* Content Area */}
      <div className="min-h-[400px]">
        {renderCurrentStep()}
      </div>
    </div>
  );
}