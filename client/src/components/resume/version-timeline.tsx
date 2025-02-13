import { motion, AnimatePresence } from "framer-motion";
import { OptimizedResume } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";

interface TimelineProps {
  versions: OptimizedResume[];
  onVersionSelect: (version: OptimizedResume) => void;
  selectedVersion?: OptimizedResume;
}

const getMetricsColor = (value: number): string => {
  if (value >= 80) return "bg-emerald-500 dark:bg-emerald-400";
  if (value >= 60) return "bg-yellow-500 dark:bg-yellow-400";
  return "bg-red-500 dark:bg-red-400";
};

export function VersionTimeline({ versions, onVersionSelect, selectedVersion }: TimelineProps) {
  const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

  const sortedVersions = [...versions].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Version History
      </h3>

      <div className="space-y-3">
        <AnimatePresence>
          {sortedVersions.map((version, index) => {
            const isExpanded = expandedVersion === version.id;
            const isSelected = selectedVersion?.id === version.id;
            const versionNumber = version.metadata?.version || 1.0;

            return (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={cn(
                  "border rounded-lg overflow-hidden",
                  isSelected && "ring-2 ring-primary",
                  "hover:bg-muted/50 transition-colors"
                )}
              >
                <div 
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedVersion(isExpanded ? null : version.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        Version {versionNumber.toFixed(1)}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(version.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 pr-4">
                        <span className="text-sm text-muted-foreground">Score:</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-xs font-medium",
                          version.metrics?.after?.overall >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100" :
                          version.metrics?.after?.overall >= 60 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100" :
                          "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100"
                        )}>
                          {version.metrics?.after?.overall || 0}%
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t"
                    >
                      <div className="p-4 space-y-4">
                        <div className="grid gap-3">
                          {Object.entries(version.metrics?.after || {}).map(([key, value]) => (
                            key !== 'overall' && (
                              <div key={key} className="space-y-1">
                                <div className="flex justify-between text-sm">
                                  <span className="capitalize">{key}</span>
                                  <span className="font-medium">{value}%</span>
                                </div>
                                <Progress
                                  value={value}
                                  className={`h-2 ${getMetricsColor(value)}`}
                                />
                              </div>
                            )
                          ))}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onVersionSelect(version);
                            }}
                          >
                            View Version
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}