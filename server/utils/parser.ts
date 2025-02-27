
import mammoth from 'mammoth';

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
  const locationRegex = /([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/;
  
  let contact: ParsedContact = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  // Usually name is at the top
  contact.fullName = lines[0];
  
  for (const line of lines) {
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !contact.email) {
      contact.email = emailMatch[0];
    }
    
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !contact.phone) {
      contact.phone = phoneMatch[0];
    }

    // Look for location in format "City, State"
    const locationMatch = line.match(locationRegex);
    if (locationMatch && !contact.address) {
      const [_, city, state] = locationMatch;
      contact.address = `${city.trim()}, ${state.trim()}`;
      
      // Try to find country if it exists in the same line
      const countryMatch = line.match(/,\s*([A-Z][a-zA-Z\s]+)$/);
      if (countryMatch) {
        contact.address += `, ${countryMatch[1].trim()}`;
      }
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
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}
