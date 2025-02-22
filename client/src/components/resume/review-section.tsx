import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetterType;
  onDownload?: (id: string) => void;
  versions: number[]; // Added versions prop
}

export function ReviewSection({ optimizedResume, coverLetter, onDownload, versions }: ReviewSectionProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");
  const [selectedVersion, setSelectedVersion] = useState(versions[0] || 1); // Added version state
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch(`/api/optimized-resume/${optimizedResume.id}/download?format=${selectedFormat}&version=${selectedVersion}`); // Added version to URL
      if (!response.ok) {
        throw new Error('Failed to download resume');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${optimizedResume?.metadata.filename}_v${selectedVersion}.${selectedFormat}`; // Added version to filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Resume downloaded successfully",
        duration: 2000
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download resume",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card className="border-2 border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 w-full mx-auto relative bg-gradient-to-b from-card to-card/95">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold mb-8 bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
          Final Summary
        </h2>
        <div className="space-y-12">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-foreground/90">
                Optimized Resume
              </h3>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedVersion.toString()}
                  onValueChange={(value) => setSelectedVersion(Number(value))}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select version" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((version) => (
                      <SelectItem key={version} value={version.toString()}>
                        Version {version.toFixed(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={selectedFormat}
                  onValueChange={(value) => setSelectedFormat(value as "pdf" | "docx")}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="docx">DOCX</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleDownload} disabled={isDownloading}>
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Download Resume
                </Button>
              </div>
            </div>
            <Preview resume={optimizedResume} />
          </div>

          {/* Cover Letter Section */}
          {coverLetter && (
            <div className="mt-8">
              <CoverLetter
                resume={optimizedResume}
                generatedCoverLetter={coverLetter}
                readOnly={true}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}