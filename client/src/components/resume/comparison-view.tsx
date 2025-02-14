import { useState, useEffect } from "react";
import { OptimizedResume } from "@shared/schema";
import ComparisonSlider from "./comparison-slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RefreshCw, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ComparisonViewProps {
  currentResume: OptimizedResume;
  originalContent: string;
  onReoptimize: () => void;
  isOptimizing: boolean;
}

const getMetricsColor = (value: number): string => {
  if (value >= 80) return "bg-emerald-500";
  if (value >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

const MetricBar = ({ value }: { value: number }) => (
  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
    <div
      className={`h-full ${getMetricsColor(value)} transition-all duration-500`}
      style={{ width: `${value}%` }}
    />
  </div>
);

export default function ComparisonView({
  currentResume,
  originalContent,
  onReoptimize,
  isOptimizing,
}: ComparisonViewProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [availableVersions, setAvailableVersions] = useState<OptimizedResume[]>([]);
  const [comparisonContent, setComparisonContent] = useState<string>(currentResume.content);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch all versions when component mounts
    fetch(`/api/optimized-resume/${currentResume.id}/versions`)
      .then((res) => res.json())
      .then((versions) => {
        if (versions.length > 1) {
          setAvailableVersions(versions);
          setSelectedVersion(String(currentResume.metadata.version));
        }
      })
      .catch((error) => {
        console.error("Error fetching versions:", error);
        toast({
          title: "Error",
          description: "Failed to load resume versions",
          variant: "destructive",
        });
      });
  }, [currentResume.id]);

  const handleVersionChange = async (version: string) => {
    setSelectedVersion(version);
    const selectedResume = availableVersions.find(
      (v) => String(v.metadata.version) === version
    );

    if (selectedResume) {
      setComparisonContent(selectedResume.content);
    }
  };

  const ComparisonContent = () => (
    <div className="space-y-6">
      <ComparisonSlider
        beforeContent={originalContent}
        afterContent={comparisonContent}
        isLoading={isOptimizing}
        showFullScreen={!isFullScreen}
        onFullScreen={() => setIsFullScreen(true)}
      />

      {currentResume.metrics && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Original Metrics</h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Keywords Match</span>
                  <span>{currentResume.metrics.before.keywords}%</span>
                </div>
                <MetricBar value={currentResume.metrics.before.keywords} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Skills Match</span>
                  <span>{currentResume.metrics.before.skills}%</span>
                </div>
                <MetricBar value={currentResume.metrics.before.skills} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Experience Match</span>
                  <span>{currentResume.metrics.before.experience}%</span>
                </div>
                <MetricBar value={currentResume.metrics.before.experience} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Score</span>
                  <span>{currentResume.metrics.before.overall}%</span>
                </div>
                <MetricBar value={currentResume.metrics.before.overall} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Optimized Metrics</h4>
            <div className="space-y-2">
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Keywords Match</span>
                  <span>{currentResume.metrics.after.keywords}%</span>
                </div>
                <MetricBar value={currentResume.metrics.after.keywords} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Skills Match</span>
                  <span>{currentResume.metrics.after.skills}%</span>
                </div>
                <MetricBar value={currentResume.metrics.after.skills} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Experience Match</span>
                  <span>{currentResume.metrics.after.experience}%</span>
                </div>
                <MetricBar value={currentResume.metrics.after.experience} />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Score</span>
                  <span>{currentResume.metrics.after.overall}%</span>
                </div>
                <MetricBar value={currentResume.metrics.after.overall} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Resume Comparison</h3>
          {availableVersions.length > 1 && (
            <Select value={selectedVersion} onValueChange={handleVersionChange}>
              <SelectTrigger className="w-[200px]">
                <History className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {availableVersions.map((v) => (
                  <SelectItem
                    key={v.metadata.version}
                    value={String(v.metadata.version)}
                  >
                    Version {v.metadata.version.toFixed(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <Button
          onClick={onReoptimize}
          variant="default"
          className="w-auto bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          size="sm"
          disabled={isOptimizing}
        >
          {isOptimizing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Optimize Again
            </>
          )}
        </Button>
      </div>

      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl w-full">
          <ComparisonContent />
        </DialogContent>
      </Dialog>

      <Card className="p-6">
        <ComparisonContent />
      </Card>
    </div>
  );
}
