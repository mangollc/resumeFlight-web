import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set. Please set it to use OpenAI features.");
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeResumeDifferences(originalContent: string, optimizedContent: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume analyst. Compare the original and optimized versions of a resume and identify meaningful changes.
Return a JSON object with the following structure:
{
  "changes": [
    {
      "original": "text from original resume",
      "optimized": "corresponding text from optimized resume",
      "type": "improvement type (e.g., 'clarity', 'keywords', 'structure', 'accomplishments')",
      "reason": "brief explanation of why this change improves the resume"
    }
  ]
}`
        },
        {
          role: "user",
          content: `Original Resume:\n${originalContent}\n\nOptimized Resume:\n${optimizedContent}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    return JSON.parse(content);
  } catch (err) {
    const error = err as Error;
    console.error("[Differences] Analysis error:", error);
    throw new Error(`Failed to analyze resume differences: ${error.message}`);
  }
}

export async function optimizeResume(resumeText: string, jobDescription: string, currentVersion?: number) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimizer specializing in ATS optimization and professional resume enhancement. Your task is to create a highly optimized version of the resume that maximizes match with the job description while maintaining authenticity and professionalism.

Follow these optimization guidelines:
1. Analyze job requirements thoroughly to identify:
   - Required technical skills and qualifications
   - Soft skills and experience levels
   - Industry-specific keywords and terminology
   - Key responsibilities and expectations

2. Enhance the resume by:
   - Restructuring content to highlight most relevant experience first
   - Using exact keywords from job description where truthful
   - Quantifying achievements with metrics where possible
   - Improving clarity and impact of accomplishment statements
   - Ensuring proper formatting and professional language
   - Incorporating industry-standard terms and skills${currentVersion ? '\n   - Building upon previous optimizations while making further improvements' : ''}

3. Maintain authenticity by:
   - Only using information present in the original resume
   - Not adding fictional experience or skills
   - Keeping all dates and company names accurate
   - Preserving the core truth of all statements

Return valid JSON in this exact format, no markdown:
{
  "optimizedContent": "the enhanced resume text with proper formatting",
  "changes": [
    "list of specific improvements made",
    "keywords added or emphasized",
    "structural changes"
  ],
  "matchScore": 85,
  "improvements": {
    "keywords": "description of keyword optimizations",
    "structure": "description of structural changes",
    "clarity": "description of clarity improvements",
    "ats": "description of ATS-specific enhancements"
  }
}`
        },
        {
          role: "user",
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}${
            currentVersion ? `\n\nThis is reoptimization attempt. Current version: ${currentVersion}. Please make additional improvements while maintaining previous optimizations.` : ''
          }`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);

    // Validate the response format
    if (!result.optimizedContent || typeof result.optimizedContent !== 'string') {
      throw new Error("Invalid optimization result: missing or invalid optimized content");
    }

    // Ensure we have a valid match score
    const matchScore = typeof result.matchScore === 'number' ? 
      Math.min(100, Math.max(0, result.matchScore)) : 
      75; // Default score if not provided

    return {
      ...result,
      matchScore,
      optimizedContent: result.optimizedContent.trim()
    };
  } catch (err) {
    const error = err as Error;
    console.error("[Optimize] Error in optimizeResume:", error);
    throw new Error(`Failed to optimize resume: ${error.message}`);
  }
}

export async function generateCoverLetter(resumeText: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert cover letter writer specializing in creating compelling, personalized cover letters. Create a professional cover letter that connects the candidate's experience from their resume to the specific job requirements.

Guidelines:

1. Use only information available in the resume and job description. DO NOT add any placeholder or default information.

2. Format:
   [Name from resume]
   [Email if present in resume]
   [Phone if present in resume]

   [Today's Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}]

   Dear Hiring Manager,

   [3-4 paragraphs of content]

   Best regards,
   [Name from resume]

3. Content Guidelines:
   - Opening: Express enthusiasm for the specific position (use exact job title from description)
   - Body: Connect candidate's experience to job requirements using specific examples
   - Highlight 2-3 most relevant achievements that match job requirements
   - Closing: Include call to action

4. Key Rules:
   - Only include contact details that are present in the resume
   - Do not add placeholder text for missing information
   - Keep content focused on matching candidate skills to job requirements
   - Use natural, professional language
   - Keep paragraphs concise and impactful
   - Do not include any comments, suggestions, or revision marks
   - Ensure the output is ready for direct submission
   - Do not include any explanatory notes or formatting instructions

Return valid JSON in this exact format, no markdown:
{
  "coverLetter": "the generated cover letter with proper formatting",
  "highlights": [
    "key qualifications emphasized",
    "specific achievements mentioned",
    "job requirement alignments"
  ],
  "confidence": 85
}`
        },
        {
          role: "user",
          content: `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const result = JSON.parse(content);
    return {
      ...result,
      coverLetter: result.coverLetter.trim(),
      confidence: typeof result.confidence === 'number' ? 
        Math.min(100, Math.max(0, result.confidence)) : 
        85
    };
  } catch (err) {
    const error = err as Error;
    console.error("[Cover Letter] Error:", error);
    throw new Error(`Failed to generate cover letter: ${error.message}`);
  }
}