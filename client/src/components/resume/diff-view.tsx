import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { ResumeDifferences } from "@shared/schema";

interface DiffViewProps {
  beforeContent: string;
  afterContent: string;
  resumeId: number;
}

function findAndHighlight(text: string, changes: Array<{ original: string; optimized: string; type: string; reason: string }>) {
  let result = text;
  const segments = [];
  let lastIndex = 0;

  // Sort changes by length (longest first) to avoid nested matches
  const sortedChanges = [...changes].sort((a, b) => b.optimized.length - a.optimized.length);

  for (const change of sortedChanges) {
    const index = result.indexOf(change.optimized, lastIndex);
    if (index !== -1) {
      // Add non-highlighted text before the change
      if (index > lastIndex) {
        segments.push({
          text: result.substring(lastIndex, index),
          highlight: false
        });
      }
      // Add highlighted text with metadata
      segments.push({
        text: change.optimized,
        highlight: true,
        type: change.type,
        reason: change.reason,
        original: change.original
      });
      lastIndex = index + change.optimized.length;
    }
  }

  // Add remaining text
  if (lastIndex < result.length) {
    segments.push({
      text: result.substring(lastIndex),
      highlight: false
    });
  }

  return segments;
}

export default function DiffView({ beforeContent, afterContent, resumeId }: DiffViewProps) {
  const { data: differences, isLoading } = useQuery<ResumeDifferences>({
    queryKey: [`/api/optimized-resume/${resumeId}/differences`],
    enabled: !!resumeId
  });

  const highlightedSegments = useMemo(() => 
    differences ? findAndHighlight(afterContent, differences.changes) : [],
    [afterContent, differences]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="space-y-4 w-full max-w-md">
          <div className="h-4 bg-muted animate-pulse rounded" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* Headers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900 px-3 py-1.5 text-sm font-medium text-blue-900 dark:text-blue-100">
            Original Version
          </div>
        </div>
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900 px-3 py-1.5 text-sm font-medium text-green-900 dark:text-green-100">
            Optimized Version
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="grid grid-cols-2 gap-4 min-h-[400px]">
        {/* Original Content */}
        <div className="rounded-lg border bg-muted/5 p-4 overflow-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {beforeContent || "No content available"}
          </pre>
        </div>

        {/* Optimized Content */}
        <div className="rounded-lg border bg-green-50/5 dark:bg-green-900/5 p-4 overflow-auto">
          <TooltipProvider>
            <div className="space-y-1">
              {highlightedSegments.map((segment, index) => (
                segment.highlight ? (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <span
                        className={cn(
                          "inline rounded px-1",
                          "bg-green-100 dark:bg-green-900/30",
                          "cursor-help"
                        )}
                      >
                        <pre className="whitespace-pre-wrap font-sans text-sm inline">
                          {segment.text}
                        </pre>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-sm">
                      <div className="space-y-2">
                        <Badge variant="outline" className="capitalize">
                          {segment.type}
                        </Badge>
                        <p className="text-sm">{segment.reason}</p>
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          <p className="font-medium">Original:</p>
                          <p className="italic">{segment.original}</p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <span key={index} className="inline">
                    <pre className="whitespace-pre-wrap font-sans text-sm inline">
                      {segment.text}
                    </pre>
                  </span>
                )
              ))}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}