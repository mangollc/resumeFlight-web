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
      if (!isResizing) return;

      const rangeRect = range.getBoundingClientRect();
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const position = ((x - rangeRect.left) / rangeRect.width) * 100;
      setPosition(Math.min(Math.max(0, position), 100));
    };

    const stopResizing = () => setIsResizing(false);

    document.addEventListener('mousemove', updatePosition);
    document.addEventListener('touchmove', updatePosition);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('touchend', stopResizing);

    return () => {
      document.removeEventListener('mousemove', updatePosition);
      document.removeEventListener('touchmove', updatePosition);
      document.removeEventListener('mouseup', stopResizing);
      document.removeEventListener('touchend', stopResizing);
    };
  }, [isResizing]);

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-muted" ref={rangeRef}>
      {/* Before Content */}
      <div className="absolute inset-0 overflow-hidden">
        <pre className="whitespace-pre-wrap font-sans text-sm p-4">
          {beforeContent}
        </pre>
      </div>

      {/* After Content */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <div className="h-full w-full bg-primary/5">
          <pre className="whitespace-pre-wrap font-sans text-sm p-4">
            {afterContent}
          </pre>
        </div>
      </div>

      {/* Slider Handle */}
      <div
        className="absolute inset-y-0"
        style={{ left: `${position}%` }}
        onMouseDown={() => setIsResizing(true)}
        onTouchStart={() => setIsResizing(true)}
      >
        <div className="absolute inset-y-0 -left-px w-0.5 bg-primary" />
        <div
          className={cn(
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex h-12 w-12 items-center justify-center",
            "rounded-full border-2 border-primary bg-background",
            "cursor-ew-resize touch-none"
          )}
        >
          <ArrowLeftRight className="h-6 w-6 text-primary" />
        </div>
      </div>

      {/* Labels */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-4 top-4 rounded-full bg-primary/10 px-2 py-1">
          Original
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-primary/10 px-2 py-1">
          Optimized
        </div>
      </div>
    </div>
  );
}
