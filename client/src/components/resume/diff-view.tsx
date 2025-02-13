import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface DiffViewProps {
  beforeContent: string;
  afterContent: string;
}

function computeDiff(before: string, after: string) {
  // Split into paragraphs first
  const beforeParagraphs = before.split('\n\n');
  const afterParagraphs = after.split('\n\n');
  const result = [];

  const maxParagraphs = Math.max(beforeParagraphs.length, afterParagraphs.length);

  for (let i = 0; i < maxParagraphs; i++) {
    const beforePara = beforeParagraphs[i] || '';
    const afterPara = afterParagraphs[i] || '';

    // If paragraphs are identical, add without highlighting
    if (beforePara === afterPara) {
      result.push({ text: afterPara, highlight: false });
      continue;
    }

    // Split paragraphs into words for more granular comparison
    const beforeWords = beforePara.split(/(\s+)/);
    const afterWords = afterPara.split(/(\s+)/);
    let diffText = '';
    let lastHighlighted = false;

    for (let j = 0; j < afterWords.length; j++) {
      const word = afterWords[j];
      const beforeWord = beforeWords[j] || '';

      // Check if this word changed
      const isChanged = word !== beforeWord;

      // If highlighting status changed or it's the first word
      if (isChanged !== lastHighlighted || j === 0) {
        if (diffText) {
          result.push({ text: diffText, highlight: lastHighlighted });
        }
        diffText = word;
        lastHighlighted = isChanged;
      } else {
        // Continue building the current segment
        diffText += word;
      }
    }

    // Add the last segment
    if (diffText) {
      result.push({ text: diffText, highlight: lastHighlighted });
    }

    // Add paragraph separator
    result.push({ text: '\n\n', highlight: false });
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
              <span
                key={index}
                className={cn(
                  "inline",
                  item.highlight && "bg-green-100 dark:bg-green-900/30 rounded px-1"
                )}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm inline">
                  {item.text}
                </pre>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}