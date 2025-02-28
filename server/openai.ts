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

    let optimizedChunks: any[] = [];
    let allChanges: string[] = [];
    let combinedAnalysis = {
      strengths: [] as string[],
      improvements: [] as string[],
      gaps: [] as string[],
      suggestions: [] as string[]
    };

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
                content: `You are an expert resume optimizer with deep knowledge of industry-specific job roles and applicant tracking systems (ATS). 
Optimize this section of the resume based on the job description and return a JSON response with the following structure:

{
  "optimizedContent": {
    "contactInfo": {
      "fullName": "string",
      "phone": "string",
      "email": "string",
      "linkedin": "string",
      "location": "string"
    },
    "professionalSummary": "string (2-4 sentences)",
    "skills": {
      "technical": ["string"],
      "soft": ["string"]
    },
    "experience": [{
      "title": "string",
      "company": "string",
      "location": "string",
      "dates": "string",
      "achievements": ["string"]
    }],
    "education": [{
      "degree": "string",
      "institution": "string",
      "graduationDate": "string",
      "honors": "string"
    }],
    "certifications": [{
      "name": "string",
      "issuer": "string",
      "dateReceived": "string"
    }]
  },
  "changes": ["string"],
  "analysis": {
    "strengths": ["string"],
    "improvements": ["string"],
    "gaps": ["string"],
    "suggestions": ["string"]
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
      if (result.analysis) {
        combinedAnalysis.strengths.push(...(result.analysis.strengths || []));
        combinedAnalysis.improvements.push(...(result.analysis.improvements || []));
        combinedAnalysis.gaps.push(...(result.analysis.gaps || []));
        combinedAnalysis.suggestions.push(...(result.analysis.suggestions || []));
      }
    }

    console.log("[OpenAI] All chunks processed successfully");

    // Combine chunks into a properly formatted resume
    const finalResume = {
      contactInfo: optimizedChunks[0].contactInfo,
      professionalSummary: optimizedChunks[0].professionalSummary,
      skills: {
        technical: [...new Set(optimizedChunks.flatMap(chunk => chunk.skills?.technical || []))],
        soft: [...new Set(optimizedChunks.flatMap(chunk => chunk.skills?.soft || []))]
      },
      experience: optimizedChunks.flatMap(chunk => chunk.experience || []),
      education: optimizedChunks.flatMap(chunk => chunk.education || []),
      certifications: optimizedChunks.flatMap(chunk => chunk.certifications || [])
    };

    // Convert the structured resume back to formatted text
    const formattedResume = formatResumeToText(finalResume);

    return {
      optimisedResume: formattedResume,
      changes: allChanges,
      analysis: combinedAnalysis
    };
  } catch (error: any) {
    console.error("[OpenAI] Optimization error:", error);
    throw new Error(`Failed to optimize resume: ${error.message}`);
  }
}

function formatResumeToText(resume: any): string {
  const sections: string[] = [];

  // Contact Information
  const contact = resume.contactInfo;
  sections.push(`${contact.fullName}
${contact.email} | ${contact.phone}
${contact.location}${contact.linkedin ? ` | ${contact.linkedin}` : ''}\n`);

  // Professional Summary
  sections.push(`PROFESSIONAL SUMMARY\n${resume.professionalSummary}\n`);

  // Skills
  sections.push(`SKILLS
Technical: ${resume.skills.technical.join(', ')}
Soft Skills: ${resume.skills.soft.join(', ')}\n`);

  // Experience
  sections.push(`PROFESSIONAL EXPERIENCE
${resume.experience.map(exp => 
    `${exp.title} - ${exp.company}
${exp.location} | ${exp.dates}
${exp.achievements.map(achievement => `• ${achievement}`).join('\n')}`
  ).join('\n\n')}\n`);

  // Education
  sections.push(`EDUCATION
${resume.education.map(edu =>
    `${edu.degree}
${edu.institution} | ${edu.graduationDate}
${edu.honors ? `Honors: ${edu.honors}` : ''}`
  ).join('\n\n')}\n`);

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    sections.push(`CERTIFICATIONS
${resume.certifications.map(cert =>
      `${cert.name} - ${cert.issuer} (${cert.dateReceived})`
    ).join('\n')}`);
  }

  return sections.join('\n\n').trim();
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