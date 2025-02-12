import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function optimizeResume(resumeText: string, jobDescription: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume optimizer. Analyze the provided resume and job description to create an optimized version that highlights relevant skills and experience. Return the result as a JSON object with the following structure:
          {
            "optimizedContent": "the optimized resume text",
            "changes": ["list of key changes made"],
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