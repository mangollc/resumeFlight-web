import mammoth from 'mammoth';

/**
 * Parse resume content from uploaded file buffer
 * Supports PDF and DOCX formats
 */
export async function parseResume(buffer: Buffer, mimetype: string): Promise<string> {
  console.log('Parsing resume file:', { mimetype });
  
  try {
    if (mimetype === "application/pdf") {
      // For PDFs, convert buffer to text (basic implementation)
      const text = buffer.toString('utf8');
      console.log('Parsed PDF content length:', text.length);
      return text;
    } 
    
    if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // For DOCX files, use mammoth to extract text
      const result = await mammoth.extractRawText({ buffer });
      console.log('Parsed DOCX content length:', result.value.length);
      return result.value;
    }
    
    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}
