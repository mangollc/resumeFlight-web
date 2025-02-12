import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import UploadForm from "@/components/resume/upload-form";
import JobInput from "@/components/resume/job-input";
import Preview from "@/components/resume/preview";
import { useQuery } from "@tanstack/react-query";
import { Resume } from "@shared/schema";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null);
  
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resume"],
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">ResumeFlight</h1>
          <div className="flex items-center gap-4">
            <span>Welcome, {user?.username}</span>
            <Button variant="outline" onClick={() => logoutMutation.mutate()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-4">Upload Resume</h2>
              <UploadForm onSuccess={setSelectedResume} />
            </section>

            {selectedResume && (
              <section>
                <h2 className="text-xl font-semibold mb-4">Job Description</h2>
                <JobInput resumeId={selectedResume.id} onOptimized={setSelectedResume} />
              </section>
            )}
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <Preview resume={selectedResume} />
          </div>
        </div>

        {resumes && resumes.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Previous Resumes</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-4 border rounded-lg cursor-pointer hover:border-primary"
                  onClick={() => setSelectedResume(resume)}
                >
                  <p className="font-medium">{resume.metadata.filename}</p>
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
