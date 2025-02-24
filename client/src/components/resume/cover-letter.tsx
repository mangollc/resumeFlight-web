import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OptimizedResume, CoverLetter as CoverLetterType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, RefreshCw, Edit, Save, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import all necessary Tiptap extensions
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import HardBreak from '@tiptap/extension-hard-break';

interface CoverLetterProps {
  resume: OptimizedResume;
  onGenerated?: (coverLetter: CoverLetterType) => void;
  generatedCoverLetter?: CoverLetterType;
  readOnly?: boolean;
}

interface EditorProps {
  content: string;
  readOnly: boolean;
  onChange: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-2 border-b">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'bg-muted' : ''}
      >
        Bold
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'bg-muted' : ''}
      >
        Italic
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'bg-muted' : ''}
      >
        Strike
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
      >
        H1
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
      >
        H2
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={editor.isActive('bulletList') ? 'bg-muted' : ''}
      >
        Bullet List
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={editor.isActive('orderedList') ? 'bg-muted' : ''}
      >
        Ordered List
      </Button>
    </div>
  );
};

const RichTextEditor = ({ content, readOnly, onChange }: EditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Document,
      Paragraph,
      Text,
      Heading,
      Bold,
      Italic,
      Strike,
      BulletList,
      OrderedList,
      ListItem,
      HardBreak,
    ],
    content: content,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className={`prose prose-sm max-w-none ${readOnly ? 'pointer-events-none' : ''}`}>
      {!readOnly && <MenuBar editor={editor} />}
      <EditorContent editor={editor} className="min-h-[200px] p-4 bg-background border rounded-md" />
    </div>
  );
};

const defaultFormat = `
[Contact Information]
{fullName}
{email}
{phone}
{address}

{date}

Dear Hiring Manager,

[Opening Paragraph]
I am writing to express my strong interest in the {position} position at {company}. With my background in {field} and proven track record of {achievement}, I am confident in my ability to contribute significantly to your team.

[Body Paragraph]
Throughout my career, I have consistently demonstrated {keySkill} and {expertise}. At my previous role with {previousCompany}, I {accomplishment}. This experience, combined with my {relevantSkill}, makes me particularly well-suited for this opportunity.

[Closing Paragraph]
I am excited about the prospect of joining {company} and contributing to {companyGoal}. I would welcome the opportunity to discuss how my skills and experience align with your needs in more detail.

Best regards,
{fullName}`;

export default function CoverLetterComponent({ resume, onGenerated, generatedCoverLetter, readOnly = false }: CoverLetterProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<"pdf" | "docx">("pdf");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [versions, setVersions] = useState<string[]>([]);
  const [currentCoverLetter, setCurrentCoverLetter] = useState<string>(defaultFormat);
  const [isEditing, setIsEditing] = useState(false);
  const [isEdited, setIsEdited] = useState(false);

  useEffect(() => {
    if (generatedCoverLetter?.metadata?.version) {
      const version = generatedCoverLetter.metadata.version.toString();
      setVersions(prev => {
        const newVersions = Array.from(new Set([...prev, version]))
          .sort((a, b) => {
            const [aMajor, aMinor] = a.split('.').map(Number);
            const [bMajor, bMinor] = b.split('.').map(Number);
            return bMajor - aMajor || bMinor - aMinor;
          });
        if (!selectedVersion) {
          setSelectedVersion(version);
          setCurrentCoverLetter(generatedCoverLetter.content);
        }
        return newVersions;
      });
    }
  }, [generatedCoverLetter]);

  // Effect to handle version changes
  useEffect(() => {
    if (selectedVersion && generatedCoverLetter) {
      if (selectedVersion === generatedCoverLetter.metadata.version.toString()) {
        setCurrentCoverLetter(generatedCoverLetter.content);
      } else {
        fetchVersionContent(selectedVersion);
      }
    }
  }, [selectedVersion]);

  const fetchVersionContent = async (version: string) => {
    try {
      if (!generatedCoverLetter?.id) return;

      const response = await fetch(`/api/cover-letter/${generatedCoverLetter.id}/version/${version}`, {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch version ${version}`);
      }

      const data = await response.json();
      if (data.content) {
        setCurrentCoverLetter(data.content);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Failed to fetch version content:', error);
      toast({
        title: "Error",
        description: "Failed to load cover letter version",
        variant: "destructive"
      });
    }
  };

  const generateMutation = useMutation({
    mutationFn: async () => {
      const currentVersion = versions.length > 0 ? versions[0] : '1.0';
      const [major, minor] = currentVersion.split('.').map(Number);
      const nextVersion = minor === 9 ? `${major + 1}.0` : `${major}.${minor + 1}`;

      const response = await apiRequest("POST", `/api/optimized-resume/${resume.id}/cover-letter`, {
        version: nextVersion,
        jobDetails: {
          ...resume.jobDetails,
          location: resume.jobDetails?.location?.split(',').slice(0, 2).join(', '), // City, State only
        },
        contactInfo: resume.contactInfo,
        format: {
          showAddress: true,
          showFullLocation: true,
          signatureStyle: "professional",
          includeDate: true,
          includeSkills: true,
          template: "default"
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate cover letter" }));
        throw new Error(errorData.error || "Failed to generate cover letter");
      }

      const data = await response.json();
      if (!data || !data.content) {
        throw new Error("Invalid response format from server");
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cover-letter"] });
      if (onGenerated) onGenerated(data);
      const newVersion = data.metadata?.version.toString();
      if (newVersion) {
        setVersions(prev => Array.from(new Set([...prev, newVersion]))
          .sort((a, b) => {
            const [aMajor, aMinor] = a.split('.').map(Number);
            const [bMajor, bMinor] = b.split('.').map(Number);
            return bMajor - aMajor || bMinor - aMinor;
          }));
        setSelectedVersion(newVersion);
        setCurrentCoverLetter(data.content);
      }
      setIsEditing(false);
      setIsEdited(false);
      toast({
        title: "Success",
        description: "Cover letter generated successfully",
      });
    },
    onError: (error: Error) => {
      console.error("Cover letter generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate cover letter",
        variant: "destructive",
      });
    },
  });

  const handleSave = async (content: string) => {
    try {
      const response = await fetch(`/api/cover-letter/${generatedCoverLetter?.id}/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) throw new Error('Failed to save changes');
      setIsEdited(true);
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Changes saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const filename = isEdited ? 'cover_letter_edited' : 'cover_letter';
      const response = await fetch(
        `/api/cover-letter/${generatedCoverLetter?.id}/download?format=${selectedFormat}&edited=${isEdited}`
      );

      if (!response.ok) throw new Error('Failed to download');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_v${selectedVersion}.${selectedFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: `Cover letter downloaded successfully as ${selectedFormat.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download cover letter",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleContentChange = (newContent: string) => {
    setCurrentCoverLetter(newContent);
  };

  return (
    <div className="space-y-4">
      {!readOnly && !generatedCoverLetter && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">Cover Letter</h3>
            <p className="text-sm text-muted-foreground">
              Generate a tailored cover letter based on your resume and job description
            </p>
          </div>
          <Button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Cover Letter"
            )}
          </Button>
        </div>
      )}

      {(generatedCoverLetter || generateMutation.data) && (
        <Card>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div>
                <h4 className="font-semibold">Cover Letter</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Version {selectedVersion || '1.0'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generateMutation.mutate()}
                      disabled={generateMutation.isPending}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                      {generateMutation.isPending ? 'Regenerating...' : 'Regenerate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (isEditing) {
                          handleSave(currentCoverLetter);
                        } else {
                          setIsEditing(true);
                        }
                      }}
                    >
                      {isEditing ? (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </>
                      ) : (
                        <>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </>
                      )}
                    </Button>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setIsEditing(false);
                          setCurrentCoverLetter(generatedCoverLetter?.content || defaultFormat);
                        }}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    )}
                  </>
                )}
                <div className="flex items-center gap-2">
                  {versions.length > 1 && (
                    <Select
                      value={selectedVersion}
                      onValueChange={setSelectedVersion}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Version" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version} value={version}>
                            Version {version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Select
                    value={selectedFormat}
                    onValueChange={(value) => setSelectedFormat(value as "pdf" | "docx")}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Format" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="docx">DOCX</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="w-full sm:w-auto"
                  >
                    <Download className={`h-4 w-4 mr-2 ${isDownloading ? 'animate-spin' : ''}`} />
                    {isDownloading ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Match Confidence:</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    generatedCoverLetter?.confidence >= 80 ? 'bg-emerald-100 text-emerald-700' :
                      generatedCoverLetter?.confidence >= 60 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                  }`}>
                    {generatedCoverLetter?.confidence ?? 85}%
                  </span>
                </div>
              </div>
              <div className="max-h-[300px] sm:max-h-[500px] overflow-y-auto rounded-md bg-muted p-3 sm:p-4">
                <RichTextEditor 
                  content={currentCoverLetter}
                  readOnly={!isEditing}
                  onChange={handleContentChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}