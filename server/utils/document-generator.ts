import { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle } from "docx";
import { OptimizedResume, CoverLetter } from "@shared/schema";

export const generateResumeName = (resume: OptimizedResume): string => {
  const name = resume.contactInfo.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const position = resume.jobDetails.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'position';
  const version = resume.version || '1.0';
  const date = new Date().toISOString().split('T')[0];

  return `${name}_${position}_v${version}_${date}.docx`;
};

export const generateCoverLetterName = (coverLetter: CoverLetter, resume: OptimizedResume): string => {
  const name = resume.contactInfo.fullName.replace(/[^a-zA-Z0-9]/g, '_');
  const position = resume.jobDetails.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'position';
  const version = coverLetter.version;
  const date = new Date().toISOString().split('T')[0];

  return `${name}_${position}_CoverLetter_v${version}_${date}.docx`;
};

export const generateResumeDoc = (resume: OptimizedResume): Document => {
  const sections = resume.content.split('\n\n').filter(section => section.trim());

  const doc = new Document({
    styles: {
      default: {
        heading1: {
          run: {
            size: 28,
            bold: true,
            color: "000000"
          },
          paragraph: {
            spacing: {
              after: 120
            }
          }
        }
      }
    },
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440, // 1 inch
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200
          },
          children: [
            new TextRun({
              text: resume.contactInfo.fullName,
              bold: true,
              size: 32
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 200
          },
          children: [
            new TextRun({
              text: resume.contactInfo.address,
              size: 24
            })
          ]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: {
            after: 400
          },
          children: [
            new TextRun({
              text: `${resume.contactInfo.phone} | ${resume.contactInfo.email}`,
              size: 24
            })
          ]
        }),
        ...(resume.contactInfo.linkedin ? [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400
            },
            children: [
              new TextRun({
                text: resume.contactInfo.linkedin,
                size: 24
              })
            ]
          })
        ] : []),
        ...sections.map(section => {
          const lines = section.split('\n');
          const title = lines[0].trim();
          const content = lines.slice(1).join('\n').trim();

          return [
            new Paragraph({
              heading: HeadingLevel.HEADING_1,
              spacing: {
                before: 400,
                after: 200
              },
              children: [
                new TextRun({
                  text: title.toUpperCase(),
                  bold: true,
                  size: 28
                })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: content,
                  size: 24
                })
              ]
            })
          ];
        }).flat()
      ]
    }]
  });

  return doc;
};

export const generateCoverLetterDoc = (coverLetter: CoverLetter, resume: OptimizedResume): Document => {
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 1440,
            right: 1440,
            bottom: 1440,
            left: 1440
          }
        }
      },
      children: [
        // Header with contact information
        new Paragraph({
          children: [
            new TextRun({
              text: new Date().toLocaleDateString(),
              size: 24
            })
          ],
          spacing: {
            after: 400
          }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: resume.contactInfo.fullName + '\n',
              size: 24
            }),
            new TextRun({
              text: resume.contactInfo.address + '\n',
              size: 24
            }),
            new TextRun({
              text: resume.contactInfo.phone + '\n',
              size: 24
            }),
            new TextRun({
              text: resume.contactInfo.email,
              size: 24
            })
          ],
          spacing: {
            after: 400
          }
        }),
        // Company information if available
        ...(resume.jobDetails.company ? [
          new Paragraph({
            children: [
              new TextRun({
                text: resume.jobDetails.company + '\n',
                size: 24
              }),
              new TextRun({
                text: resume.jobDetails.location || '',
                size: 24
              })
            ],
            spacing: {
              after: 400
            }
          })
        ] : []),
        // Salutation
        new Paragraph({
          children: [
            new TextRun({
              text: "Dear Hiring Manager,",
              size: 24
            })
          ],
          spacing: {
            after: 400
          }
        }),
        // Cover letter content
        ...coverLetter.content.split('\n\n').map(paragraph =>
          new Paragraph({
            children: [
              new TextRun({
                text: paragraph,
                size: 24
              })
            ],
            spacing: {
              after: 300
            }
          })
        ),
        // Closing
        new Paragraph({
          children: [
            new TextRun({
              text: "Sincerely,\n",
              size: 24
            }),
            new TextRun({
              text: resume.contactInfo.fullName,
              size: 24
            })
          ],
          spacing: {
            before: 400
          }
        })
      ]
    }]
  });

  return doc;
};