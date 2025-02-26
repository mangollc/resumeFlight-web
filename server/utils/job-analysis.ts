import { Buffer } from "buffer";
import axios from 'axios';
import * as cheerio from 'cheerio'; // Fix the cheerio import

interface JobDetails {
  title: string;
  company: string;
  location: string;
  salary?: string;
  description?: string;
  positionLevel?: string;
  keyRequirements?: string[];
  skillsAndTools?: string[];
}

/**
 * Extract job details from a LinkedIn job posting URL
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

    // Extract job details using LinkedIn's class names
    const title = $('.job-details-jobs-unified-top-card__job-title').text().trim() || 
                 $('.top-card-layout__title').text().trim();
    const company = $('.job-details-jobs-unified-top-card__company-name').text().trim() || 
                   $('.topcard__org-name-link').text().trim();
    const location = $('.job-details-jobs-unified-top-card__bullet').text().trim() || 
                    $('.topcard__flavor--bullet').text().trim();
    const description = $('.jobs-description__content').text().trim() || 
                       $('.description__text').text().trim();
    const salary = $('.job-details-jobs-unified-top-card__salary-range').text().trim() || 
                  $('.compensation__salary').text().trim() || undefined;

    // Extract requirements and skills from description
    const requirements = extractRequirements(description);
    const skills = extractSkills(description);
    const positionLevel = determinePositionLevel(description);

    return {
      title: title || 'Unknown Title',
      company: company || 'Unknown Company',
      location: location || 'Unknown Location',
      salary,
      description,
      positionLevel,
      keyRequirements: requirements,
      skillsAndTools: skills
    };
  } catch (error: any) {
    console.error('Error extracting job details:', error);
    throw new Error(`Failed to extract job details: ${error.message}`);
  }
}

/**
 * Analyze job description text to extract key details
 */
export async function analyzeJobDescription(jobDescription: string): Promise<JobDetails> {
  try {
    if (!jobDescription) {
      throw new Error('Job description is required');
    }

    // Extract requirements and skills
    const requirements = extractRequirements(jobDescription);
    const skills = extractSkills(jobDescription);
    const positionLevel = determinePositionLevel(jobDescription);

    // Extract any additional information from the text
    const extractedTitle = extractTitle(jobDescription);
    const extractedCompany = extractCompany(jobDescription);
    const extractedLocation = extractLocation(jobDescription);
    const extractedSalary = extractSalary(jobDescription);

    return {
      title: extractedTitle || 'Position Title',
      company: extractedCompany || 'Company Name',
      location: extractedLocation || 'Location',
      salary: extractedSalary,
      description: jobDescription,
      positionLevel,
      keyRequirements: requirements,
      skillsAndTools: skills
    };
  } catch (error: any) {
    console.error('Error analyzing job description:', error);
    throw new Error(`Failed to analyze job description: ${error.message}`);
  }
}

function extractRequirements(text: string): string[] {
  const requirements: string[] = [];
  const requirementKeywords = [
    'requirements:', 
    'qualifications:', 
    'what you\'ll need:', 
    'what we\'re looking for:',
    'required skills:',
    'essential skills:',
    'minimum qualifications:'
  ];

  // Find sections that might contain requirements
  let requirementSection = '';
  for (const keyword of requirementKeywords) {
    const sections = text.toLowerCase().split(keyword);
    if (sections.length > 1) {
      requirementSection = sections[1].split(/responsibilities:|what you'll do:|about the role:|we offer:/i)[0];
      break;
    }
  }

  if (requirementSection) {
    // Split by bullet points, numbers, or other common list indicators
    const bulletPoints = requirementSection.split(/(?:\r?\n|\r)[\s•\-\*\d+\.]|\r?\n/);
    requirements.push(...bulletPoints
      .map(point => point.trim())
      .filter(point => point.length > 10 && point.length < 200 && !point.toLowerCase().includes('ability to'))
    );
  }

  return requirements;
}

function extractSkills(text: string): string[] {
  const skills = new Set<string>();
  const skillPatterns = [
    // Programming Languages
    /\b(?:JavaScript|TypeScript|Python|Java|C\+\+|Ruby|PHP|Swift|Kotlin|Go|Rust)\b/gi,
    // Frameworks & Libraries
    /\b(?:React|Angular|Vue|Node\.js|Express|Django|Flask|Spring|Laravel|Next\.js|Nuxt\.js)\b/gi,
    // Cloud & DevOps
    /\b(?:AWS|Azure|GCP|Docker|Kubernetes|CI\/CD|Jenkins|Git|GitHub|Terraform)\b/gi,
    // Databases
    /\b(?:SQL|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch|Neo4j|GraphQL)\b/gi,
    // Development Tools
    /\b(?:VS Code|IntelliJ|Eclipse|Postman|Jira|Confluence|Slack|REST API|WebSocket)\b/gi,
    // Soft Skills
    /\b(?:Communication|Leadership|Problem[- ]Solving|Team[- ]Work|Project Management|Agile|Scrum)\b/gi
  ];

  // Extract skills using patterns
  for (const pattern of skillPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(skill => skills.add(skill));
    }
  }

  return Array.from(skills);
}

function determinePositionLevel(text: string): string {
  const levelIndicators = {
    entry: ['entry level', 'junior', 'associate', '0-2 years', 'graduate'],
    mid: ['mid level', 'intermediate', '2-5 years', '3-5 years', 'mid-senior'],
    senior: ['senior', 'lead', 'architect', '5+ years', '7+ years', 'principal'],
    manager: ['manager', 'director', 'head of', 'vp', 'chief', 'executive']
  };

  const textLower = text.toLowerCase();

  for (const [level, indicators] of Object.entries(levelIndicators)) {
    if (indicators.some(indicator => textLower.includes(indicator))) {
      return level.charAt(0).toUpperCase() + level.slice(1);
    }
  }

  return 'Not Specified';
}

function extractTitle(text: string): string {
  // Try to find a job title at the beginning of the text
  const firstLine = text.split(/[\n\r]/)[0].trim();
  if (firstLine && firstLine.length < 100) {
    return firstLine;
  }

  // Look for common job title patterns
  const titlePatterns = [
    /position:\s*([^.\n]+)/i,
    /job title:\s*([^.\n]+)/i,
    /role:\s*([^.\n]+)/i,
    /seeking[^.\n]+([^.\n]+developer|engineer|manager|designer|architect)[^.\n]+/i
  ];

  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return '';
}

function extractCompany(text: string): string {
  const companyPatterns = [
    /(?:at|with|for)\s+([\w\s&-]+?)(?=\s+(?:is|are|has|seeks|looking|hiring|requires|needs))/i,
    /company:\s*([\w\s&-]+)/i,
    /about\s+([\w\s&-]+?)(?=\s*:)/i
  ];

  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      return match[1].trim();
    }
  }

  return '';
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /location:\s*([\w\s,]+)/i,
    /based in\s+([\w\s,]+)/i,
    /position in\s+([\w\s,]+)/i,
    /(?:remote|hybrid|on-site|in-office)/i,
    /(?:located|located in|position located in)\s+([\w\s,]+)/i
  ];

  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      return (match[1] || match[0]).trim();
    }
  }

  return '';
}

function extractSalary(text: string): string | undefined {
  const salaryPatterns = [
    /salary:\s*([\d,]+\s*-\s*[\d,]+)/i,
    /salary range:\s*([\d,]+\s*-\s*[\d,]+)/i,
    /\$\s*[\d,]+\s*-\s*\$\s*[\d,]+/,
    /\$[\d,]+k\s*-\s*\$[\d,]+k/i
  ];

  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return undefined;
}