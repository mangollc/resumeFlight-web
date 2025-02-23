import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SummarySectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetterType;
  versions: string[];
}

export function SummarySection({ optimizedResume, coverLetter, versions }: SummarySectionProps) {
  const { toast } = useToast();
  const [selectedResumeVersion, setSelectedResumeVersion] = useState(versions[0]);
  const [selectedCoverLetterVersion, setSelectedCoverLetterVersion] = useState(versions[0]);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [isDownloadingCoverLetter, setIsDownloadingCoverLetter] = useState(false);

  const handleDownloadResume = async () => {
    try {
      setIsDownloadingResume(true);
      const response = await fetch(
        `/api/optimized-resume/${optimizedResume.id}/download?format=${selectedFormat}&version=${selectedResumeVersion}`
      );

      if (!response.ok) {
        throw new Error('Failed to download resume');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `resume_v${selectedResumeVersion}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Resume downloaded successfully as ${selectedFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const handleDownloadCoverLetter = async () => {
    if (!coverLetter) return;

    try {
      setIsDownloadingCoverLetter(true);
      const response = await fetch(
        `/api/cover-letter/${coverLetter.id}/download?format=${selectedFormat}&version=${selectedCoverLetterVersion}`
      );

      if (!response.ok) {
        throw new Error('Failed to download cover letter');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover_letter_v${selectedCoverLetterVersion}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Cover letter downloaded successfully as ${selectedFormat.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter",
        variant: "destructive",
      });
    } finally {
      setIsDownloadingCoverLetter(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-lg p-6 border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Summary</h2>
          <p className="text-muted-foreground">Review your optimized documents</p>
        </div>

        {/* Optimized Resume Versions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Optimized Resume</h3>
            <div className="flex items-center gap-2">
              <Select value={selectedResumeVersion} onValueChange={setSelectedResumeVersion}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((version) => (
                    <SelectItem key={version} value={version}>
                      Version {version}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as "pdf" | "docx")}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">DOCX</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleDownloadResume} disabled={isDownloadingResume}>
                {isDownloadingResume ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Download
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-4">
              <Preview resume={optimizedResume} />
            </CardContent>
          </Card>
        </div>

        {/* Cover Letter Versions */}
        {coverLetter && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Cover Letter</h3>
              <div className="flex items-center gap-2">
                <Select value={selectedCoverLetterVersion} onValueChange={setSelectedCoverLetterVersion}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="Version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version} value={version}>
                        Version {version}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedFormat} onValueChange={(value) => setSelectedFormat(value as "pdf" | "docx")}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleDownloadCoverLetter} disabled={isDownloadingCoverLetter}>
                  {isDownloadingCoverLetter ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
            </div>
            <Card>
              <CardContent className="p-4">
                <CoverLetter
                  resume={optimizedResume}
                  generatedCoverLetter={coverLetter}
                  readOnly={true}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}