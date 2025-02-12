import { cn } from "@/lib/utils";

interface DiffViewProps {
  beforeContent: string;
  afterContent: string;
}

export default function DiffView({ beforeContent, afterContent }: DiffViewProps) {
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
            {beforeContent}
          </pre>
        </div>

        {/* Optimized Content */}
        <div className="rounded-lg border bg-green-50/5 dark:bg-green-900/5 p-4 overflow-auto">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {afterContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
