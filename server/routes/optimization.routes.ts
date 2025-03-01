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

    // Ensure consistent structure
    return {
      title: details.title || '',
      company: details.company || '',
      location: details.location || '',
      description: details.description,
      requirements: details.requirements || [],
      skillsAndTools: details.skillsAndTools || [],
      experience: details.experience || '',
      type: details.type || '',
      url: jobUrl || ''
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

// Optimize resume
router.get('/uploaded-resumes/:id/optimize', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
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
                // Log the event type for debugging
                if (data.status) {
                    console.log(`Sending SSE event: ${data.status}`);
                }
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

            // Extract job details using unified processing
            sendEvent({ status: "extracting_details" });
            const jobDetails = await processJobDetails(jobDescription, jobUrl);

            // Calculate initial scores
            sendEvent({ status: "analyzing_description" });
            const originalScores = await calculateMatchScores(resume.content, jobDetails.description);

            // Optimize resume with timeout handling
            sendEvent({ status: "optimizing_resume" });
            let optimizationResult;
            try {
                optimizationResult = await Promise.race([
                    optimizeResume(resume.content, jobDetails.description),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Optimization timed out')), 110000)
                    )
                ]) as Awaited<ReturnType<typeof optimizeResume>>;
            } catch (error: any) {
                if (error.message.includes('timed out')) {
                    sendEvent({ 
                        status: "error",
                        message: "Resume optimization is taking longer than expected. Please try again.",
                        code: "TIMEOUT_ERROR"
                    });
                    return res.end();
                }
                throw error;
            }

            // Calculate optimized scores
            const optimizedScores = await calculateMatchScores(
                optimizationResult.optimisedResume,
                jobDetails.description,
                true
            );

            // Ensure content exists before processing
if (!optimizationResult?.optimisedResume) {
    const error = new Error('Optimization failed: No content received');
    error.code = 'OPTIMIZATION_ERROR';
    error.status = 422;
    throw error;
}

// Ensure we have content to work with
            const optimizedContent = optimizationResult.optimizedContent || optimizationResult.optimisedResume;
            
            if (!optimizedContent) {
                sendEvent({ 
                    status: "error",
                    message: "No optimized content was generated. Please try again.",
                    code: "CONTENT_ERROR"
                });
                return res.end();
            }
            
            const optimizedResume = await storage.createOptimizedResume({
                userId: req.user!.id,
                sessionId: req.session.id,
                uploadedResumeId: resume.id,
                content: optimizedContent,
                optimisedResume: optimizedContent,
                originalContent: resume.content || '',
                jobDescription: jobDetails?.description || '',
                jobUrl: jobUrl || null,
                jobDetails: jobDetails || {},
                metadata: {
                    filename: resume.metadata?.filename || 'resume.txt',
                    optimizedAt: new Date().toISOString(),
                    version: '1.0'
                },
                metrics: {
                    before: originalScores,
                    after: optimizedScores
                },
                analysis: {
                    strengths: optimizationResult.analysis.strengths,
                    improvements: optimizationResult.analysis.improvements,
                    gaps: optimizationResult.analysis.gaps,
                    suggestions: optimizationResult.analysis.suggestions
                }
            });

            // Send completion status with results
            sendEvent({ 
                status: "completed",
                optimizedResume,
                changes: optimizationResult.changes
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