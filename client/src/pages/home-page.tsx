import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import CoverLetterComponent from "@/components/resume/cover-letter";
import { useQuery } from "@tanstack/react-query";
import { Resume } from "@shared/schema";
import { LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resume"],
  });

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            <section className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Step 1: Upload Resume</h2>
              <UploadForm onSuccess={setSelectedResume} />
            </section>

            {selectedResume && (
              <section className="bg-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Step 2: Add Job Details</h2>
                <JobInput resumeId={selectedResume.id} onOptimized={setSelectedResume} />
              </section>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <section className="bg-card rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <Preview resume={selectedResume} />
            </section>
            {selectedResume && (
              <section className="bg-card rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Cover Letter</h2>
                <CoverLetterComponent resume={selectedResume} />
              </section>
            )}
          </div>
        </div>

        {/* Previous Resumes Section */}
        {resumes && resumes.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Previous Resumes</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setSelectedResume(resume)}
                >
                  <p className="font-medium truncate">{resume.metadata.filename}</p>
                  <p className="text-sm text-muted-foreground">
                    Uploaded: {new Date(resume.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}