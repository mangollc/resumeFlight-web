import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function optimizeResume(resumeText: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimizer with years of experience in professional resume writing and ATS optimization. Your task is to analyze and optimize the provided resume to match the job description while maintaining authenticity and professionalism.

Follow these guidelines:
1. Analyze the job requirements and identify key skills and qualifications
2. Restructure and enhance the resume content to highlight relevant experience
3. Use industry-standard keywords from the job description
4. Improve formatting and clarity while maintaining truthfulness
5. Ensure all modifications are based on existing content
6. Calculate a match score based on alignment with job requirements

Return a JSON object with the following structure:
{
  "optimizedContent": "the enhanced resume text with proper formatting",
  "changes": [
    "list of specific improvements made",
    "keywords added or emphasized",
    "structural changes"
  ],
  "matchScore": "percentage match with job requirements (0-100)"
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

    return JSON.parse(content);
  } catch (err) {
    const error = err as Error;
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

   [Today's Date: 12th Feb 2025]

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

Return a JSON object with:
{
  "coverLetter": "the generated cover letter with proper formatting",
  "highlights": [
    "key qualifications emphasized",
    "specific achievements mentioned",
    "job requirement alignments"
  ],
  "confidence": "match confidence score (0-100)"
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

    return JSON.parse(content);
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to generate cover letter: ${error.message}`);
  }
}