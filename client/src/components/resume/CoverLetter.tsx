import React, { useState, useEffect } from 'react';
import { OptimizedResume, CoverLetter as CoverLetterType } from '@shared/schema'; // Assuming these types are defined elsewhere

interface CoverLetterProps {
  resume: OptimizedResume;
  generatedCoverLetter?: CoverLetterType;
  version?: string;
  readOnly?: boolean;
}

export function CoverLetter({ resume, generatedCoverLetter, version, readOnly }: CoverLetterProps) {
  const [content, setContent] = useState(generatedCoverLetter?.content || '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVersionContent() {
      if (!generatedCoverLetter?.id || !version) return;
      try {
        setError(null);
        const response = await fetch(`/api/cover-letter/${generatedCoverLetter.id}/version/${version}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (!data.content) {
          throw new Error('Invalid response format');
        }
        setContent(data.content);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch version content';
        setError(message);
        console.error('Version fetch error:', error);
      }
    }
    fetchVersionContent();
  }, [generatedCoverLetter?.id, version]);

  const formattedContent = content.split('\n').map((line, i) => {
    if (line.trim() === '') return <br key={i} />;
    return (
      <p 
        key={i} 
        className={`mb-4 ${
          i === 0 ? 'text-2xl font-bold text-center' : // Header
          i < 3 ? 'text-center' : // Contact info
          line.toUpperCase() === line ? 'font-bold mt-6' : // Section headers
          'text-base leading-relaxed'
        }`}
      >
        {line}
      </p>
    );
  });

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-4 bg-white dark:bg-gray-900 rounded-lg shadow">
      {error ? (
        <div className="text-red-500 p-4 text-center">{error}</div>
      ) : (
        <div className="prose max-w-none dark:prose-invert">
          {formattedContent}
        </div>
      )}
    </div>
  );
}