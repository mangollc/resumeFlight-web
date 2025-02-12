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
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">ResumeFlight</h1>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-muted-foreground">Welcome, {user?.username}</span>
              <Button variant="outline" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>

            {/* Mobile Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80vw] sm:w-[385px]">
                <div className="flex flex-col gap-4 pt-6">
                  <span className="text-muted-foreground">Welcome, {user?.username}</span>
                  <Button variant="outline" onClick={() => logoutMutation.mutate()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

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