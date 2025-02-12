import { Resume } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface PreviewProps {
  resume: Resume | null;
}

export default function Preview({ resume }: PreviewProps) {
  if (!resume) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <p>No resume selected</p>
            <p className="text-sm">Upload a resume to get started</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleDownload = async () => {
    // In a real app, we would call an API endpoint to generate and download the file
    const content = resume.optimizedContent || resume.originalContent;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `optimized-${resume.metadata.filename}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">
            {resume.metadata.filename}
          </h3>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>

        <div className="prose max-w-none">
          <pre className="whitespace-pre-wrap font-sans">
            {resume.optimizedContent || resume.originalContent}
          </pre>
        </div>

        {resume.optimizedContent && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">Optimization Details</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Keywords matched with job description</li>
              <li>Professional formatting applied</li>
              <li>Content tailored to position</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
