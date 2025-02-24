import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";

interface CoverLetter {
  id: number;
  content: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

interface CoverLetterFormData {
  resumeId: number;
  jobDescription: string;
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
  };
}

export default function CoverLettersPage() {
  const { toast } = useToast();
  const [selectedLetter, setSelectedLetter] = useState<CoverLetter | null>(null);

  // Fetch cover letters
  const { data: coverLetters = [], isLoading } = useQuery({
    queryKey: ['/api/cover-letters'],
    queryFn: async () => {
      const response = await fetch('/api/cover-letters');
      if (!response.ok) throw new Error('Failed to fetch cover letters');
      return response.json();
    }
  });

  // Form setup for generating new cover letter
  const form = useForm<CoverLetterFormData>();

  // Generate cover letter mutation
  const generateMutation = useMutation({
    mutationFn: async (data: CoverLetterFormData) => {
      const response = await fetch('/api/cover-letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to generate cover letter');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cover-letters'] });
      toast({
        title: "Success",
        description: "Cover letter generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Cover Letters</h1>
        <Button onClick={() => {/* Open generate cover letter modal */}}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : coverLetters.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No cover letters yet</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Generate your first cover letter to get started
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {coverLetters.map((letter: CoverLetter) => (
            <Card key={letter.id} className="p-4">
              <h3 className="font-semibold">Cover Letter v{letter.version}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Created: {new Date(letter.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setSelectedLetter(letter)}>
                  View
                </Button>
                <Button variant="secondary">Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
