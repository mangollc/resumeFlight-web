import { openai } from '../openai';
import { logger } from './logger';

// Define step types for better tracking
export type OptimizationStep = 
  | 'started' 
  | 'extracting_details'
  | 'analyzing_description'
  | 'optimizing_resume'
  | 'generating_analysis'
  | 'completed'
  | 'error';

// State for tracking optimization progress
export interface OptimizationState {
  resumeText: string;
  jobDescription: string;
  jobDetails?: any;
  jobAnalysis?: any;
  optimizedContent?: string;
  changes?: string[];
  analysis?: {
    strengths: string[];
    improvements: string[];
    gaps: string[];
    suggestions: string[];
  };
  currentStep: OptimizationStep;
  error?: string;
  errorCode?: string;
}

export async function optimizeResume(
  resumeText: string, 
  jobDescription: string, 
  onStatusUpdate: (status: any) => void
): Promise<any> {
  // Initialize optimization state
  const state: OptimizationState = {
    resumeText,
    jobDescription,
    currentStep: 'started'
  };

  // Report initial status
  onStatusUpdate({ status: state.currentStep });
  logger.info('[Optimize] Starting resume optimization process');

  try {
    // Step 1: Extract job details
    state.currentStep = 'extracting_details';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Extracting job details');

    // Use a timeout promise for each step
    try {
      state.jobDetails = await executeWithTimeout(
        async () => {
          // Simple job parsing logic
          return {
            title: jobDescription.match(/job title|position/i) 
              ? jobDescription.match(/job title|position/i)[0] 
              : 'Not specified',
            company: jobDescription.match(/company|organization/i)
              ? jobDescription.match(/company|organization/i)[0]
              : 'Not specified',
          };
        },
        30000, // 30 second timeout
        'Job details extraction timed out'
      );
    } catch (error) {
      logger.error('[Optimize] Error extracting job details:', error);
      throw new StepError('Failed to extract job details', 'EXTRACTION_ERROR', state.currentStep);
    }

    // Step 2: Analyze job requirements
    state.currentStep = 'analyzing_description';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Analyzing job requirements');

    try {
      state.jobAnalysis = await executeWithTimeout(
        async () => {
          return await analyzeJobDescription(jobDescription);
        },
        60000, // 60 second timeout
        'Job analysis timed out'
      );
    } catch (error) {
      logger.error('[Optimize] Error analyzing job description:', error);
      throw new StepError('Failed to analyze job description', 'ANALYSIS_ERROR', state.currentStep);
    }

    // Step 3: Optimize resume
    state.currentStep = 'optimizing_resume';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Optimizing resume content');

    try {
      const optimizationResult = await executeWithTimeout(
        async () => {
          return await performResumeOptimization(resumeText, jobDescription, state.jobAnalysis, onStatusUpdate);
        },
        120000, // 120 second timeout
        'Resume optimization timed out'
      );

      state.optimizedContent = optimizationResult.optimizedContent;
      state.changes = optimizationResult.changes;
    } catch (error) {
      logger.error('[Optimize] Error optimizing resume:', error);
      throw new StepError('Failed to optimize resume content', 'OPTIMIZATION_ERROR', state.currentStep);
    }

    // Final step: Generate analysis
    state.currentStep = 'generating_analysis';
    onStatusUpdate({ status: state.currentStep });
    logger.info('[Optimize] Generating final analysis');

    try {
      state.analysis = await executeWithTimeout(
        async () => {
          return await generateAnalysis(state.optimizedContent, jobDescription);
        },
        30000, // 30 second timeout
        'Analysis generation timed out'
      );
    } catch (error) {
      logger.error('[Optimize] Error generating analysis:', error);
      // Continue even if analysis fails
      state.analysis = {
        strengths: ['Tailored to the job requirements'],
        improvements: ['Resume structure optimized for ATS'],
        gaps: [],
        suggestions: ['Review the optimized content carefully']
      };
    }

    // Mark as completed
    state.currentStep = 'completed';
    onStatusUpdate({ 
      status: state.currentStep,
      data: {
        optimizedContent: state.optimizedContent,
        changes: state.changes,
        analysis: state.analysis
      }
    });

    logger.success('[Optimize] Resume optimization completed successfully');

    return {
      optimisedResume: state.optimizedContent,
      changes: state.changes,
      analysis: state.analysis
    };
  } catch (error) {
    const errorDetails = error instanceof StepError 
      ? { step: error.step, code: error.code, message: error.message }
      : { step: state.currentStep, code: 'UNKNOWN_ERROR', message: error.message || 'Unknown error occurred' };

    // Send error status update
    onStatusUpdate({ 
      status: 'error', 
      message: errorDetails.message,
      code: errorDetails.code,
      step: errorDetails.step
    });

    logger.error(`[Optimize] Error during ${errorDetails.step}:`, error);

    // Re-throw with enhanced information
    const enhancedError = new Error(errorDetails.message);
    enhancedError.code = errorDetails.code;
    enhancedError.step = errorDetails.step;
    throw enhancedError;
  }
}

// Helper to execute a function with a timeout
async function executeWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const timeoutError = new Error(timeoutMessage);
        timeoutError.code = 'TIMEOUT_ERROR';
        reject(timeoutError);
      }, timeoutMs);
    })
  ]);
}

// Custom error class for step-specific errors
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

// Helper functions for each optimization step
async function analyzeJobDescription(jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the job posting and extract:
1. Key requirements
2. Required skills and technologies
3. Experience level
4. Brief analysis of the role

Return JSON in this format:
{
  "requirements": ["req1", "req2"],
  "skills": ["skill1", "skill2"],
  "level": "entry|mid|senior|manager",
  "analysis": "brief analysis"
}`
        },
        {
          role: "user",
          content: jobDescription
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    return JSON.parse(response.choices[0].message.content || "{}");
  } catch (error) {
    logger.error("[Job Analysis] Error:", error);
    throw new Error(`Failed to analyze job description: ${error.message}`);
  }
}

// Split text into chunks for processing
function splitIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
  if (!text) return [];

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

async function performResumeOptimization(resumeText: string, jobDescription: string, jobAnalysis: any, sendStatus: (status: any) => void) {
  try {
    // Process resume in chunks to prevent timeouts
    const resumeChunks = splitIntoChunks(resumeText);
    const jobDescriptionChunks = splitIntoChunks(jobDescription);

    logger.info(`[Resume Optimization] Processing resume in ${resumeChunks.length} chunks`);

    let optimizedChunks: string[] = [];
    let allChanges: string[] = [];

    // Process each chunk with retries
    try {
      for (let i = 0; i < resumeChunks.length; i++) {
        sendStatus({ 
          status: "optimizing_resume", 
          step: "resume_processing",
          progress: Math.round(((i + 1) / resumeChunks.length) * 100),
          message: `Processing section ${i + 1} of ${resumeChunks.length}`
        });

        let attempts = 0;
        let success = false;
        let response;

        while (attempts < 3 && !success) {
          try {
            response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                {
                  role: "system",
                  content: `Act as an expert resume optimizer. Optimize this section of the resume based on the job requirements. Follow ATS best practices.

Return a JSON object with:
{
  "optimizedContent": "the enhanced resume section",
  "changes": ["list specific improvements made"]
}`
                },
                {
                  role: "user",
                  content: `Resume Section ${i + 1}/${resumeChunks.length}:\n${resumeChunks[i]}\n\nJob Description:\n${jobDescriptionChunks.join("\n\n")}\n\nKey Skills Required: ${jobAnalysis?.skills?.join(", ") || ""}`
                }
              ],
              response_format: { type: "json_object" },
              temperature: 0.3,
              max_tokens: 4000
            });
            success = true;
          } catch (error) {
            attempts++;
            if (attempts === 3) throw error;
            await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
          }
        }

        if (!response || !response.choices[0].message.content) {
          throw new Error("No response received from optimization service");
        }

        const result = JSON.parse(response.choices[0].message.content);
        optimizedChunks.push(result.optimizedContent || "");
        if (result.changes) allChanges.push(...result.changes);

        // Add a small delay between chunks to prevent rate limiting
        if (i < resumeChunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error('Error processing resume chunks:', error);
      throw new Error(`Resume chunk processing failed: ${error.message}`);
    }


    // Join the optimized chunks
    const finalContent = optimizedChunks.join("\n\n").trim();

    // Validate final content
    if (!finalContent || finalContent.length < 50) {
      throw new Error('Optimization produced insufficient content');
    }

    return {
      optimizedContent: finalContent,
      changes: allChanges
    };
  } catch (error) {
    logger.error("[Resume Optimization] Error:", error);
    throw error;
  }
}

async function generateAnalysis(optimizedResume: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the optimized resume against the job description and provide feedback.

Return a JSON object with:
{
  "analysis": {
    "strengths": ["key strengths identified"],
    "improvements": ["areas that were improved"],
    "gaps": ["remaining gaps to address"],
    "suggestions": ["actionable suggestions"]
  }
}`
        },
        {
          role: "user",
          content: `Optimized Resume:\n${optimizedResume}\n\nJob Description:\n${jobDescription}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 2000
    });

    if (!response || !response.choices[0].message.content) {
      throw new Error("No analysis response received");
    }

    const result = JSON.parse(response.choices[0].message.content);
    return result.analysis || {
      strengths: [],
      improvements: [],
      gaps: [],
      suggestions: []
    };
  } catch (error) {
    logger.error("[Analysis] Error:", error);
    throw error;
  }
}