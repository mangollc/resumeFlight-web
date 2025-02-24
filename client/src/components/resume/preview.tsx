import { useState } from "react";
import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
      <pre className="whitespace-pre-wrap font-sans text-sm">{content}</pre>
    </div>
  );
};

interface PreviewProps {
  resume: {
    id?: number;
    content: string;
  };
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
  const [selectedFormat, setSelectedFormat] = useState("pdf");
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(resume?.content || "");
  const [isSavePromptOpen, setIsSavePromptOpen] = useState(false);
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

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <RichTextEditor
            content={isEditing ? editedContent : resume.content}
            readOnly={!isEditing}
            onChange={setEditedContent}
          />
          {matchScores && renderScores()}
        </div>
      </CardContent>
    </Card>
  );
}
