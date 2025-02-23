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

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetterType;
  versions: string[];
}

export function ReviewSection({ optimizedResume, coverLetter, versions }: ReviewSectionProps) {
  return (
    <div className="space-y-8">
      {/* Step 3: Optimized Resume with Versions */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Step 3: Optimized Resume</h3>
        <Card>
          <CardContent className="p-6">
            <Select defaultValue={versions[0]}>
              <SelectTrigger>
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
            <div className="mt-4">
              <Preview resume={optimizedResume} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Step 4: Cover Letter with Versions */}
      {coverLetter && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Step 4: Cover Letter</h3>
          <Card>
            <CardContent className="p-6">
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
  );
}