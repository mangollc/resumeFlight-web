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
const handleOpenAIError = (error: any, context: string) => {
  const errorDetails = {
    message: error.message,
    status: error.status,
    code: error.code,
    type: error.type,
    param: error.param
  };

  console.error(`[${context}] Error:`, errorDetails);

  if (error.code === 'rate_limit_exceeded') {
    throw new Error('Rate limit exceeded. Please try again in a few moments.');
  }

  if (error.code === 'context_length_exceeded') {
    throw new Error('Input text is too long. Please reduce the content length.');
  }

  if (error.code === 'invalid_api_key') {
    throw new Error('OpenAI API key is invalid or expired.');
  }

  throw new Error(`Failed in ${context}: ${error.message || 'Unknown error occurred'}`);
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
    console.log("[OpenAI] Starting resume optimization...");
    const optimizationVersion = version || 1.0;
    const resumeChunks = splitIntoChunks(resumeText, 6000);
    const jobDescriptionChunks = splitIntoChunks(jobDescription, 6000);

    console.log(`[OpenAI] Processing ${resumeChunks.length} chunks`);

    let optimizedChunks: string[] = [];
    let allChanges: string[] = [];

    for (let i = 0; i < resumeChunks.length; i++) {
      console.log(`[OpenAI] Processing chunk ${i + 1}/${resumeChunks.length}`);
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
   - List in reverse chronological order
   - Include job title, company name, location, and dates
   - Focus on achievements with quantifiable results
   - Use strong action verbs and emphasize metrics (%, $, time saved)

5. Education
   - Include degree, institution name, graduation date
   - Mention honors or relevant coursework if applicable

6. Certifications (if applicable)
   - List relevant certifications with issuing organization and date

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
          success = true;
        } catch (error: any) {
          attempts++;
          console.error(`[OpenAI] Attempt ${attempts} failed:`, error);
          if (attempts === 3) throw error;
          await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
        }
      }

      if (!response || !response.choices[0].message.content) {
        throw new Error("No response received from OpenAI");
      }

      const result = JSON.parse(response.choices[0].message.content);

      if (!result.optimizedContent) {
        console.error("[OpenAI] Missing optimized content in chunk response:", result);
        throw new Error("Invalid optimization result: missing content");
      }

      optimizedChunks.push(result.optimizedContent);
      if (result.changes) allChanges.push(...result.changes);
    }

    console.log("[OpenAI] All chunks processed successfully");

    // Combine chunks and validate
    const combinedContent = optimizedChunks.join("\n\n").trim();
    if (!combinedContent) {
      throw new Error("Failed to generate optimized content");
    }


    return {
      optimisedResume: combinedContent,
      changes: allChanges,
      analysis: {
        strengths: [],
        improvements: [],
        gaps: [],
        suggestions: []
      }
    };
  } catch (error: any) {
    console.error("[OpenAI] Optimization error:", error);
    throw new Error(`Failed to optimize resume: ${error.message}`);
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