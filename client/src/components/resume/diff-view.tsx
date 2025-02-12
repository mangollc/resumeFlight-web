import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface DiffViewProps {
  beforeContent: string;
  afterContent: string;
}

function computeDiff(before: string, after: string) {
  const beforeLines = before.split('\n');
  const afterLines = after.split('\n');
  const result = [];

  for (let i = 0; i < afterLines.length; i++) {
    const line = afterLines[i];
    const beforeLine = beforeLines[i] || '';

    if (line !== beforeLine) {
      result.push({ line, highlight: true });
    } else {
      result.push({ line, highlight: false });
    }
  }

  return result;
}

export default function DiffView({ beforeContent, afterContent }: DiffViewProps) {
  const diffResult = useMemo(() => computeDiff(beforeContent, afterContent), [beforeContent, afterContent]);

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
          <div className="space-y-1">
            {diffResult.map((item, index) => (
              <div 
                key={index} 
                className={cn(
                  "px-2 -mx-2 rounded",
                  item.highlight && "bg-green-100 dark:bg-green-900/30"
                )}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm">
                  {item.line}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}