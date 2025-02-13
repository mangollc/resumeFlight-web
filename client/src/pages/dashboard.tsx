import { useState } from "react";
import StepTracker, { Step } from "@/components/resume/step-tracker";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { type UploadedResume, type OptimizedResume } from "@shared/schema";

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
    description: "Review and download your optimized resume"
  },
  {
    id: 4,
    title: "Cover Letter",
    description: "Generate a matching cover letter"
  }
];

export default function Dashboard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);

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
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="mt-8">
            <UploadForm onUploadComplete={handleResumeUploaded} />
          </div>
        );
      case 2:
        return uploadedResume ? (
          <div className="mt-8 space-y-8">
            <Preview resume={uploadedResume} />
            <JobInput 
              uploadedResumeId={uploadedResume.id} 
              onOptimizationComplete={handleOptimizationComplete}
            />
          </div>
        ) : null;
      case 3:
        return optimizedResume ? (
          <div className="mt-8">
            <Preview resume={optimizedResume} />
          </div>
        ) : null;
      case 4:
        return optimizedResume ? (
          <div className="mt-8">
            <CoverLetter 
              optimizedResumeId={optimizedResume.id}
              onGenerated={handleCoverLetterGenerated}
            />
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
