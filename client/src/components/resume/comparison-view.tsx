import { useState } from "react";
import { OptimizedResume } from "@shared/schema";
import ComparisonSlider from "./comparison-slider";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
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
}: ComparisonViewProps) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

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
              onClick={() => setIsFullScreen(true)}
              variant="outline"
              size="sm"
            >
              <Maximize2 className="mr-2 h-4 w-4" />
              Full Screen
            </Button>
          )}
        </div>
      </div>

      <ComparisonSlider
        beforeContent={originalContent}
        afterContent={currentResume.content}
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