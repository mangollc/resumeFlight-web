import mammoth from 'mammoth';

/**
 * Parse resume content from uploaded file buffer
 * Supports PDF and DOCX formats
 */
interface ParsedContact {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

function extractContactInfo(text: string): ParsedContact {
  const lines = text.split('\n').map(line => line.trim());
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
  const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}/;
  
  let contact: ParsedContact = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  // Usually name is at the top
  contact.fullName = lines[0];
  
  // Find email and phone
  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !contact.email) {
      contact.email = emailMatch[0];
    }
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !contact.phone) {
      contact.phone = phoneMatch[0];
    }

    // Look for address - typically contains words like Street, Ave, Road, etc.
    if ((!contact.address && line.length > 10) && 
        /\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|circle|court|ct)\b/i.test(line)) {
      contact.address = line;
    }
  }

  return contact;
}

export async function parseResume(buffer: Buffer, mimetype: string): Promise<{ content: string, contactInfo: ParsedContact }> {
  console.log('Parsing resume file:', { mimetype });
  
  try {
    let text: string;
    
    if (mimetype === "application/pdf") {
      text = buffer.toString('utf8');
      console.log('Parsed PDF content length:', text.length);
    } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
      console.log('Parsed DOCX content length:', text.length);
    } else {
      throw new Error(`Unsupported file type: ${mimetype}`);
    }

    const contactInfo = extractContactInfo(text);
    return { content: text, contactInfo };
  }
    
    throw new Error(`Unsupported file type: ${mimetype}`);
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}
