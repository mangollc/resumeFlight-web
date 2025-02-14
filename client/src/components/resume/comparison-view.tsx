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

interface ComparisonViewProps {
  currentResume: OptimizedResume;
  originalContent: string;
  onReoptimize: () => void;
  isOptimizing: boolean;
}

export default function ComparisonView({
  currentResume,
  originalContent,
  onReoptimize,
  isOptimizing,
}: ComparisonViewProps) {
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [availableVersions, setAvailableVersions] = useState<OptimizedResume[]>([]);
  const [comparisonContent, setComparisonContent] = useState<string>(currentResume.content);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch all versions when component mounts
    fetch(`/api/optimized-resume/${currentResume.id}/versions`)
      .then((res) => res.json())
      .then((versions) => {
        setAvailableVersions(versions);
        setSelectedVersion(String(currentResume.metadata.version));
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Resume Comparison</h3>
          {availableVersions.length > 0 && (
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

      <Card className="p-6">
        <ComparisonSlider
          beforeContent={originalContent}
          afterContent={comparisonContent}
          isLoading={isOptimizing}
        />

        {currentResume.metrics && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Original Metrics</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Keywords Match:</span>
                  <span>{currentResume.metrics.before.keywords}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skills Match:</span>
                  <span>{currentResume.metrics.before.skills}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Experience Match:</span>
                  <span>{currentResume.metrics.before.experience}%</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Score:</span>
                  <span>{currentResume.metrics.before.overall}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Optimized Metrics</h4>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Keywords Match:</span>
                  <span>{currentResume.metrics.after.keywords}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Skills Match:</span>
                  <span>{currentResume.metrics.after.skills}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Experience Match:</span>
                  <span>{currentResume.metrics.after.experience}%</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Overall Score:</span>
                  <span>{currentResume.metrics.after.overall}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
