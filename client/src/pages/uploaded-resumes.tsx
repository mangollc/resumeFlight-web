import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Resume } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UploadedResumesPage() {
  const [, setLocation] = useLocation();
  const { data: resumes, isLoading } = useQuery<Resume[]>({
    queryKey: ["/api/resume"],
  });

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-32 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Uploaded Resumes</h1>
        <Button onClick={() => setLocation("/")}>Upload New Resume</Button>
      </div>

      {resumes && resumes.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File Name</TableHead>
              <TableHead>Upload Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resumes.map((resume) => (
              <TableRow key={resume.id}>
                <TableCell>{resume.metadata.filename}</TableCell>
                <TableCell>
                  {new Date(resume.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/?resume=${resume.id}`)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Optimize
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No resumes uploaded</h3>
          <p className="text-muted-foreground">
            Get started by uploading your first resume
          </p>
        </div>
      )}
    </div>
  );
}