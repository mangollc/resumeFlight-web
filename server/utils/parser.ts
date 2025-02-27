import * as mammoth from 'mammoth';
import * as path from 'path';
import { openai } from '../openai';

interface ParsedContact {
  fullName: string;
  email: string;
  phone: string;
  address: string;
}

function extractContactInfo(text: string): ParsedContact {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i;
  const phoneRegex = /[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,}/;
  const locationRegex = /([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})/;
  const addressRegex = /\d+\s+[A-Za-z\s]+,?\s*[A-Za-z\s]+(,\s*[A-Z]{2})(\s+\d{5}(-\d{4})?)?/;

  let contact: ParsedContact = {
    fullName: '',
    email: '',
    phone: '',
    address: ''
  };

  // Name is usually in the first 3 lines and in ALL CAPS
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    if (lines[i].toUpperCase() === lines[i] && lines[i].length > 5) {
      contact.fullName = lines[i];
      break;
    }
  }

  // If no all-caps name found, use first line
  if (!contact.fullName && lines.length > 0) {
    contact.fullName = lines[0];
  }

  // Extract other contact details
  for (const line of lines) {
    // Email extraction
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !contact.email) {
      contact.email = emailMatch[0];
    }

    // Phone extraction - more robust pattern matching
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !contact.phone) {
      contact.phone = phoneMatch[0];
    }

    // Address extraction - try full address
    const addressMatch = line.match(addressRegex);
    if (addressMatch && !contact.address) {
      contact.address = addressMatch[0];
      continue;
    }

    // Fallback to city/state format
    const locationMatch = line.match(locationRegex);
    if (locationMatch && !contact.address) {
      const [_, city, state] = locationMatch;
      contact.address = `${city.trim()}, ${state.trim()}`;

      // Try to find country/zip if it exists in the same line
      const countryMatch = line.match(/,\s*([A-Z][a-zA-Z\s]+)$/);
      if (countryMatch) {
        contact.address += `, ${countryMatch[1].trim()}`;
      }
    }
  }

  // Use AI to analyze the resume and extract contact info if OpenAI is available
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

    // First extract basic contact info with regex
    const basicContactInfo = extractContactInfo(text);

    // Then enhance with AI if possible
    const enhancedContactInfo = await enhanceContactInfoWithAI(text, basicContactInfo);

    console.log('Extracted contact info:', enhancedContactInfo);
    return { content: text, contactInfo: enhancedContactInfo };
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

/**
 * Use AI to extract contact information from resume text
 */
export async function enhanceContactInfoWithAI(resumeText: string, basicContactInfo: ParsedContact): Promise<ParsedContact> {
  try {
    // If we already have all contact info fields, no need to use AI
    if (basicContactInfo.fullName && basicContactInfo.email && 
        basicContactInfo.phone && basicContactInfo.address) {
      return basicContactInfo;
    }

    // Take first 1000 characters which likely has contact info
    const resumeStart = resumeText.substring(0, 1000);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Extract contact information from the resume text. Return a JSON object with the following properties:
          - fullName: The person's full name
          - email: Email address
          - phone: Phone number
          - address: Physical address (as detailed as possible)

          Use existing information if available, otherwise extract from text.`
        },
        {
          role: "user",
          content: `Extract contact information from this resume. 
          Existing information: ${JSON.stringify(basicContactInfo)}

          Resume text:
          ${resumeStart}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 500
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.log("No AI response for contact extraction");
      return basicContactInfo;
    }

    const aiExtractedInfo = JSON.parse(content);

    // Merge AI-extracted info with basic info, preferring AI results if they exist
    return {
      fullName: aiExtractedInfo.fullName || basicContactInfo.fullName || '',
      email: aiExtractedInfo.email || basicContactInfo.email || '',
      phone: aiExtractedInfo.phone || basicContactInfo.phone || '',
      address: aiExtractedInfo.address || basicContactInfo.address || ''
    };
  } catch (error) {
    console.error("Error using AI to extract contact info:", error);
    return basicContactInfo;
  }
}