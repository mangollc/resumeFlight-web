import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResumeSideBySideCompareProps {
  originalResume: string;
  optimizedResume: string;
}

export function ResumeSideBySideCompare({ originalResume, optimizedResume }: ResumeSideBySideCompareProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="flex flex-col gap-4 h-full">
        <div className="border rounded-lg p-4 overflow-auto">
          <h3 className="font-semibold mb-2">Original Version</h3>
          <pre className="whitespace-pre-wrap text-sm">{originalResume}</pre>
        </div>
        <div className="border rounded-lg p-4 overflow-auto">
          <h3 className="font-semibold mb-2">Optimized Version</h3>
          <pre className="whitespace-pre-wrap text-sm">{optimizedResume}</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-2">Original Version</h3>
        <pre className="whitespace-pre-wrap text-sm">{originalResume}</pre>
      </div>
      <div className="border rounded-lg p-4 overflow-auto">
        <h3 className="font-semibold mb-2">Optimized Version</h3>
        <pre className="whitespace-pre-wrap text-sm">{optimizedResume}</pre>
      </div>
    </div>
  );
}