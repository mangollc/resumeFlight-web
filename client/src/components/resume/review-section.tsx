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

function ScoreCard({ label, before, after, tooltip }: { 
  label: string;
  before: number;
  after: number;
  tooltip: string;
}) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium text-gray-700">{label}</h4>
        <div className="text-sm text-gray-500 cursor-help" title={tooltip}>ⓘ</div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-lg ${getScoreColor(before)}`}>{before}%</span>
        <span className="text-gray-400">→</span>
        <span className={`text-lg ${getScoreColor(after)}`}>{after}%</span>
      </div>
    </div>
  );
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