
import * as docx from 'docx';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';

/**
 * Generate a DOCX resume from optimized resume content
 */
export function generateResumeDOCX(
  resumeContent: string, 
  contactInfo: { 
    fullName: string; 
    email: string; 
    phone: string; 
    address?: string;
    linkedin?: string;
  },
  jobDetails?: {
    title?: string;
    company?: string;
  }
): Buffer {
  // Split content into sections
  const sections = resumeContent.split('\n\n').filter(s => s.trim());
  
  // Create document with proper styling
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            font: 'Calibri',
            size: 24,
          },
          paragraph: {
            spacing: {
              line: 360,
            },
          },
        },
        {
          id: 'Heading1',
          name: 'Heading 1',
          run: {
            font: 'Calibri',
            size: 32,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
        {
          id: 'Heading2',
          name: 'Heading 2',
          run: {
            font: 'Calibri',
            size: 28,
            bold: true,
          },
          paragraph: {
            spacing: {
              before: 240,
              after: 120,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // Header with contact information
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: contactInfo.fullName || 'Resume',
                bold: true,
                size: 36,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: [
                  contactInfo.email,
                  contactInfo.phone,
                  contactInfo.address,
                  contactInfo.linkedin
                ].filter(Boolean).join(' | '),
                size: 24,
              }),
            ],
            spacing: {
              after: 400,
            },
          }),
          
          // Main content - convert plain text to structured document
          ...processResumeContent(sections),
        ],
      },
    ],
  });

  return docx.Packer.toBuffer(doc);
}

/**
 * Generate a DOCX cover letter from content
 */
export function generateCoverLetterDOCX(
  content: string, 
  contactInfo: { 
    fullName: string; 
    email: string; 
    phone: string; 
    address?: string; 
  },
  jobDetails?: {
    title?: string;
    company?: string;
  }
): Buffer {
  // Create document with proper styling
  const doc = new Document({
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          run: {
            font: 'Calibri',
            size: 24,
          },
          paragraph: {
            spacing: {
              line: 360,
            },
          },
        },
      ],
    },
    sections: [
      {
        properties: {},
        children: [
          // Header with contact information
          new Paragraph({
            children: [
              new TextRun({
                text: contactInfo.fullName || '',
                bold: true,
                size: 28,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: contactInfo.email || '',
                size: 24,
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: contactInfo.phone || '',
                size: 24,
              }),
            ],
          }),
          contactInfo.address ? new Paragraph({
            children: [
              new TextRun({
                text: contactInfo.address,
                size: 24,
              }),
            ],
            spacing: {
              after: 400,
            },
          }) : new Paragraph({}),
          
          // Date
          new Paragraph({
            children: [
              new TextRun({
                text: new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                size: 24,
              }),
            ],
            spacing: {
              after: 400,
            },
          }),
          
          // Salutation and content
          ...processCoverLetterContent(content),
        ],
      },
    ],
  });

  return docx.Packer.toBuffer(doc);
}

/**
 * Process resume content into structured DOCX paragraphs
 */
function processResumeContent(sections: string[]): Paragraph[] {
  const result: Paragraph[] = [];
  
  sections.forEach((section, index) => {
    const lines = section.split('\n').filter(line => line.trim());
    
    // First line of each section is often a heading
    if (lines.length > 0) {
      // Check if this looks like a section heading
      const firstLine = lines[0].trim();
      const isHeading = firstLine === firstLine.toUpperCase() || 
                       (firstLine.length < 50 && !firstLine.endsWith('.'));
      
      if (isHeading) {
        result.push(
          new Paragraph({
            text: firstLine,
            heading: HeadingLevel.HEADING_2,
            spacing: {
              before: 400,
              after: 200,
            },
            border: {
              bottom: {
                color: "999999",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          })
        );
        
        // Process remaining lines in this section
        lines.slice(1).forEach(line => {
          result.push(
            new Paragraph({
              text: line,
              spacing: {
                before: 100,
                after: 100,
              },
            })
          );
        });
      } else {
        // If not a heading, process all lines
        lines.forEach(line => {
          result.push(
            new Paragraph({
              text: line,
              spacing: {
                before: 100,
                after: 100,
              },
            })
          );
        });
      }
    }
  });
  
  return result;
}

/**
 * Process cover letter content into structured DOCX paragraphs
 */
function processCoverLetterContent(content: string): Paragraph[] {
  const lines = content.split('\n').filter(line => line.trim());
  const result: Paragraph[] = [];
  
  let inSignature = false;
  
  lines.forEach(line => {
    // Check for salutation
    if (line.startsWith('Dear ')) {
      result.push(
        new Paragraph({
          text: line,
          spacing: {
            before: 200,
            after: 400,
          },
        })
      );
    } 
    // Check for signature
    else if (line.startsWith('Best') || 
             line.startsWith('Sincerely') || 
             line.startsWith('Regards') ||
             inSignature) {
      inSignature = true;
      result.push(
        new Paragraph({
          text: line,
          spacing: {
            before: 200,
            after: 0,
          },
        })
      );
    }
    // Regular paragraph
    else {
      result.push(
        new Paragraph({
          text: line,
          spacing: {
            before: 200,
            after: 200,
          },
        })
      );
    }
  });
  
  return result;
}
