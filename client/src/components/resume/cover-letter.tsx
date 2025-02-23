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
  const [versions, setVersions] = useState<string[]>([]);
  const [currentCoverLetter, setCurrentCoverLetter] = useState<string>("");

  useEffect(() => {
    if (generatedCoverLetter?.metadata?.version) {
      const version = generatedCoverLetter.metadata.version.toString();
      setVersions(prev => {
        const newVersions = Array.from(new Set([...prev, version]))
          .sort((a, b) => {
            const [aMajor, aMinor] = a.split('.').map(Number);
            const [bMajor, bMinor] = b.split('.').map(Number);
            return bMajor - aMajor || bMinor - aMinor;
          });
        if (!selectedVersion) {
          setSelectedVersion(version);
          setCurrentCoverLetter(generatedCoverLetter.content);
        }
        return newVersions;
      });
    }
  }, [generatedCoverLetter]);

  // Effect to handle version changes
  useEffect(() => {
    if (selectedVersion && generatedCoverLetter) {
      if (selectedVersion === generatedCoverLetter.metadata.version.toString()) {
        setCurrentCoverLetter(generatedCoverLetter.content);
      } else {
        // Fetch the specific version content
        fetchVersionContent(selectedVersion);
      }
    }
  }, [selectedVersion]);

  const fetchVersionContent = async (version: string) => {
    try {
      if (!generatedCoverLetter?.id) return;

      const response = await fetch(`/api/cover-letter/${generatedCoverLetter.id}/version/${version}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch version ${version}`);
      }

      const data = await response.json();
      if (data.content) {
        setCurrentCoverLetter(data.content);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch version content:', error);
      toast({
        title: "Error",
        description: "Failed to load cover letter version",
        variant: "destructive"
      });
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const currentVersion = versions.length > 0 ? versions[0] : '1.0';
      const [major, minor] = currentVersion.split('.').map(Number);
      const nextVersion = minor === 9 ? `${major + 1}.0` : `${major}.${minor + 1}`;

      const response = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`, {
        version: nextVersion,
        jobDetails: {
          ...resume.jobDetails,
          location: resume.jobDetails?.location?.split(',').slice(0, 2).join(', '), // City, State only
        },
        contactInfo: resume.contactInfo,
        format: {
          showAddress: false,
          showFullLocation: false,
          signatureStyle: "simple",
          includeDate: true,
          includeSkills: false
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to generate cover letter");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cover-letter"] });
      if (onGenerated) onGenerated(data);
      const newVersion = data.metadata?.version.toString();
      setVersions(prev => Array.from(new Set([...prev, newVersion]))
        .sort((a, b) => {
          const [aMajor, aMinor] = a.split('.').map(Number);
          const [bMajor, bMinor] = b.split('.').map(Number);
          return bMajor - aMajor || bMinor - aMinor;
        }));
      setSelectedVersion(newVersion);
      setCurrentCoverLetter(data.content);
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

  const handleDownload = async () => {
    if (!generatedCoverLetter?.id) return;

    try {
      setIsDownloading(true);
      const response = await fetch(
        `/api/cover-letter/${generatedCoverLetter.id}/download?format=${selectedFormat}&version=${selectedVersion}`,
        {
          headers: {
            'Accept': selectedFormat === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          }
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = formatDownloadFilename(
        generatedCoverLetter.metadata.filename || 'cover_letter',
        resume.jobDetails?.title || '',
        selectedVersion
      );
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
        description: error instanceof Error ? error.message : "Failed to download cover letter",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const formatDownloadFilename = (filename: string, jobTitle: string, version: string): string => {
    const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
    const formattedJobTitle = jobTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const formattedDate = new Date().toISOString().split('T')[0];
    return `${baseName}_${formattedJobTitle}_v${version}_${formattedDate}.${selectedFormat}`;
  };

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
                  Version {selectedVersion || '1.0'}
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
                          <SelectItem key={version} value={version}>
                            Version {version}
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
                    onClick={handleDownload}
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
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm font-medium">Match Confidence:</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  generatedCoverLetter?.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                  generatedCoverLetter?.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {generatedCoverLetter?.confidence ?? 85}%
                </span>
              </div>
              <div className="max-h-[300px] sm:max-h-[500px] overflow-y-auto rounded-md bg-muted p-3 sm:p-4">
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {currentCoverLetter || generatedCoverLetter?.content || ''}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}