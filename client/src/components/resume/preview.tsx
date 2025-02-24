import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Scale, ZoomIn } from "lucide-react";
import { OptimizedResume } from "@shared/schema";

const RichTextEditor = ({
  content,
  readOnly,
  onChange,
}: {
  content: string;
  readOnly: boolean;
  onChange: (content: string) => void;
}) => {
  return (
    <div className="max-h-[500px] overflow-y-auto rounded-md bg-muted p-4">
      <pre className="whitespace-pre-wrap font-sans text-sm">
        {content}
      </pre>
    </div>
  );
};

interface PreviewProps {
  resume: OptimizedResume;
}

interface MatchScores {
  originalScores: Record<string, number>;
  optimizedScores: Record<string, number>;
  analysis: {
    strengths: string[];
    gaps: string[];
    suggestions: string[];
  };
}

interface MetricRowProps {
  label: string;
  before: number;
  after: number;
}

const MetricRow = ({ label, before, after }: MetricRowProps) => (
  <div className="grid grid-cols-3 gap-4 py-2">
    <div className="font-medium">{label}</div>
    <div className="text-center">{before}%</div>
    <div className="text-center">{after}%</div>
  </div>
);

export default function Preview({ resume }: PreviewProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [matchScores, setMatchScores] = useState<MatchScores | null>(null);
  const [isScoresExpanded, setIsScoresExpanded] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(resume?.content || "");
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const renderScores = () => {
    if (!matchScores) return null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 font-semibold border-b pb-2">
          <div>Metric</div>
          <div className="text-center">Original</div>
          <div className="text-center">Optimized</div>
        </div>
        {Object.keys(matchScores.optimizedScores).map((metric) => (
          <MetricRow
            key={`metric-${metric}`}
            label={metric}
            before={matchScores.originalScores[metric] || 0}
            after={matchScores.optimizedScores[metric] || 0}
          />
        ))}
      </div>
    );
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/optimized-resume/${resume.id}/download`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `optimized-resume-v${resume.version}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAnalyzeMatch = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch(`/api/optimized-resume/${resume.id}/analyze-match`);
      const data = await response.json();
      // Handle the analysis data
      console.log(data);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Optimized Resume</h3>
              <p className="text-sm text-muted-foreground">
                Version {resume.version} • {resume.metadata?.filename}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleAnalyzeMatch} disabled={isAnalyzing}>
                {isAnalyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <Scale className="w-4 h-4 mr-2" />
                    Analyze Match
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <>Downloading...</>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <FileText className="w-4 h-4 mr-2" />
                Compare
              </Button>
              <Button variant="outline" size="sm">
                <ZoomIn className="w-4 h-4 mr-2" />
                View Full
              </Button>
            </div>
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div dangerouslySetInnerHTML={{ __html: resume.content }} />
          </div>
          {matchScores && renderScores()}
        </div>
      </CardContent>
    </Card>
  );
}