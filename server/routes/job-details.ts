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

jobDetailsRouter.post('/extract', async (req, res) => {
  try {
    // Set JSON content type
    res.setHeader('Content-Type', 'application/json');

    const { jobUrl, jobDescription } = jobDetailsSchema.parse(req.body);

    // Extract job details
    const jobDetails = await extractJobDetails(jobUrl || jobDescription || '');

    res.json(jobDetails);
  } catch (error: any) {
    logger.error('Error extracting job details:', error);
    res.status(400).json({
      error: true,
      message: error.message || 'Failed to extract job details'
    });
  }
});