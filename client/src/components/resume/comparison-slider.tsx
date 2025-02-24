import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Loader2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonSliderProps {
  beforeContent: string;
  afterContent: string;
  isLoading?: boolean;
  showFullScreen?: boolean;
  onFullScreen?: () => void;
}

export default function ComparisonSlider({
  beforeContent,
  afterContent,
  isLoading = false,
  showFullScreen = false,
  onFullScreen,
}: ComparisonSliderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const range = rangeRef.current;
    if (!range) return;

    const updatePosition = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !range) return;

      const rangeRect = range.getBoundingClientRect();
      const x = "touches" in e ? e.touches[0].clientX : e.clientX;
      const position = ((x - rangeRect.left) / rangeRect.width) * 100;

      setPosition(Math.min(Math.max(0, position), 100));
    };

    const stopResizing = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", updatePosition);
      document.addEventListener("touchmove", updatePosition);
      document.addEventListener("mouseup", stopResizing);
      document.addEventListener("touchend", stopResizing);
    }

    return () => {
      document.removeEventListener("mousemove", updatePosition);
      document.removeEventListener("touchmove", updatePosition);
      document.removeEventListener("mouseup", stopResizing);
      document.removeEventListener("touchend", stopResizing);
    };
  }, [isResizing]);

  const highlightDifferences = (original: string, optimized: string) => {
    const originalWords = original.split(/\s+/);
    const optimizedWords = optimized.split(/\s+/);

    return optimizedWords
      .map((word, index) => {
        const isNew = !originalWords.includes(word);
        return isNew
          ? `<span class="bg-green-200/30 px-1 rounded">${word}</span>`
          : word;
      })
      .join(" ");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] h-full w-full bg-background/50 rounded-lg border">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">
          Generating comparison...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      {/* Labels Header */}
      <div className="flex justify-between px-6">
        <div className="rounded-full bg-red-500/10 text-red-500 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-red-500/20">
          Original
        </div>
        <div className="rounded-full bg-green-500/10 text-green-500 px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ring-green-500/20">
          Optimized
        </div>
      </div>

      {/* Comparison Container */}
      <div
        className="relative w-full h-[400px] overflow-hidden rounded-lg border bg-background shadow-lg"
        ref={rangeRef}
      >
        {/* Original Content (Left Side) */}
        <div
          className="absolute inset-0 w-full h-full bg-red-50/5"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="h-full overflow-auto p-4">
            <pre className="whitespace-pre-wrap font-sans text-sm">
              {beforeContent}
            </pre>
          </div>
        </div>

        {/* Optimized Content (Right Side) */}
        <div
          className="absolute inset-0 w-full h-full bg-green-50/5"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="h-full overflow-auto p-4">
            <pre
              className="whitespace-pre-wrap font-sans text-sm"
              dangerouslySetInnerHTML={{
                __html: highlightDifferences(beforeContent, afterContent),
              }}
            />
          </div>
        </div>

        {/* Slider Handle */}
        <div
          className="absolute inset-y-0 z-10 transition-transform duration-200 ease-in-out"
          style={{ left: `${position}%` }}
          onMouseDown={() => setIsResizing(true)}
          onTouchStart={() => setIsResizing(true)}
        >
          <div className="absolute inset-y-0 -left-px w-0.5 bg-primary shadow-[0_0_10px_rgba(0,0,0,0.1)]" />
          <div
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
              "flex h-12 w-12 items-center justify-center",
              "rounded-full border-2 border-primary bg-background shadow-xl",
              "cursor-ew-resize touch-none select-none",
              "transition-all duration-200 ease-in-out",
              isResizing && "scale-110 shadow-2xl",
              "after:absolute after:inset-0 after:rounded-full after:shadow-[0_0_0_12px_rgba(var(--primary),.1)]",
              "after:transition-transform after:duration-200",
              isResizing && "after:scale-110",
            )}
          >
            <ArrowLeftRight
              className={cn(
                "h-6 w-6 text-primary transition-all duration-200",
                isResizing && "scale-110",
              )}
            />
          </div>
        </div>
      </div>

      {showFullScreen && (
        <div className="flex justify-end mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFullScreen}
            className="gap-2"
          >
            <Maximize2 className="h-4 w-4" />
            Full Screen
          </Button>
        </div>
      )}
    </div>
  );
}
