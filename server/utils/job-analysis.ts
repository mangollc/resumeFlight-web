import { Buffer } from "buffer";
import axios from 'axios';
import * as cheerio from 'cheerio';
import { openai } from '../openai';

interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
  department?: string;
  industries?: string[];
  softSkills?: string[];
  roleDetails?: {
    duties: string[];
    qualifications: string[];
    responsibilities: string[];
  };
  workplaceType?: string;
  technicalSkills?: string[];
  reportingStructure?: string;
  travelRequirements?: string;
}

/**
 * Extract job details from a LinkedIn job posting URL using AI
 */
export async function extractJobDetails(jobUrl: string): Promise<JobDetails> {
  try {
    if (!jobUrl.includes('linkedin.com/jobs/view/')) {
      throw new Error('Only LinkedIn job URLs are supported');
    }

    const response = await axios.get(jobUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Get raw job description
    const description = $('.jobs-description__content').text().trim() || 
                       $('.description__text').text().trim();

    // Use AI to analyze the job description
    const aiAnalysis = await analyzeJobDescription(description);
    return aiAnalysis;

  } catch (error: any) {
    console.error('Error extracting job details:', error);
    throw new Error(`Failed to extract job details: ${error.message}`);
  }
}

/**
 * Analyze job description text using OpenAI to extract structured details
 */
export async function analyzeJobDescription(jobDescription: string): Promise<JobDetails> {
  try {
    if (!jobDescription) {
      throw new Error('Job description is required');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the job description and extract the following details in a structured format:

1. Basic Information:
- Job title
- Company name
- Location (specify if remote/hybrid)
- Salary range (if mentioned)
- Position level (Entry/Mid/Senior/Manager)
- Department

2. Skills & Requirements:
- Technical skills required
- Soft skills needed
- Key requirements/qualifications
- Years of experience

3. Additional Details:
- Industry/sector
- Role responsibilities
- Workplace type (Remote/Hybrid/Onsite)
- Travel requirements
- Reporting structure

Return JSON following this exact structure:
{
  "title": "string",
  "company": "string",
  "location": "string",
  "salary": "string or null",
  "positionLevel": "string",
  "department": "string",
  "skillsAndTools": ["array of technical skills"],
  "softSkills": ["array of soft skills"],
  "keyRequirements": ["array of key requirements"],
  "industries": ["array of industries"],
  "roleDetails": {
    "duties": ["array of duties"],
    "qualifications": ["array of qualifications"],
    "responsibilities": ["array of responsibilities"]
  },
  "workplaceType": "string",
  "technicalSkills": ["array of technical skills"],
  "reportingStructure": "string",
  "travelRequirements": "string"
}`
        },
        {
          role: "user",
          content: jobDescription
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return result;

  } catch (error: any) {
    console.error('Error analyzing job description:', error);
    throw new Error(`Failed to analyze job description: ${error.message}`);
  }
}