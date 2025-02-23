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
import { Progress } from "@/components/ui/progress";

interface ComparisonViewProps {
  beforeContent: string;
  afterContent: string;
  resumeId: number;
}

const getMetricsColor = (value: number) => {
  if (value >= 80) return "bg-green-600";
  if (value >= 60) return "bg-yellow-500";
  return "bg-red-500";
};

export default function ComparisonView({ beforeContent, afterContent, resumeId }: ComparisonViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [differences, setDifferences] = useState<any>(null);
  const [selectedVersion, setSelectedVersion] = useState<string>('1.0');
  const [versions, setVersions] = useState<string[]>([]); // Changed to string[]
  const [metrics, setMetrics] = useState<{
    before: { overall: number; keywords: number; skills: number; experience: number };
    after: { overall: number; keywords: number; skills: number; experience: number };
  } | null>(null);

  useEffect(() => {
    // Fetch available versions when component mounts
    const fetchVersions = async () => {
      try {
        const response = await fetch(`/api/optimized-resume/${resumeId}/versions`);
        if (!response.ok) throw new Error('Failed to fetch versions');
        const data = await response.json();
        setVersions(data.map(String)); //Convert numbers to strings
        if (data.length > 0) {
          setSelectedVersion(data[0].toString()); //Convert to string
          await fetchMetricsForVersion(data[0].toString()); //Convert to string
        }
      } catch (error) {
        console.error('Error fetching versions:', error);
      }
    };
    fetchVersions();
  }, [resumeId]);

  const renderVersionSelector = () => (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">Select Version</label>
      <select
        value={selectedVersion}
        onChange={(e) => handleVersionChange(e.target.value)}
        className="w-full p-2 border rounded-md"
      >
        {versions.map((version) => (
          <option key={version} value={version}>
            Version {version}
          </option>
        ))}
      </select>
    </div>
  );

  const handleVersionChange = async (version: string) => {
    setSelectedVersion(version);
    await fetchMetricsForVersion(version);
  };

  const fetchMetricsForVersion = async (version: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/optimized-resume/${resumeId}/metrics/${version}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data);
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [diffResponse, metricsResponse] = await Promise.all([
          fetch(`/api/optimized-resume/${resumeId}/differences`),
          fetch(`/api/optimized-resume/${resumeId}/metrics`)
        ]);

        if (!diffResponse.ok || !metricsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [diffData, metricsData] = await Promise.all([
          diffResponse.json(),
          metricsResponse.json()
        ]);

        setDifferences(diffData);
        setMetrics(metricsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
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

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-4">Original Resume Match</h4>
            <div className="space-y-4">
              {Object.entries(metrics.before).map(([key, value]) => (
                <div key={`before-${key}`} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{key}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                  <Progress
                    value={value}
                    className={`h-2 ${getMetricsColor(value)}`}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-4">Optimized Resume Match</h4>
            <div className="space-y-4">
              {Object.entries(metrics.after).map(([key, value]) => (
                <div key={`after-${key}`} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{key}</span>
                    <span className="font-medium">{value}%</span>
                  </div>
                  <Progress
                    value={value}
                    className={`h-2 ${getMetricsColor(value)}`}
                  />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

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