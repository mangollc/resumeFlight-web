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
import { Resume } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [uploadMode, setUploadMode] = useState<'choose' | 'upload'>('choose');

  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resume"],
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Optimize your resume for your dream job</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            <section className="bg-card rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Step 1: Select or Upload Resume</h2>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={uploadMode === 'choose' ? "default" : "outline"}
                    onClick={() => setUploadMode('choose')}
                  >
                    Choose Existing
                  </Button>
                  <Button
                    variant={uploadMode === 'upload' ? "default" : "outline"}
                    onClick={() => setUploadMode('upload')}
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
              <section className="bg-card rounded-lg border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Step 2: Add Job Details</h2>
                <JobInput resumeId={selectedResume.id} onOptimized={setSelectedResume} />
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="bg-card rounded-lg border shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <Preview resume={selectedResume} />
            </section>

            {selectedResume && (
              <section className="bg-card rounded-lg border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Cover Letter</h2>
                <CoverLetterComponent resume={selectedResume} />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}