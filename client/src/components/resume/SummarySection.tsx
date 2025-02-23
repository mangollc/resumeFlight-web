import { Card, CardContent } from "@/components/ui/card";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface SummarySectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetterType;
  versions: string[];
}

export function SummarySection({ optimizedResume, coverLetter, versions }: SummarySectionProps) {
  const [selectedResumeVersion, setSelectedResumeVersion] = useState(versions[0]);

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-lg p-6 border">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Summary</h2>
          <p className="text-muted-foreground">Review your optimized documents</p>
        </div>

        {/* Optimized Resume Versions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Optimized Resume Versions</h3>
            <Select value={selectedResumeVersion} onValueChange={setSelectedResumeVersion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select version" />
              </SelectTrigger>
              <SelectContent>
                {versions.map((version) => (
                  <SelectItem key={version} value={version}>
                    Version {version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Card>
            <CardContent className="p-4">
              <Preview resume={optimizedResume} />
            </CardContent>
          </Card>
        </div>

        {/* Cover Letter Versions */}
        {coverLetter && (
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold">Cover Letter Versions</h3>
            <Card>
              <CardContent className="p-4">
                <CoverLetter
                  resume={optimizedResume}
                  generatedCoverLetter={coverLetter}
                  readOnly={true}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
