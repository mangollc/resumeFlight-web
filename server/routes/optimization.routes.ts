/**
 * Resume optimization routes
 * Handles resume analysis, optimization, and version management
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';
import { extractJobDetails, analyzeJobDescription } from '../utils/job-analysis';
import { JobDetails } from './types';
import { calculateMatchScores } from '../utils/scoring';

const router = Router();

// Helper function to standardize job details processing
async function processJobDetails(jobDescription?: string, jobUrl?: string): Promise<JobDetails> {
  try {
    let details: JobDetails;

    if (jobUrl) {
      details = await extractJobDetails(jobUrl);
      if (!details.description) {
        throw new Error("Failed to extract job description from URL");
      }
    } else if (jobDescription) {
      details = await analyzeJobDescription(jobDescription);
      if (!details.description) {
        throw new Error("Job description is required");
      }
    } else {
      throw new Error("Either job description or URL is required");
    }

    return {
      title: details.title || '',
      company: details.company || '',
      location: details.location || '',
      description: details.description,
      requirements: details.requirements || []
    };
  } catch (error: any) {
    console.error('Error processing job details:', error);
    throw new Error(`Failed to process job details: ${error.message}`);
  }
}

// Get optimized resumes
router.get('/optimized-resumes', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumes = await storage.getOptimizedResumesByUser(req.user!.id);
        return res.json(resumes);
    } catch (error: any) {
        console.error("Error fetching optimized resumes:", error);
        return res.status(500).json({
            error: "Failed to fetch optimized resumes",
            details: error.message
        });
    }
});

// Optimize resume with SSE updates
router.get('/uploaded-resumes/:id/optimize', async (req, res) => {
    try {
        // Check authentication first
        if (!req.isAuthenticated()) {
            res.status(401);
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.flushHeaders();
            res.write(`data: ${JSON.stringify({ 
                status: "error", 
                message: "Authentication required. Please log in again.", 
                code: "AUTH_ERROR" 
            })}\n\n`);
            return res.end();
        }

        const resumeId = parseInt(req.params.id);
        if (isNaN(resumeId)) {
            return res.status(400).json({ error: "Invalid resume ID" });
        }

        const resume = await storage.getUploadedResume(resumeId);
        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        // Enable SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendEvent = (data: any) => {
            try {
                console.log(`Sending SSE event: ${data.status}`);
                res.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('Error sending SSE event:', error);
            }
        };

        const jobDescription = req.query.jobDescription as string;
        const jobUrl = req.query.jobUrl as string;

        if (!jobDescription && !jobUrl) {
            sendEvent({ 
                status: "error", 
                message: "Job description or URL is required",
                code: "MISSING_JOB_INFO"
            });
            return res.end();
        }

        try {
            sendEvent({ status: "started" });

            // Extract job details
            sendEvent({ status: "extracting_details" });
            const jobDetails = await processJobDetails(jobDescription, jobUrl);

            // Calculate initial scores
            sendEvent({ status: "analyzing_description" });
            const originalScores = await calculateMatchScores(resume.content, jobDetails.description);

            // Optimize resume with timeout handling
            sendEvent({ status: "optimizing_resume" });
            let optimizationResult;
            try {
                // Use a reduced timeout of 120 seconds to avoid client-side timeout
                optimizationResult = await Promise.race([
                    optimizeResume(resume.content, jobDetails.description),
                    new Promise((_, reject) => {
                        const timeoutError = new Error('Optimization timed out');
                        timeoutError.code = 'TIMEOUT_ERROR';
                        setTimeout(() => reject(timeoutError), 120000);
                    })
                ]);
            } catch (error: any) {
                console.error("Optimization error:", error);
                
                if (error.message.includes('timed out') || error.code === 'TIMEOUT_ERROR') {
                    sendEvent({ 
                        status: "error",
                        message: "Resume optimization is taking longer than expected. Please try again with a shorter resume or job description.",
                        code: "TIMEOUT_ERROR"
                    });
                    return res.end();
                }
                
                // Send a more specific error type if available
                sendEvent({ 
                    status: "error",
                    message: error.message || "Failed to generate optimized content",
                    code: error.code || "OPTIMIZATION_ERROR"
                });
                return res.end();
            }

            // Validate optimization result
            if (!optimizationResult?.resumeContent) {
                sendEvent({ 
                    status: "error",
                    message: "Failed to generate optimized content",
                    code: "OPTIMIZATION_ERROR"
                });
                return res.end();
            }

            // Calculate optimized scores
            const optimizedScores = await calculateMatchScores(
                optimizationResult.optimisedResume,
                jobDetails.description,
                true
            );

            // Create optimized resume record
            const optimizedResume = await storage.createOptimizedResume({
                userId: req.user!.id,
                sessionId: req.session!.id,
                uploadedResumeId: resumeId,
                optimisedResume: optimizationResult.optimisedResume,
                originalContent: resume.content,
                jobDescription: jobDetails.description,
                jobUrl: jobUrl || null,
                jobDetails,
                metadata: {
                    filename: resume.metadata?.filename || 'resume.txt',
                    optimizedAt: new Date().toISOString(),
                    version: '1.0'
                },
                metrics: {
                    before: originalScores,
                    after: optimizedScores
                },
                analysis: optimizationResult.analysis,
                resumeContent: optimizationResult.resumeContent,
                contactInfo: optimizationResult.contactInfo
            });

            // Send completion status
            sendEvent({ 
                status: "completed",
                optimizedResume,
                resumeContent: optimizationResult.resumeContent,
                analysis: optimizationResult.analysis
            });

            return res.end();

        } catch (error: any) {
            console.error("Optimization process error:", error);
            sendEvent({ 
                status: "error",
                message: error.message || "Failed to optimize resume",
                code: error.code || "OPTIMIZATION_ERROR",
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
            return res.end();
        }
    } catch (error: any) {
        console.error("Route handler error:", error);
        return res.status(500).json({
            error: "Failed to optimize resume",
            message: error.message,
            code: error.code || "SERVER_ERROR"
        });
    }
});

export const optimizationRoutes = router;