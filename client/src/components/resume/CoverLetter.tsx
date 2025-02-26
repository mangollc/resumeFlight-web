import React, { useState, useEffect } from 'react';
import { OptimizedResume, CoverLetter as CoverLetterType } from '@shared/schema';

interface CoverLetterProps {
  resume: OptimizedResume;
  generatedCoverLetter?: CoverLetterType;
  version?: string;
  readOnly?: boolean;
}

export function CoverLetterComponent({ resume, generatedCoverLetter, version, readOnly }: CoverLetterProps) {
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

  return (
    <div className="cover-letter-content">
      {error ? (
        <div className="error-message">{error}</div>
      ) : (
        <div className="content">{content}</div>
      )}
    </div>
  );
}

export type { CoverLetterProps };