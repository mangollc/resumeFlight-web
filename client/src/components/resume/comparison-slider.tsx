import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonSliderProps {
  beforeContent: string;
  afterContent: string;
}

export default function ComparisonSlider({ beforeContent, afterContent }: ComparisonSliderProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [position, setPosition] = useState(50);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const range = rangeRef.current;
    if (!range) return;

    const updatePosition = (e: MouseEvent | TouchEvent) => {
      if (!isResizing || !range) return;

      const rangeRect = range.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const position = ((x - rangeRect.left) / rangeRect.width) * 100;

      // Clamp position between 0 and 100
      setPosition(Math.min(Math.max(0, position), 100));
    };

    const stopResizing = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener('mousemove', updatePosition);
      document.addEventListener('touchmove', updatePosition);
      document.addEventListener('mouseup', stopResizing);
      document.addEventListener('touchend', stopResizing);
    }

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('touchmove', updatePosition);
      document.removeEventListener('mouseup', stopResizing);
      document.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing]);

  return (
    <div 
      className="relative w-full min-h-[400px] overflow-hidden rounded-lg border bg-background"
      ref={rangeRef}
    >
      {/* Before Content */}
      <div className="absolute inset-0 w-full h-full">
        <div className="h-full overflow-auto p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {beforeContent}
          </pre>
        </div>
      </div>

      {/* After Content */}
      <div
        className="absolute inset-0 w-full h-full bg-background transition-transform"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="h-full overflow-auto bg-primary/5 p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm">
            {afterContent}
          </pre>
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute inset-y-0 z-10"
        style={{ left: `${position}%` }}
        onMouseDown={() => setIsResizing(true)}
        onTouchStart={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -left-px w-0.5 bg-primary" />
        <div
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex h-12 w-12 items-center justify-center",
            "rounded-full border-2 border-primary bg-background shadow-xl",
            "cursor-ew-resize touch-none select-none",
            isResizing && "scale-110"
          )}
        >
          <ArrowLeftRight className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-6 top-6 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold">
          Original
        </div>
        <div className="absolute right-6 top-6 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold">
          Optimized
        </div>
      </div>
    </div>
  );
}