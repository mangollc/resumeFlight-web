import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { extractJobDetails } from '../utils/optimize';

export const jobDetailsRouter = Router();

const jobDetailsSchema = z.object({
  jobUrl: z.string().url().optional(),
  jobDescription: z.string().optional(),
}).refine(data => data.jobUrl || data.jobDescription, {
  message: "Either jobUrl or jobDescription must be provided"
});

jobDetailsRouter.post('/job-details/extract', async (req, res) => {
  try {
    // Ensure proper JSON content type
    res.setHeader('Content-Type', 'application/json');

    // Parse and validate request body
    const { jobUrl, jobDescription } = jobDetailsSchema.parse(req.body);

    if (!jobUrl && !jobDescription) {
      return res.status(400).json({
        error: true,
        message: "Either job URL or description must be provided"
      });
    }

    // Extract job details
    const jobDetails = await extractJobDetails(jobUrl || jobDescription || '');

    // Return the results
    return res.json(jobDetails);
  } catch (error: any) {
    logger.error('Error extracting job details:', error);

    // Handle validation errors
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: true,
        message: "Invalid input data",
        details: error.errors
      });
    }

    // Handle other errors
    return res.status(400).json({
      error: true,
      message: error.message || 'Failed to extract job details'
    });
  }
});