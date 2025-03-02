import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY environment variable is not set. Please set it to use OpenAI features.",
  );
}

export const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
});

export async function analyzeJobPosting(description: string): Promise<{
  requirements: string[];
  skills: string[];
  level: string;
  analysis: string;
}> {
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
          content: description
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error: any) {
    console.error("Error analyzing job posting:", error);
    throw error;
  }
}

/**
 * Utility function to split text into chunks with optimized size for GPT-4o
 */
function splitIntoChunks(text: string | undefined, maxChunkSize: number = 8000): string[] {
  if (!text) {
    return []; // Return empty array instead of throwing error
  }

  const chunks: string[] = [];
  const paragraphs = text.split("\n\n");
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    // Check if adding this paragraph would exceed the chunk size
    if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
      // If the current chunk is getting too large, save it and start a new one
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      // Otherwise, add the paragraph to the current chunk
      currentChunk = currentChunk
        ? `${currentChunk}\n\n${paragraph}`
        : paragraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// OpenAI error handler with retries and better error classification
import { logger } from './utils/logger';

const handleOpenAIError = (error: any, context: string) => {
  // Extract and standardize error details
  const errorDetails = {
    message: error.message || 'Unknown OpenAI error',
    status: error.status || error.response?.status,
    code: error.code || error.response?.data?.error?.code || 'OPENAI_ERROR',
    type: error.type || error.response?.data?.error?.type,
    param: error.param || error.response?.data?.error?.param
  };

  // Log the detailed error
  logger.error(`OpenAI API error in ${context}`, error, errorDetails);

  // Create a custom error object with status and code
  const customError = new Error(getOpenAIErrorMessage(errorDetails));
  customError.code = errorDetails.code;
  customError.status = errorDetails.status || 500;

  throw customError;
};

// Helper to generate user-friendly error messages based on error code
const getOpenAIErrorMessage = (errorDetails: any) => {
  const { code } = errorDetails;

  switch (code) {
    case 'rate_limit_exceeded':
      return 'Our AI service is currently experiencing high demand. Please try again in a few moments.';

    case 'context_length_exceeded':
      return 'The resume or job description is too long. Please reduce the text length and try again.';

    case 'invalid_api_key':
      return 'Authentication error with our AI service. Please contact support if this persists.';

    case 'tokens_exceeded':
      return 'The content is too large to process. Please reduce the text and try again.';

    case 'content_filter':
      return 'Your content contains inappropriate material that cannot be processed.';

    case 'server_error':
      return 'Our AI service is experiencing temporary issues. Please try again shortly.';

    case 'insufficient_quota':
      return 'Service usage limit reached. Please try again later or contact support.';

    default:
      return `AI optimization error: ${errorDetails.message || 'Unknown error occurred'}`;
  }
};

// Analysis functions
export async function analyzeResumeDifferences(
  originalContent: string,
  optimizedContent: string,
) {
  try {
    // Use larger chunks for difference analysis
    const originalChunks = splitIntoChunks(originalContent);
    const optimizedChunks = splitIntoChunks(optimizedContent);
    const maxChunks = Math.min(originalChunks.length, optimizedChunks.length);

    const allChanges: any[] = [];
    console.log(`[Differences] Processing ${maxChunks} chunks`);

    for (let i = 0; i < maxChunks; i++) {
      console.log(`[Differences] Analyzing chunk ${i + 1}/${maxChunks}`);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume analyst. Compare the original and optimized versions of a resume and identify meaningful changes. Provide detailed analysis and scoring, with special attention to education, personalization, and ATS compatibility. Return a JSON object with the following structure:

{
  "changes": [
    {
      "original": "text from original resume",
      "optimized": "corresponding text from optimized resume",
      "type": "type of change",
      "reason": "explanation of improvement",
      "score": number
    }
  ],
  "scores": {
    "keywords": number,
    "skills": number,
    "experience": number,
    "education": number,
    "personalization": number,
    "aiReadiness": number
  },
  "overallScore": number
}

Ensure each score is calculated based on:
- Education: Check degree relevance, certifications, training
- Personalization: Measure alignment with job requirements
- AI Readiness: Evaluate ATS compatibility and formatting`,
          },
          {
            role: "user",
            content: `Original Resume Section ${i + 1}/${maxChunks}:\n${originalChunks[i]}\n\nOptimized Resume Section ${i + 1}/${maxChunks}:\n${optimizedChunks[i]}`,
          },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);
      allChanges.push(...(result.changes || []));
    }

    return { changes: allChanges, overallScore: result.overallScore, scores: result.scores };
  } catch (err) {
    const error = err as Error;
    console.error("[Differences] Analysis error:", error);
    throw new Error(`Failed to analyze resume differences: ${error.message}`);
  }
}

export async function optimizeResume(
  resumeText: string,
  jobDescription: string,
  version?: number,
): Promise<{ 
  optimisedResume: string; 
  changes: string[]; 
  analysis: {
    strengths: string[];
    improvements: string[];
    gaps: string[];
    suggestions: string[];
  }
}> {
  if (!resumeText || !jobDescription) {
    throw new Error("Both resume text and job description are required for optimization");
  }

  try {
    const optimizationVersion = version || 1.0;
    // Use much smaller chunks to prevent timeouts
    const resumeChunks = splitIntoChunks(resumeText, 2000);
    const jobDescriptionChunks = splitIntoChunks(jobDescription, 2000);
    
    // Log diagnostic info
    logger.info(`[Optimize] Resume length: ${resumeText.length} chars, ${resumeChunks.length} chunks`);
    logger.info(`[Optimize] Job description length: ${jobDescription.length} chars, ${jobDescriptionChunks.length} chunks`);

    console.log(`[Optimize] Starting resume optimization...`);
    console.log(`[Optimize] Version: ${optimizationVersion}`);
    console.log(`[Optimize] Processing resume in ${resumeChunks.length} chunks`);

    let optimizedChunks: string[] = [];
    let allChanges: string[] = [];
    
    // Use a reference we can clear later
    let globalTimeoutId: NodeJS.Timeout | null = null;
    
    // Create a promise that will reject after the timeout
    const timeoutPromise = new Promise((_, reject) => {
      globalTimeoutId = setTimeout(() => {
        reject({
          message: 'Resume optimization timed out',
          code: 'TIMEOUT_ERROR',
          status: 408
        });
      }, 90000); // 90 second global timeout
    });

    // First optimize the resume content with retries and timeout
    for (let i = 0; i < resumeChunks.length; i++) {
      console.log(`[Optimize] Processing chunk ${i + 1}/${resumeChunks.length}`);
      let attempts = 0;
      let success = false;
      let response;

      while (attempts < 3 && !success) {
        try {
          // Race the OpenAI call against our timeout
          response = await Promise.race([
            openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `Act as an expert resume optimizer with deep knowledge of industry-specific job roles and applicant tracking systems (ATS). Optimize this section of the resume based on the job description using the following structured format:

1. Contact Information
   - Full Name (prominently displayed)
   - Phone Number
   - Email Address
   - LinkedIn Profile (if provided)
   - Location (City/State)

2. Professional Summary (2-4 sentences)
   - Overview of professional background, key skills, and career goals
   - Tailored to job description with relevant keywords
   - Focus on most relevant expertise and achievements

3. Skills
   - Highlight both technical and soft skills relevant to the target role
   - Organize in bullet points or a clean table format
   - Categorize into sections if appropriate (Technical/Soft Skills)

4. Professional Experience

   Reverse Chronological Order:
   - List your most recent position first, followed by previous roles.

   Essential Details:
   - Include official job title, company name, location (city/state), and employment dates for each position.

   Focused Bullet Points:
   - Aim for 3–6 bullet points to showcase impactful achievements and responsibilities.

   Achievement-Focused:
   - Demonstrate value added with quantifiable metrics (e.g., percentages, dollars, time saved).

   Powerful Action Verbs:
   - Use strong, precise verbs for each bullet (e.g., Spearheaded, Improved, Drove).

   Relevant Metrics:
   - Highlight outcomes like time saved, costs reduced, revenue generated, or efficiency increases.

   Concise & Targeted:
   - Keep bullet points one or two lines, focusing on key achievements matching the targeted job.

   Tailored Keywords:
   - Integrate industry-specific terms or keywords from the job description for ATS compatibility.

   Context & Impact:
   - Provide scope of role (e.g., team size, budget managed) to help understand responsibilities.

5. Education
   - Include degree, institution name, graduation date
   - Mention honors or relevant coursework if applicable

6. Certifications (if applicable)
   - List relevant certifications with issuing organization and date

7. Optional sections (if relevant and space permits)
   - Projects, Awards & Achievements, Publications

Ensure the resume is:
- ATS-compliant with standard fonts and clear headings
- Highlighting major accomplishments and metrics
- Optimized with keywords from the job description
- Proofread for grammar, consistency, and clarity

1. Identify and incorporate key terms, phrases, and industry jargon from the job description
2. Rewrite the professional summary to directly reflect core responsibilities and qualifications
3. Reorganize work experience to emphasize accomplishments matching the job description, using quantifiable metrics
4. Update skills section to include hard and soft skills mentioned in the job description
5. Ensure proper formatting for ATS compatibility
6. Tailor content to reflect industry-specific terminology and expectations

Return a JSON object with:
{
  "optimizedContent": "the enhanced resume section",
  "changes": ["list specific improvements made"],
  "sectionAnalysis": {
    "strengths": ["identified strengths"],
    "improvements": ["areas improved"],
    "gaps": ["identified gaps"],
    "suggestions": ["specific suggestions"]
  }
}`
              },
              {
                role: "user",
                content: `Resume Section ${i + 1}/${resumeChunks.length}:\n${resumeChunks[i]}\n\nJob Description:\n${jobDescriptionChunks.join("\n\n")}`
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
            max_tokens: 4000
          });
          }),
            timeoutPromise
          ]);
          success = true;
        } catch (error: any) {
          logger.warn(`[Optimize] Error processing chunk ${i+1} (attempt ${attempts+1}/3):`, error);
          attempts++;
          
          // If we've exhausted all retries, rethrow
          if (attempts === 3) {
            logger.error(`[Optimize] Failed after all retries for chunk ${i+1}`, error);
            throw error;
          }
          
          // Exponential backoff with jitter
          const backoffTime = Math.floor(2000 * attempts * (0.9 + Math.random() * 0.2));
          logger.info(`[Optimize] Retrying in ${backoffTime}ms (attempt ${attempts+1}/3)`);
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }

      if (!response || !response.choices[0].message.content) {
        throw new Error("No response received from OpenAI");
      }

      const result = JSON.parse(response.choices[0].message.content);
      optimizedChunks.push(result.optimizedContent || "");
      if (result.changes) allChanges.push(...result.changes);
    }

    // Now perform overall analysis with retries and timeout
    let attempts = 0;
    let success = false;
    let analysisResponse;

    while (attempts < 3 && !success) {
      try {
        analysisResponse = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze the optimized resume against the job description and provide comprehensive feedback.
Evaluate how well the resume follows the structured format and addresses job requirements:

1. Structure Evaluation:
   - Proper formatting of contact information
   - Effectiveness of professional summary
   - Organization of skills section
   - Impact of professional experience descriptions
   - Presentation of education and certifications

2. Content Evaluation:
   - Incorporation of relevant keywords and industry terminology
   - Alignment of achievements with job requirements
   - Quantifiable results and metrics
   - Technical and soft skills coverage
   - Overall ATS compatibility

3. Improvement Assessment:
   - Compare original vs. optimized versions
   - Identify specific enhancements made
   - Evaluate keyword density and placement
   - Assess professional tone and clarity

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
              content: `Optimized Resume:\n${optimizedChunks.join("\n\n")}\n\nJob Description:\n${jobDescriptionChunks.join("\n\n")}`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3,
          max_tokens: 2000
        });
        success = true;
      } catch (error: any) {
        if (error.message.includes("timeout")) {
          logger.warn("[Optimize] Timeout error during analysis", error);
          throw new Error("OpenAI analysis request timed out"); //Explicit timeout error
        }
        attempts++;
        if (attempts === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      }
    }

    if (!analysisResponse || !analysisResponse.choices[0].message.content) {
      throw new Error("No analysis response received from OpenAI");
    }

    const analysisResult = JSON.parse(analysisResponse.choices[0].message.content);

    // Ensure the optimized content is properly stringified
    let finalContent;
    if (optimizedChunks.length === 0) {
      logger.warn("[Optimize] No content chunks received");
      const error = new Error('No optimized content generated');
      error.code = 'CONTENT_GENERATION_ERROR';
      throw error;
    } else if (optimizedChunks.every(chunk => typeof chunk === 'string')) {
      finalContent = optimizedChunks.join("\n\n").trim();
    } else {
      // Handle mixed content or object content
      finalContent = optimizedChunks
        .map(chunk => typeof chunk === 'object' ? JSON.stringify(chunk) : String(chunk))
        .join("\n\n")
        .trim();
    }

    // Validate final content
    if (!finalContent || finalContent.length < 50) {
      logger.warn("[Optimize] Insufficient optimized content", { 
        contentLength: finalContent?.length || 0,
        sample: finalContent?.substring(0, 100) 
      });
      const error = new Error('Optimization produced insufficient content');
      error.code = 'INSUFFICIENT_CONTENT_ERROR';
      throw error;
    }

    // Ensure we have a valid analysis result before accessing it
    let analysis = {
      strengths: [],
      improvements: [],
      gaps: [],
      suggestions: []
    };

    if (analysisResult && analysisResult.analysis) {
      analysis = {
        strengths: analysisResult.analysis.strengths || [],
        improvements: analysisResult.analysis.improvements || [],
        gaps: analysisResult.analysis.gaps || [],
        suggestions: analysisResult.analysis.suggestions || []
      };
    }

    // Clear the global timeout
    if (globalTimeoutId) {
      clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }
    
    const result = {
      optimisedResume: finalContent,
      changes: allChanges,
      analysis
    };

    logger.success("[Optimize] Resume optimization completed successfully", {
      contentLength: finalContent.length,
      changesCount: allChanges.length
    });

    return result;
  } catch (error: any) {
    // Clear the global timeout if it exists
    if (globalTimeoutId) {
      clearTimeout(globalTimeoutId);
      globalTimeoutId = null;
    }
    
    logger.error("[Optimize] Failed to optimize resume", error);

    // Handle timeout errors specifically
    if (error.message.includes('timeout') || error.code === 'TIMEOUT_ERROR') {
      const timeoutError = new Error('Resume optimization is taking longer than expected. Please try with a shorter resume or job description.');
      timeoutError.code = 'TIMEOUT_ERROR';
      timeoutError.status = 408;
      throw timeoutError;
    }

    // Create a structured error with status code
    const enhancedError = new Error(`Failed to optimize resume: ${error.message}`);
    enhancedError.code = error.code || 'OPTIMIZATION_ERROR';
    enhancedError.status = error.status || 422;

    throw enhancedError;
  }
}

export async function generateCoverLetter(
  resumeText: string,
  jobDescription: string,
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    address?: string;
  },
  version?: number,
) {
  try {
    const coverLetterVersion = parseFloat(version?.toString() || '1.0');
    const resumeChunks = splitIntoChunks(resumeText);
    const jobDescriptionChunks = splitIntoChunks(jobDescription);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert cover letter writer with years of experience in crafting compelling and professional cover letters tailored to specific job applications. Using the attached resume as a reference, create a professional cover letter that aligns with the following guidelines:

1. Format:
   ${contactInfo.fullName}
   ${contactInfo.email}
   ${contactInfo.phone}
   ${contactInfo.address ? `\n   ${contactInfo.address.split(',').slice(-3, -1).join(', ')}` : ''}

   ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}

   Dear Hiring Manager,

   [3-4 paragraphs of content:
   - Begin with a strong opening paragraph that captures attention and clearly states the position being applied for
   - Highlight key achievements and skills from the resume that directly relate to the job description
   - Use a professional yet engaging tone throughout the letter
   - Include specific examples of how qualifications and experiences make a strong fit
   - Conclude with a call to action, expressing enthusiasm for an interview]

   Best regards,
   ${contactInfo.fullName}

2. Content Guidelines:
   - Focus on the key matching points provided
   - Highlight the candidate's relevant strengths
   - Address the main job requirements
   - Keep it concise and impactful
   ${coverLetterVersion > 1 ? '\n3. Note: This is a revision. Create a distinct version while maintaining professional quality.' : ''}

Return JSON in this format:
{
  "coverLetter": "the generated cover letter with proper formatting",
  "highlights": ["key qualifications emphasized"],
  "confidence": <number between 0-100>,
  "version": ${coverLetterVersion}
}`,
        },
        {
          role: "user",
          content: `Resume:\n${resumeChunks.join("\n\n")}\n\nJob Description:\n${jobDescriptionChunks.join("\n\n")}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    return {
      content: result.coverLetter.trim(),
      highlights: result.highlights || [],
      confidence: typeof result.confidence === "number"
        ? Math.min(100, Math.max(0, result.confidence))
        : 85,
      version: coverLetterVersion,
    };
  } catch (err) {
    const error = err as Error;
    console.error("[Cover Letter] Error:", error);
    if (error.name === 'AbortError' || error.message?.includes('EventSource')) {
      throw new Error('Connection interrupted. Please try again.');
    } else {
      throw new Error(`Failed to generate cover letter: ${error.message}`);
    }
  }
}