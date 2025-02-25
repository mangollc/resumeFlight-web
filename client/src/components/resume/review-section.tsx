import React from 'react';
import { OptimizedResume, CoverLetter } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CoverLetter as CoverLetterComponent } from './CoverLetter';
import Preview from './preview';

interface ReviewSectionProps {
  optimizedResume: OptimizedResume;
  coverLetter?: CoverLetter;
  onDownload: (id: number) => Promise<void>;
}

export function ReviewSection({ optimizedResume, coverLetter, onDownload }: ReviewSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Review Optimized Documents</h2>
        <Button onClick={() => onDownload(optimizedResume.id)} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Download Package
        </Button>
      </div>

      <Tabs defaultValue="resume" className="w-full">
        <TabsList>
          <TabsTrigger value="resume">Resume</TabsTrigger>
          <TabsTrigger value="cover-letter" disabled={!coverLetter}>
            Cover Letter
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resume">
          <Card>
            <CardContent className="p-6">
              <Preview resume={optimizedResume} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cover-letter">
          {coverLetter && (
            <Card>
              <CardContent className="p-6">
                <CoverLetterComponent
                  resume={optimizedResume}
                  generatedCoverLetter={coverLetter}
                  readOnly
                />
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}