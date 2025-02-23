import { useState } from "react";
import { Loader2, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Preview from "@/components/resume/preview";
import CoverLetter from "@/components/resume/cover-letter";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetterType;
  versions: string[];
}

export function ReviewSection({ optimizedResume, coverLetter, versions }: ReviewSectionProps) {
  const [selectedVersion, setSelectedVersion] = useState(versions[0] || '1.0');

  return (
    <div className="space-y-6">
      {/* Optimized Resume Section */}
      <Card className="border-2 border-primary/10 shadow-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-semibold text-foreground/90">
              Optimized Resume
            </h3>
            <Select
              value={selectedVersion}
              onValueChange={setSelectedVersion}
            >
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
          <Preview resume={optimizedResume} />
        </CardContent>
      </Card>

      {/* Cover Letter Section */}
      {coverLetter && (
        <Card className="border-2 border-primary/10 shadow-lg">
          <CardContent className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-foreground/90">
                Cover Letter
              </h3>
            </div>
            <CoverLetter
              resume={optimizedResume}
              generatedCoverLetter={coverLetter}
              readOnly={true}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}