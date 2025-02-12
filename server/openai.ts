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

Follow these guidelines:
1. Use a clear, professional structure:
   - Opening paragraph: Express enthusiasm and state the position
   - Body paragraphs: Connect experience to job requirements
   - Closing paragraph: Call to action and thank you
2. Highlight relevant achievements from the resume
3. Address specific job requirements
4. Maintain a confident yet professional tone
5. Keep the length to one page
6. Include specific examples of relevant experience

Return a JSON object with:
{
  "coverLetter": "the generated cover letter text with proper formatting",
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