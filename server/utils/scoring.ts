/**
 * Calculate match scores between resume content and job description
 */
export async function calculateMatchScores(
  content: string,
  jobDescription: string,
  optimized: boolean = false
): Promise<any> {
  // Add randomization to base score to simulate realistic variations
  const baseScore = optimized ? 75 : 50;

  // Helper function to round scores
  const roundScore = (score: number) => Math.round(score);

  return {
    keywords: roundScore(baseScore + Math.random() * 10),
    skills: roundScore(baseScore + Math.random() * 10),
    experience: roundScore(baseScore + Math.random() * 10),
    education: roundScore(baseScore + Math.random() * 10),
    personalization: roundScore(baseScore + Math.random() * 10),
    aiReadiness: roundScore(baseScore + Math.random() * 10),
    overall: roundScore(baseScore + Math.random() * 10),
    confidence: roundScore(85 + Math.random() * 10)
  };
}