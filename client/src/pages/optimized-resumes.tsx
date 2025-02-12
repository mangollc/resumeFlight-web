import { useQuery } from "@tanstack/react-query";
import { OptimizedResume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function OptimizedResumesPage() {
  const { data: resumes, isLoading } = useQuery<OptimizedResume[]>({
    queryKey: ["/api/optimized-resumes"],
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 space-y-6">
      <h1 className="text-2xl font-bold">Optimized Resumes</h1>

      {resumes && resumes.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Salary Range</TableHead>
                <TableHead>Level</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resumes.map((resume) => (
                <TableRow key={resume.id}>
                  <TableCell>
                    {new Date(resume.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{resume.jobDetails?.title || "N/A"}</TableCell>
                  <TableCell>{resume.jobDetails?.company || "N/A"}</TableCell>
                  <TableCell>{resume.jobDetails?.location || "N/A"}</TableCell>
                  <TableCell>{resume.jobDetails?.salary || "Not specified"}</TableCell>
                  <TableCell>{resume.jobDetails?.positionLevel || "Not specified"}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/resume/${resume.id}/download`} download>
                        <Download className="mr-2 h-4 w-4" />
                        Resume
                      </a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/cover-letter/${resume.id}/download`} download>
                        <Download className="mr-2 h-4 w-4" />
                        Cover Letter
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No optimized resumes yet</h3>
          <p className="text-muted-foreground">
            Optimize your resume for specific job positions to see them here
          </p>
        </div>
      )}
    </div>
  );
}