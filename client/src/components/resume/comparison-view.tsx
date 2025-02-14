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
import { RefreshCw, History, Maximize2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
    <div
      className={`h-full ${getMetricsColor(value)} transition-all duration-500`}
      style={{ width: `${value}%` }}
    />
  </div>
);

const ComparisonView = ({
  currentResume,
  originalContent,
  onReoptimize,
  isOptimizing,
}: ComparisonViewProps) => {
  const [selectedVersion, setSelectedVersion] = useState<string>(
    currentResume.metadata.version.toString()
  );
  const [availableVersions, setAvailableVersions] = useState<OptimizedResume[]>([]);
  const [comparisonContent, setComparisonContent] = useState<string>(currentResume.content);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isFullScreen) {
      fetch(`/api/optimized-resume/${currentResume.id}/versions`)
        .then((res) => res.json())
        .then((versions) => {
          if (versions.length > 0) {
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
    }
  }, [currentResume.id, isFullScreen]);

  const handleVersionChange = async (version: string) => {
    setSelectedVersion(version);
    const selectedResume = availableVersions.find(
      (v) => String(v.metadata.version) === version
    );

    if (selectedResume) {
      setComparisonContent(selectedResume.content);
    }
  };

  const renderMetricsSection = () => (
    <div className="mt-4 grid grid-cols-2 gap-4 bg-muted/30 rounded-lg p-3">
      <div className="space-y-1.5">
        <h4 className="text-xs font-medium mb-2">Original Metrics</h4>
        {Object.entries(currentResume.metrics.before).map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1)} Match</span>
              <span className="font-medium">{value}%</span>
            </div>
            <MetricBar value={value} />
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <h4 className="text-xs font-medium mb-2">Optimized Metrics</h4>
        {Object.entries(currentResume.metrics.after).map(([key, value]) => (
          <div key={key} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{key.charAt(0).toUpperCase() + key.slice(1)} Match</span>
              <span className="font-medium">{value}%</span>
            </div>
            <MetricBar value={value} />
          </div>
        ))}
      </div>
    </div>
  );

  const renderComparisonContent = (inDialog: boolean = false) => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {!inDialog && (
            <Button
              onClick={onReoptimize}
              variant="default"
              className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
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
          )}
          {inDialog && availableVersions.length > 1 && (
            <Select
              value={selectedVersion}
              onValueChange={handleVersionChange}
            >
              <SelectTrigger className="w-[200px]">
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
      </div>

      <ComparisonSlider
        beforeContent={originalContent}
        afterContent={inDialog ? comparisonContent : currentResume.content}
        isLoading={isOptimizing}
        showFullScreen={!inDialog}
        onFullScreen={() => setIsFullScreen(true)}
      />

      {!inDialog && currentResume.metrics && renderMetricsSection()}
    </>
  );

  return (
    <div className="space-y-4">
      <Dialog open={isFullScreen} onOpenChange={setIsFullScreen}>
        <DialogContent className="max-w-6xl w-full">
          <DialogHeader>
            <DialogTitle>Resume Comparison</DialogTitle>
          </DialogHeader>
          {renderComparisonContent(true)}
        </DialogContent>
      </Dialog>

      <Card className="p-6">
        {renderComparisonContent()}
      </Card>
    </div>
  );
};

export default ComparisonView;