
import { openai } from '../openai';
import { storage } from '../storage';
import { OptimizedResume } from '@shared/schema';
import { logger } from './logger';

// Error class for specific steps
class StepError extends Error {
  code: string;
  step: string;
  
  constructor(message: string, code: string, step: string) {
    super(message);
    this.name = 'StepError';
    this.code = code;
    this.step = step;
  }
}

// Timeout utility for OpenAI calls
const executeWithTimeout = async (
  fn: () => Promise<any>,
  timeoutMs: number,
  errorMessage: string
): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const error = new Error(errorMessage);
      error.code = 'TIMEOUT_ERROR';
      reject(error);
    }, timeoutMs);
    
    try {
      const result = await fn();
      clearTimeout(timeoutId);
      resolve(result);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
};

// Main optimization function that handles the entire workflow
export async function optimizeResume(
  resumeText: string,
  jobDescription: string,
  onStatusUpdate: (status: any) => void
): Promise<any> {
  // State object to track progress and store intermediate results
  const state = {
    currentStep: 'started',
    sessionId: `session_${Date.now()}`,
    resumeText,
    jobDescription,
    jobDetails: {},
    parsedResume: {},
    jobAnalysis: {},
    optimizedContent: '',
    changes: [],
    metrics: {
      before: {
        overall: 0,
        keywords: 0,
        skills: 0,
        experience: 0,
        education: 0,
        personalization: 0,
        aiReadiness: 0,
        confidence: 0,
        relevance: 0,
        clarity: 0,
        impact: 0
      },
      after: {
        overall: 0,
        keywords: 0,
        skills: 0,
        experience: 0,
        education: 0,
        personalization: 0,
        aiReadiness: 0,
        confidence: 0,
        relevance: 0,
        clarity: 0,
        impact: 0
      }
    },
    analysis: {
      strengths: [],
      improvements: [],
      gaps: [],
      suggestions: []
    },
    resumeContent: {
      professionalSummary: '',
      skills: {
        technical: [],
        soft: [],
        certifications: []
      },
      experience: [],
      education: [],
      projects: [],
      awards: [],
      volunteerWork: [],
      languages: [],
      publications: []
    },
    contactInfo: {
      fullName: '',
      email: '',
      phone: '',
      location: {
        city: '',
        state: '',
        country: ''
      },
      linkedin: '',
      portfolio: '',
      github: ''
    }
  };

  try {
    // Step 1: Extract Job Details
    state.currentStep = 'extracting_details';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Extracting job details');
    
    try {
      const jobDetailsResult = await executeWithTimeout(
        async () => {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Extract key details from this job description and return them in a structured JSON format with the following fields:
                {
                  "title": "job title",
                  "company": "company name",
                  "location": "job location",
                  "description": "concise description",
                  "requirements": ["key requirement 1", "key requirement 2", ...],
                  "skills": ["required skill 1", "required skill 2", ...],
                  "level": "entry|mid|senior",
                  "employmentType": "full-time|part-time|contract"
                }`
              },
              {
                role: "user",
                content: jobDescription
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          return JSON.parse(response.choices[0].message.content || "{}");
        },
        30000, // 30 second timeout
        'Job details extraction timed out'
      );
      
      state.jobDetails = jobDetailsResult;
      
      // Save job details to temporary storage
      await storage.saveOptimizationStep({
        sessionId: state.sessionId,
        step: 'job_details',
        data: state.jobDetails
      });
      
    } catch (error) {
      logger.error('[Optimize] Error extracting job details:', error);
      throw new StepError('Failed to extract job details', 'EXTRACTION_ERROR', state.currentStep);
    }

    // Step 2: Parse Resume
    state.currentStep = 'parsing_resume';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Parsing resume content');
    
    try {
      const parsedResumeResult = await executeWithTimeout(
        async () => {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Parse the resume and extract structured information in JSON format with these fields:
                {
                  "contactInfo": {
                    "fullName": "",
                    "email": "",
                    "phone": "",
                    "location": {
                      "city": "",
                      "state": "",
                      "country": ""
                    },
                    "linkedin": "",
                    "portfolio": "",
                    "github": ""
                  },
                  "professionalSummary": "",
                  "skills": {
                    "technical": [],
                    "soft": [],
                    "certifications": []
                  },
                  "experience": [
                    {
                      "title": "",
                      "company": "",
                      "location": "",
                      "startDate": "",
                      "endDate": "",
                      "achievements": []
                    }
                  ],
                  "education": [
                    {
                      "degree": "",
                      "institution": "",
                      "location": "",
                      "graduationDate": "",
                      "gpa": "",
                      "honors": []
                    }
                  ],
                  "projects": [
                    {
                      "name": "",
                      "description": "",
                      "technologies": [],
                      "url": ""
                    }
                  ],
                  "awards": [],
                  "volunteerWork": [],
                  "languages": [],
                  "publications": []
                }`
              },
              {
                role: "user",
                content: resumeText
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          return JSON.parse(response.choices[0].message.content || "{}");
        },
        60000, // 60 second timeout
        'Resume parsing timed out'
      );
      
      state.parsedResume = parsedResumeResult;
      state.resumeContent = parsedResumeResult; // Store parsed content in resumeContent
      state.contactInfo = parsedResumeResult.contactInfo || state.contactInfo;
      
      // Save parsed resume to temporary storage
      await storage.saveOptimizationStep({
        sessionId: state.sessionId,
        step: 'parsed_resume',
        data: state.parsedResume
      });
      
    } catch (error) {
      logger.error('[Optimize] Error parsing resume:', error);
      throw new StepError('Failed to parse resume', 'PARSING_ERROR', state.currentStep);
    }

    // Step 3: Analyze Job Requirements
    state.currentStep = 'analyzing_description';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Analyzing job requirements');
    
    try {
      const jobAnalysisResult = await executeWithTimeout(
        async () => {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Analyze this job description and extract:
                1. Required skills and competencies
                2. Required experience level
                3. Key responsibilities
                4. Primary and secondary requirements
                5. Industry-specific terminology

                Return as JSON:
                {
                  "skills": ["skill1", "skill2"],
                  "experienceLevel": "entry|mid|senior",
                  "responsibilities": ["resp1", "resp2"],
                  "primaryRequirements": ["req1", "req2"],
                  "secondaryRequirements": ["req1", "req2"],
                  "keyTerminology": ["term1", "term2"]
                }`
              },
              {
                role: "user",
                content: jobDescription
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          return JSON.parse(response.choices[0].message.content || "{}");
        },
        30000, // 30 second timeout
        'Job analysis timed out'
      );
      
      state.jobAnalysis = jobAnalysisResult;
      
      // Save job analysis to temporary storage
      await storage.saveOptimizationStep({
        sessionId: state.sessionId,
        step: 'job_analysis',
        data: state.jobAnalysis
      });
      
    } catch (error) {
      logger.error('[Optimize] Error analyzing job:', error);
      throw new StepError('Failed to analyze job requirements', 'ANALYSIS_ERROR', state.currentStep);
    }

    // Step 4: Perform resume optimization using separate function
    state.currentStep = 'optimizing_resume';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Optimizing resume content');

    try {
      const optimizationResult = await executeWithTimeout(
        async () => {
          return await performResumeOptimization(
            resumeText, 
            jobDescription, 
            state.jobAnalysis, 
            onStatusUpdate
          );
        },
        120000, // 120 second timeout
        'Resume optimization timed out'
      );

      state.optimizedContent = optimizationResult.optimizedContent;
      state.changes = optimizationResult.changes;
      state.resumeContent = optimizationResult.resumeContent || state.resumeContent;
      state.analysis = optimizationResult.analysis || state.analysis;
      
      // Save optimized content to temporary storage
      await storage.saveOptimizationStep({
        sessionId: state.sessionId,
        step: 'optimized_content',
        data: {
          content: state.optimizedContent,
          changes: state.changes,
          resumeContent: state.resumeContent,
          analysis: state.analysis
        }
      });
      
    } catch (error) {
      logger.error('[Optimize] Error optimizing resume:', error);
      throw new StepError('Failed to optimize resume content', 'OPTIMIZATION_ERROR', state.currentStep);
    }

    // Step 5: Generate metrics
    state.currentStep = 'calculating_metrics';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Calculating metrics');
    
    try {
      const metricsResult = await executeWithTimeout(
        async () => {
          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Compare the original resume against the job description, then compare the optimized resume against the job description.
                Score both on a scale of 0-100 for these metrics:
                - overall: Overall match with job requirements
                - keywords: Presence of job-specific keywords
                - skills: Match of skills with requirements
                - experience: Relevance of experience to the role
                - education: Relevance of education to requirements
                - personalization: How tailored the resume is to this role
                - aiReadiness: ATS compatibility
                - confidence: Quality and professionalism
                - relevance: Overall relevance to the position
                - clarity: Clarity and readability
                - impact: Impact of achievements

                Return as JSON:
                {
                  "before": {
                    "overall": 0,
                    "keywords": 0,
                    ... all metrics
                  },
                  "after": {
                    "overall": 0,
                    "keywords": 0,
                    ... all metrics
                  }
                }`
              },
              {
                role: "user",
                content: `Original Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}\n\nOptimized Resume:\n${state.optimizedContent}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
          });
          return JSON.parse(response.choices[0].message.content || "{}");
        },
        30000, // 30 second timeout
        'Metrics calculation timed out'
      );
      
      state.metrics = metricsResult;
      
      // Save metrics to temporary storage
      await storage.saveOptimizationStep({
        sessionId: state.sessionId,
        step: 'metrics',
        data: state.metrics
      });
      
    } catch (error) {
      // Non-fatal - continue with default metrics
      logger.warn('[Optimize] Error calculating metrics:', error);
      // We'll continue with default metrics
    }

    // Final step: Return complete result
    logger.info('[Optimize] Optimization process completed successfully');
    
    return {
      sessionId: state.sessionId,
      optimisedResume: state.optimizedContent,
      jobDetails: state.jobDetails,
      resumeContent: state.resumeContent,
      contactInfo: state.contactInfo,
      metrics: state.metrics,
      analysis: state.analysis,
      changes: state.changes
    };
    
  } catch (error: any) {
    // Handle step-specific errors
    if (error instanceof StepError) {
      logger.error(`[Optimize] Error in step ${error.step}: ${error.message}`);
      throw new Error(`Failed to ${error.step.replace('_', ' ')}: ${error.message}`);
    }
    
    // Handle general errors
    logger.error('[Optimize] Optimization process failed:', error);
    throw new Error(error.message || 'Failed to generate optimized content');
  }
}

// Helper function for resume optimization
async function performResumeOptimization(
  resumeText: string,
  jobDescription: string,
  jobAnalysis: any,
  onStatusUpdate: (status: any) => void
): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Act as an expert resume optimizer with deep knowledge of industry-specific job roles and applicant tracking systems (ATS). Optimize this resume based on the job description using the following structured format:

1. Contact Information: maintain original contact details but format them professionally
2. Professional Summary: create a compelling summary that highlights skills and experience relevant to the job
3. Skills: reorganize skills to prioritize those matching job requirements
4. Professional Experience: reformat work history emphasizing achievements relevant to the job
5. Education: maintain but format according to industry standards

Tailor the resume by:
- Incorporating key terminology from the job description
- Restructuring content to highlight matching qualifications
- Adding metrics and achievements that demonstrate required competencies
- Ensuring ATS compatibility with standard headings and formatting

Return a complete JSON response with:
{
  "optimizedContent": "complete optimized resume with proper formatting",
  "changes": ["list of specific improvements made"],
  "resumeContent": {
    "professionalSummary": "",
    "skills": {
      "technical": [],
      "soft": [],
      "certifications": []
    },
    "experience": [...],
    "education": [...],
    "projects": [...],
    "awards": [...],
    "volunteerWork": [...],
    "languages": [...],
    "publications": [...]
  },
  "analysis": {
    "strengths": ["key strengths identified"],
    "improvements": ["areas improved"],
    "gaps": ["identified gaps"],
    "suggestions": ["specific suggestions"]
  }
}`
        },
        {
          role: "user",
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}\n\nJob Analysis:\n${JSON.stringify(jobAnalysis)}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 4000
    });

    if (!response.choices[0].message.content) {
      throw new Error("No content received from optimization request");
    }

    const result = JSON.parse(response.choices[0].message.content);
    
    // Validate result structure
    if (!result.optimizedContent || result.optimizedContent.length < 100) {
      throw new Error("Insufficient optimized content generated");
    }
    
    return result;
  } catch (error) {
    console.error("Resume optimization error:", error);
    throw error;
  }
}
