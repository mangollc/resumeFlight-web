import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { WelcomeAnimation } from "@/components/ui/welcome-animation";
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
import { UploadedResume, OptimizedResume } from "@shared/schema";
import { cn } from "@/lib/utils";
import { ArrowRight, FileText, Upload } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedResume, setSelectedResume] = useState<UploadedResume | null>(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');

  const { data: resumes, isLoading } = useQuery<UploadedResume[]>({
    queryKey: ["/api/uploaded-resumes"],
  });

  const handleOptimized = (optimized: OptimizedResume) => {
    setOptimizedResume(optimized);
  };

  const SectionTitle = ({ children, className, number }: { children: React.ReactNode; className?: string; number: number }) => (
    <div className="flex items-center gap-4 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
        {number}
      </div>
      <h2 className={cn(
        "text-fluid-h3 font-semibold",
        "bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent",
        className
      )}>
        {children}
      </h2>
    </div>
  );

  return (
    <div className="min-h-screen max-w-[1400px] mx-auto">
      <header className="mb-12">
        <WelcomeAnimation />
      </header>

      <div className="grid gap-8 lg:gap-12 lg:grid-cols-[2fr,3fr]">
        {/* Left Column - Input Section */}
        <div className="space-y-8">
          <section className="bg-card rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow">
            <SectionTitle number={1}>Select or Upload Resume</SectionTitle>
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant={uploadMode === 'choose' ? "default" : "outline"}
                  onClick={() => setUploadMode('choose')}
                  className={cn(
                    "w-full sm:w-auto",
                    uploadMode === 'choose' && "bg-primary text-primary-foreground"
                  )}
                >
                  <FileText className="mr-2 h-4 w-4" />
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
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New
                </Button>
              </div>

              {uploadMode === 'choose' && resumes && resumes.length > 0 ? (
                <div className="space-y-3">
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
                  {selectedResume && (
                    <div className="flex items-center justify-end">
                      <ArrowRight className="h-5 w-5 text-primary animate-bounce-x" />
                    </div>
                  )}
                </div>
              ) : uploadMode === 'choose' ? (
                <div className="text-center py-6 bg-muted/30 rounded-lg">
                  <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-3 text-fluid-sm">No resumes uploaded yet</p>
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
                <UploadForm onSuccess={setSelectedResume} />
              )}
            </div>
          </section>

          {selectedResume && (
            <section className="bg-card rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow">
              <SectionTitle number={2}>Add Job Details</SectionTitle>
              <JobInput resumeId={selectedResume.id} onOptimized={handleOptimized} />
            </section>
          )}
        </div>

        {/* Right Column - Preview Section */}
        <div className="space-y-8">
          <section className="bg-card rounded-xl border-2 border-primary/10 shadow-sm p-6 hover:shadow-md transition-shadow">
            <SectionTitle number={3}>Resume Preview & Analysis</SectionTitle>
            <Preview resume={optimizedResume || selectedResume} />
          </section>

          {optimizedResume && (
            <section className="bg-card rounded-xl border-2 border-primary/10 shadow-sm p-6 hover:shadow-md transition-shadow">
              <SectionTitle number={4}>Cover Letter Generator</SectionTitle>
              <CoverLetterComponent resume={optimizedResume} />
            </section>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounce-x {
          0%, 100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(10px);
          }
        }
        .animate-bounce-x {
          animation: bounce-x 1s infinite;
        }
      `}</style>
    </div>
  );
}