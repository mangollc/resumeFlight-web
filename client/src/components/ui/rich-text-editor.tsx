
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useState, useEffect } from 'react';
import { Button } from './button';
import { Save } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  readOnly?: boolean;
  onSave?: (content: string) => void;
}

export function RichTextEditor({ content, readOnly = false, onSave }: RichTextEditorProps) {
  const [isEdited, setIsEdited] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      setIsEdited(true);
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleSave = () => {
    if (editor && onSave) {
      // Preserve formatting when saving
      const formattedContent = editor.getHTML()
        .replace(/<p>/g, '\n<p>')
        .replace(/<\/p>/g, '</p>\n')
        .replace(/<h([1-6])>/g, '\n<h$1>')
        .replace(/<\/h([1-6])>/g, '</h$1>\n')
        .replace(/<ul>/g, '\n<ul>')
        .replace(/<\/ul>/g, '</ul>\n')
        .replace(/<li>/g, '\n  <li>')
        .replace(/<\/li>/g, '</li>')
        .replace(/\n\s*\n/g, '\n')
        .trim();

      onSave(formattedContent);
      setIsEdited(false);
    }
  };

  return (
    <div className="border rounded-md">
      <EditorContent editor={editor} className="p-4 min-h-[200px]" />
      {!readOnly && isEdited && (
        <div className="flex justify-end border-t p-2 bg-muted/20">
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
}
