
import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { type OptimizedResume, type CoverLetter } from "@shared/schema";
import Preview from "@/components/resume/preview";
import { CoverLetterComponent } from "@/components/resume/CoverLetter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { FileText, Loader2, AlertTriangle, Download, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingDialog } from "@/components/ui/loading-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ResumeMetricsComparison } from "@/components/resume/ResumeMetricsComparison";
import DownloadOptions from "@/components/resume/DownloadOptions";

export default function ResumeReview() {
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  
  // Get the ID from URL parameters
  const optimizedId = params.id;
  
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [uploadedResume, setUploadedResume] = useState(null);
  const [optimizedResume, setOptimizedResume] = useState<OptimizedResume | null>(null);
  const [jobDetails, setJobDetails] = useState(null);
  const [coverLetter, setCoverLetter] = useState<CoverLetter | null>(null);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [selectedCoverLetterVersion, setSelectedCoverLetterVersion] = useState<string>("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [sessionId] = useState(() => Math.floor(Math.random() * 1000000).toString());
  
  // Fetch optimized resume data
  useEffect(() => {
    const fetchOptimizedResume = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest('GET', `/api/optimized-resume/${optimizedId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch optimized resume');
        }
        const data = await response.json();

        // Set uploaded resume from the optimized resume data
        if (data.uploadedResume) {
          setUploadedResume(data.uploadedResume);
        }

        setOptimizedResume(data);
        setJobDetails(data.jobDetails);

        if (data.coverLetter) {
          setCoverLetter(data.coverLetter);
          setCoverLetters([data.coverLetter]);
          setSelectedCoverLetterVersion(data.coverLetter.metadata.version.toString());
        }
      } catch (error) {
        console.error('Error fetching optimized resume:', error);
        setError(error as Error);
        toast({
          title: "Error",
          description: "Failed to load optimization session",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (optimizedId) {
      fetchOptimizedResume();
    }
  }, [optimizedId, toast]);

  const handleDownloadPackage = async () => {
    if (!optimizedResume?.id) return;

    try {
      setIsDownloading(true);

      const formData = new FormData();
      formData.append('sessionId', sessionId);
      if (jobDetails) {
        formData.append('jobDetails', JSON.stringify(jobDetails));
      }
      if (coverLetter) {
        formData.append('coverLetterId', coverLetter.id.toString());
      }

      const response = await fetch(`/api/optimized-resume/${optimizedResume.id}/package/download`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/zip',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to download package');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `resume-package-${Date.now()}.zip`;
      if (contentDisposition) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(contentDisposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Package downloaded successfully",
        duration: 2000,
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: "Failed to download package",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Show loading state while fetching review data
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your review data...</p>
        </div>
      </div>
    );
  }

  // Show error state if the optimized resume data couldn't be fetched
  if (!optimizedResume || error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-4" />
          <p className="text-muted-foreground">Unable to load optimization session. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 lg:pl-24">
      <div className="space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Your Optimized Documents</h2>
          <p className="text-muted-foreground">
            Your personalized resume and cover letter are ready to download in your preferred format.
          </p>
        </div>

        <Tabs defaultValue="resume" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="resume" className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle>Optimized Resume</CardTitle>
                  {optimizedResume && (
                    <DownloadOptions 
                      documentId={optimizedResume.id} 
                      documentType="resume" 
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-4">
                  <Preview resume={optimizedResume} showMetrics={false} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cover-letter" className="space-y-4">
            {coverLetter ? (
              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 pb-4">
                  <div className="flex justify-between items-center">
                    <CardTitle>Cover Letter</CardTitle>
                    {coverLetter && (
                      <DownloadOptions 
                        documentId={coverLetter.id} 
                        documentType="cover-letter" 
                      />
                    )}
                  </div>
                  {coverLetters.length > 1 && (
                    <div className="mt-2">
                      <Select 
                        value={selectedCoverLetterVersion} 
                        onValueChange={setSelectedCoverLetterVersion}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select version" />
                        </SelectTrigger>
                        <SelectContent>
                          {coverLetters.map((letter) => (
                            <SelectItem 
                              key={letter.id} 
                              value={letter.metadata.version.toString()}
                            >
                              Version {letter.metadata.version}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <CoverLetterComponent coverLetter={coverLetter} />
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No cover letter available</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  This optimization session doesn't include a cover letter
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 pb-4">
                <CardTitle>Resume Analysis</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <ResumeMetricsComparison
                  metrics={optimizedResume.metrics}
                  analysis={optimizedResume.analysis}
                />
                
                {/* Job Details Section */}
                <div className="mt-8 p-4 rounded-lg border bg-card">
                  <h3 className="text-lg font-semibold mb-4">Job Details</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="font-medium">Title</p>
                      <p className="text-muted-foreground">{optimizedResume.jobDetails.title}</p>
                    </div>
                    <div>
                      <p className="font-medium">Company</p>
                      <p className="text-muted-foreground">{optimizedResume.jobDetails.company}</p>
                    </div>
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-muted-foreground">{optimizedResume.jobDetails.location}</p>
                    </div>
                    {optimizedResume.jobDetails.salary && (
                      <div>
                        <p className="font-medium">Salary</p>
                        <p className="text-muted-foreground">{optimizedResume.jobDetails.salary}</p>
                      </div>
                    )}
                    {optimizedResume.jobDetails.positionLevel && (
                      <div>
                        <p className="font-medium">Position Level</p>
                        <p className="text-muted-foreground">{optimizedResume.jobDetails.positionLevel}</p>
                      </div>
                    )}
                    {optimizedResume.jobDetails.keyRequirements && optimizedResume.jobDetails.keyRequirements.length > 0 && (
                      <div>
                        <p className="font-medium">Key Requirements</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                          {optimizedResume.jobDetails.keyRequirements.map((req, index) => (
                            <li key={index}>{req}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {optimizedResume.jobDetails.skillsAndTools && optimizedResume.jobDetails.skillsAndTools.length > 0 && (
                      <div>
                        <p className="font-medium">Skills & Tools</p>
                        <div className="flex flex-wrap gap-2">
                          {optimizedResume.jobDetails.skillsAndTools.map((skill, index) => (
                            <span key={index} className="px-2 py-1 bg-primary/10 rounded-md text-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Download Package Option */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Download Complete Package</CardTitle>
            <CardDescription>
              Get both your optimized resume and cover letter together in a single download
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={handleDownloadPackage}
              className="w-full"
              variant="outline"
              disabled={isDownloading || !optimizedResume || !coverLetter}
            >
              {isDownloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download Complete Package
            </Button>
          </CardFooter>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={() => window.location.href = '/optimized-resumes'}
          >
            Go to All Documents
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
