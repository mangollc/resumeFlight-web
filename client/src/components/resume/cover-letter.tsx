import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CoverLetterProps {
  resume: OptimizedResume;
  onGenerated?: (coverLetter: CoverLetterType) => void;
  generatedCoverLetter?: CoverLetterType | null;
  readOnly?: boolean;
}

export default function CoverLetterComponent({ resume, onGenerated, generatedCoverLetter, readOnly = false }: CoverLetterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [versions, setVersions] = useState<number[]>([]);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`, {
        version: versions.length > 0 ? Math.max(...versions) + 0.1 : 1.0,
        jobDetails: {
          ...resume.jobDetails,
          // Only include necessary location details
          location: resume.jobDetails?.location?.split(',').slice(0, 2).join(', '), // City, State only
        },
        includePositionInSignature: false,
        signatureFormat: "simple",
        format: {
          showAddress: false,
          showFullLocation: false,
          signatureStyle: "simple",
          includeDate: true
        }
      });

      if (!response.ok) {
        throw new Error("Failed to generate cover letter");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cover-letter"] });
      if (onGenerated) onGenerated(data);
      const newVersion = data.metadata.version;
      setVersions(prev => Array.from(new Set([...prev, newVersion])).sort((a, b) => b - a));
      setSelectedVersion(newVersion.toString());
      toast({
        title: "Success",
        description: "Cover letter generated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (version?: string) => {
    if (!generatedCoverLetter?.id) return;

    try {
      setIsDownloading(true);
      const versionToUse = version || selectedVersion || generatedCoverLetter.metadata.version.toString();
      const response = await fetch(
        `/api/cover-letter/${generatedCoverLetter.id}/download?format=${selectedFormat}&version=${versionToUse}`,
        {
          headers: {
            'Accept': selectedFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      );

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${formatDownloadFilename(
        generatedCoverLetter.metadata.filename,
        resume.jobDetails?.title || '',
        parseFloat(versionToUse)
      )}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Cover letter downloaded successfully as ${selectedFormat.toUpperCase()}`,
        duration: 2000,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download cover letter",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDownloadFilename = (filename: string, jobTitle: string, version: number): string => {
    const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const formattedJobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    return `${baseName}_${formattedJobTitle}_v${version.toFixed(1)}`;
  };

  // Initialize versions array when component mounts or when generatedCoverLetter changes
  useEffect(() => {
    if (generatedCoverLetter) {
      setVersions(prev => {
        const newVersions = Array.from(new Set([...prev, generatedCoverLetter.metadata.version])).sort((a, b) => b - a);
        if (!selectedVersion) {
          setSelectedVersion(generatedCoverLetter.metadata.version.toString());
        }
        return newVersions;
      });
    }
  }, [generatedCoverLetter]);

  const selectedCoverLetter = versions.length > 0 && selectedVersion
    ? generatedCoverLetter?.versions?.find(v => v.version.toString() === selectedVersion)
    : generatedCoverLetter;

  return (
    <div className="space-y-4">
      {!readOnly && !generatedCoverLetter && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">Cover Letter</h3>
            <p className="text-sm text-muted-foreground">
              Generate a tailored cover letter based on your resume and job description
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Cover Letter"
            )}
          </Button>
        </div>
      )}

      {(generatedCoverLetter || generateMutation.data) && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-semibold">Cover Letter</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Version {selectedVersion || generatedCoverLetter?.metadata.version.toFixed(1)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                    {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  {versions.length > 1 && (
                    <Select
                      value={selectedVersion}
                      onValueChange={setSelectedVersion}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version} value={version.toString()}>
                            v{version.toFixed(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload()}
                    disabled={isDownloading}
                    className="w-full sm:w-auto"
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="max-h-[300px] sm:max-h-[500px] overflow-y-auto rounded-md bg-muted p-3 sm:p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {selectedCoverLetter?.content || generateMutation.data?.content}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}