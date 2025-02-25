import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryClient } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface CoverLetter {
  id: number;
  content: string;
  version: string;
  createdAt: string;
  updatedAt: string;
}

const coverLetterFormSchema = z.object({
  resumeId: z.number(),
  jobDescription: z.string().min(1, "Job description is required"),
  contactInfo: z.object({
    fullName: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    phone: z.string().min(1, "Phone number is required"),
    address: z.string().optional()
  })
});

type CoverLetterFormData = z.infer<typeof coverLetterFormSchema>;

export default function CoverLettersPage() {
  const { toast } = useToast();
  const [selectedLetter, setSelectedLetter] = useState<CoverLetter | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { user } = useAuth();

  // Fetch resumes for selection
  const { data: resumes = [] } = useQuery({
    queryKey: ['/api/uploaded-resumes'],
    queryFn: async () => {
      const response = await fetch('/api/uploaded-resumes');
      if (!response.ok) throw new Error('Failed to fetch resumes');
      return response.json();
    }
  });

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
  const form = useForm<CoverLetterFormData>({
    resolver: zodResolver(coverLetterFormSchema),
    defaultValues: {
      contactInfo: {
        fullName: user?.name || '',
        email: user?.email || '',
        phone: '',
        address: ''
      }
    }
  });

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

  const onSubmit = async (data: CoverLetterFormData) => {
    setIsGenerating(true);
    try {
      await generateMutation.mutateAsync(data);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Cover Letters</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Generate New
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Generate Cover Letter</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="resumeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Resume</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          className="w-full rounded-md border border-input px-3 py-2"
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        >
                          <option value="">Select a resume</option>
                          {resumes.map((resume: any) => (
                            <option key={resume.id} value={resume.id}>
                              Resume #{resume.id}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="jobDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Paste the job description here" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo.fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo.email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactInfo.address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Generate Cover Letter'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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

      {/* View Cover Letter Dialog */}
      {selectedLetter && (
        <Dialog open={!!selectedLetter} onOpenChange={() => setSelectedLetter(null)}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Cover Letter v{selectedLetter.version}</DialogTitle>
            </DialogHeader>
            <div className="mt-4 whitespace-pre-wrap font-serif">
              {selectedLetter.content}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}