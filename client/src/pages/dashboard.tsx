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
    title: "Optimize",
    description: "Review your optimized resume"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  },
  {
    id: 5,
    title: "Summary",
    description: "Review and download your optimized documents"
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
    setCompletedSteps(prev => [...prev, 4]);
    setHasCoverLetter(true);
    setCurrentStep(5);
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="mt-8 fade-in">
            <Card>
              <CardContent className="p-6">
                <UploadForm onSuccess={handleResumeUploaded} />
              </CardContent>
            </Card>
          </div>
        );
      case 2:
        return uploadedResume ? (
          <div className="mt-8 space-y-8 fade-in">
            <Preview resume={uploadedResume} />
            <Card>
              <CardContent className="p-6">
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
          <div className="mt-8 fade-in">
            <Preview resume={optimizedResume} />
          </div>
        ) : null;
      case 4:
        return optimizedResume ? (
          <div className="mt-8 fade-in">
            <Card>
              <CardContent className="p-6">
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
          <div className="mt-8 space-y-8 fade-in">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-6">Application Package Summary</h2>
                <div className="space-y-8">
                  {/* Optimized Resume Section */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Optimized Resume</h3>
                    <Preview resume={optimizedResume} />
                  </div>

                  {/* Cover Letter Section */}
                  {hasCoverLetter && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Cover Letter</h3>
                      <CoverLetter 
                        resume={optimizedResume}
                        onGenerated={() => {}}
                        viewOnly
                      />
                    </div>
                  )}

                  {/* Download Options */}
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Download Options</h3>
                    <div className="flex flex-wrap gap-4">
                      <Button variant="outline" size="lg">
                        <Download className="h-4 w-4 mr-2" />
                        Download Resume (PDF)
                      </Button>
                      {hasCoverLetter && (
                        <Button variant="outline" size="lg">
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
    <div className="container mx-auto px-4 py-8">
      <StepTracker
        currentStep={currentStep}
        steps={steps}
        completedSteps={completedSteps}
      />
      <div className="mt-12">
        {renderCurrentStep()}
      </div>
    </div>
  );
}