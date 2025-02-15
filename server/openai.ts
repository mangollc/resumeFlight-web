import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is not set. Please set it to use OpenAI features.");
}

export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Utility function to split text into chunks
function splitIntoChunks(text: string, maxChunkSize: number = 4000): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');
  let currentChunk = '';

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

export async function analyzeResumeDifferences(originalContent: string, optimizedContent: string) {
  try {
    const originalChunks = splitIntoChunks(originalContent);
    const optimizedChunks = splitIntoChunks(optimizedContent);
    const maxChunks = Math.min(originalChunks.length, optimizedChunks.length);

    const allChanges: any[] = [];

    for (let i = 0; i < maxChunks; i++) {
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
            content: `Original Resume Section ${i + 1}/${maxChunks}:\n${originalChunks[i]}\n\nOptimized Resume Section ${i + 1}/${maxChunks}:\n${optimizedChunks[i]}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI");
      }

      const result = JSON.parse(content);
      allChanges.push(...(result.changes || []));
    }

    return { changes: allChanges };
  } catch (err) {
    const error = err as Error;
    console.error("[Differences] Analysis error:", error);
    throw new Error(`Failed to analyze resume differences: ${error.message}`);
  }
}

export async function optimizeResume(resumeText: string, jobDescription: string, currentVersion?: number) {
  try {
    const resumeChunks = splitIntoChunks(resumeText);
    const jobDescriptionChunks = splitIntoChunks(jobDescription);

    let optimizedChunks: string[] = [];
    let allChanges: string[] = [];
    let overallMatchScore = 0;
    let improvements = {
      keywords: '',
      structure: '',
      clarity: '',
      ats: ''
    } as const;

    // Process each chunk of the resume
    for (let i = 0; i < resumeChunks.length; i++) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert resume optimizer specializing in ATS optimization and professional resume enhancement. Your task is to optimize this section of the resume while maintaining consistency with other sections.

Follow these optimization guidelines:
1. Analyze job requirements thoroughly
2. Enhance content while maintaining authenticity
3. Use consistent formatting across sections
4. Return valid JSON in this exact format:
{
  "optimizedContent": "the enhanced resume section text",
  "changes": ["list of specific improvements made"],
  "sectionScore": <number between 0-100>,
  "improvements": {
    "keywords": "keyword optimizations for this section",
    "structure": "structural changes",
    "clarity": "clarity improvements",
    "ats": "ATS-specific enhancements"
  }
}`
          },
          {
            role: "user",
            content: `Resume Section ${i + 1}/${resumeChunks.length}:\n${resumeChunks[i]}\n\nJob Description:\n${
              jobDescriptionChunks.join('\n\n')
            }${
              currentVersion ? `\n\nThis is reoptimization attempt. Current version: ${currentVersion}. Please make additional improvements while maintaining previous optimizations.` : ''
            }`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No response from OpenAI for section " + (i + 1));
      }

      const result = JSON.parse(content);
      optimizedChunks.push(result.optimizedContent || '');
      allChanges.push(...(result.changes || []));
      overallMatchScore += (result.sectionScore || 0);

      // Merge improvements with proper type checking
      (Object.keys(improvements) as Array<keyof typeof improvements>).forEach(key => {
        if (result.improvements?.[key]) {
          improvements[key] += (improvements[key] ? '\n' : '') + result.improvements[key];
        }
      });
    }

    // Calculate final match score
    const finalScore = Math.min(100, Math.max(0, Math.round(overallMatchScore / resumeChunks.length)));

    return {
      optimizedContent: optimizedChunks.join('\n\n').trim(),
      changes: allChanges,
      matchScore: finalScore,
      improvements
    };
  } catch (err) {
    const error = err as Error;
    console.error("[Optimize] Error in optimizeResume:", error);
    throw new Error(`Failed to optimize resume: ${error.message}`);
  }
}

export async function generateCoverLetter(resumeText: string, jobDescription: string) {
  try {
    const resumeChunks = splitIntoChunks(resumeText);
    const jobDescriptionChunks = splitIntoChunks(jobDescription);

    // First, analyze the resume and job description
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the resume and job description to extract key matching points for a cover letter.
Return JSON in this format:
{
  "keyPoints": ["list of strongest matching points"],
  "candidateStrengths": ["list of relevant achievements"],
  "jobRequirements": ["list of key job requirements"]
}`
        },
        {
          role: "user",
          content: `Resume:\n${resumeChunks.join('\n\n')}\n\nJob Description:\n${jobDescriptionChunks.join('\n\n')}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}');

    // Generate the cover letter using the analysis
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert cover letter writer. Create a professional cover letter using the provided analysis and following these guidelines:

1. Format:
   [Name from resume]
   [Email if present in resume]
   [Phone if present in resume]

   [Today's Date: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}]

   Dear Hiring Manager,

   [3-4 paragraphs of content]

   Best regards,
   [Name from resume]

2. Content Guidelines:
   - Focus on the key matching points provided
   - Highlight the candidate's relevant strengths
   - Address the main job requirements
   - Keep it concise and impactful

Return JSON in this format:
{
  "coverLetter": "the generated cover letter with proper formatting",
  "highlights": ["key qualifications emphasized"],
  "confidence": <number between 0-100>
}`
        },
        {
          role: "user",
          content: JSON.stringify(analysis)
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