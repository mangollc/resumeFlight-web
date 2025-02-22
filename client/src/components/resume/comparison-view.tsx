import { useState, useEffect } from "react";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ResumeSideBySideCompare } from "./ResumeSideBySideCompare";

interface ComparisonViewProps {
  beforeContent: string;
  afterContent: string;
  resumeId: number;
}

export default function ComparisonView({ beforeContent, afterContent, resumeId }: ComparisonViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [differences, setDifferences] = useState<any>(null);

  useEffect(() => {
    const fetchDifferences = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/optimized-resume/${resumeId}/differences`);
        if (!response.ok) throw new Error('Failed to fetch differences');
        const data = await response.json();
        setDifferences(data);
      } catch (error) {
        console.error('Error fetching differences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDifferences();
  }, [resumeId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ResumeSideBySideCompare 
        originalResume={beforeContent} 
        optimizedResume={afterContent} 
      />
      {differences && differences.changes && (
        <Card className="p-4 mt-4">
          <h4 className="font-semibold mb-2">Changes Made</h4>
          <ul className="space-y-2">
            {differences.changes.map((change: any, index: number) => (
              <li key={index} className="text-sm">
                <span className="font-medium">{change.type}:</span> {change.reason}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}