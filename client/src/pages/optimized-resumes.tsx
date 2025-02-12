import { useQuery } from "@tanstack/react-query";
import { Resume } from "@shared/schema";
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
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resume"],
  });

  const optimizedResumes = resumes?.filter((resume) => resume.optimizedContent);

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

      {optimizedResumes && optimizedResumes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimizedResumes.map((resume) => (
              <TableRow key={resume.id}>
                <TableCell>
                  {new Date(resume.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>Applied Position</TableCell>
                <TableCell>Company Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell className="space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Resume
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Cover Letter
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
