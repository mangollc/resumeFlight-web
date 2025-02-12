import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetterComponent from "@/components/resume/cover-letter";
import { useQuery } from "@tanstack/react-query";
import { UploadedResume } from "@shared/schema";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedResume, setSelectedResume] = useState<UploadedResume | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');

  const { data: resumes, isLoading } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
  });

  const SectionTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 className={cn(
      "text-xl font-semibold mb-4",
      "bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent",
      className
    )}>
      {children}
    </h2>
  );

  return (
    <div className="min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to ResumeFlight</h1>
        <p className="text-muted-foreground">
          Optimize your resume for your dream job using AI-powered insights
        </p>
      </header>

      <div className="grid gap-6 lg:gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6 lg:space-y-8">
          <section className="bg-card rounded-lg border shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
            <SectionTitle>Step 1: Select or Upload Resume</SectionTitle>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant={uploadMode === 'choose' ? "default" : "outline"}
                  onClick={() => setUploadMode('choose')}
                  className={cn(
                    "w-full sm:w-auto",
                    uploadMode === 'choose' && "bg-primary text-primary-foreground"
                  )}
                >
                  Choose Existing
                </Button>
                <Button
                  variant={uploadMode === 'upload' ? "default" : "outline"}
                  onClick={() => setUploadMode('upload')}
                  className={cn(
                    "w-full sm:w-auto",
                    uploadMode === 'upload' && "bg-primary text-primary-foreground"
                  )}
                >
                  Upload New
                </Button>
              </div>

              {uploadMode === 'choose' && resumes && resumes.length > 0 ? (
                <Select
                  value={selectedResume?.id?.toString()}
                  onValueChange={(value) => {
                    const resume = resumes.find(r => r.id.toString() === value);
                    if (resume) setSelectedResume(resume);
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
              ) : uploadMode === 'choose' ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No resumes uploaded yet</p>
                  <Button
                    variant="link"
                    onClick={() => setUploadMode('upload')}
                    className="mt-2"
                  >
                    Upload your first resume
                  </Button>
                </div>
              ) : null}

              {uploadMode === 'upload' && (
                <UploadForm onSuccess={setSelectedResume} />
              )}
            </div>
          </section>

          {selectedResume && (
            <section className="bg-card rounded-lg border shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <SectionTitle>Step 2: Add Job Details</SectionTitle>
              <JobInput resumeId={selectedResume.id} onOptimized={setSelectedResume} />
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6 lg:space-y-8">
          <section className="bg-card rounded-lg border-2 border-primary/10 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
            <SectionTitle>Resume Preview</SectionTitle>
            <Preview resume={selectedResume} />
          </section>

          {selectedResume && (
            <section className="bg-card rounded-lg border-2 border-primary/10 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <SectionTitle>Cover Letter Generator</SectionTitle>
              <CoverLetterComponent resume={selectedResume} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}