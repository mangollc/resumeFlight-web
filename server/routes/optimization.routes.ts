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

        if (!resume.content || typeof resume.content !== 'string') {
            return res.status(400).json({ error: "Invalid resume content" });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        // Enable SSE with proper headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const sendEvent = (data: any) => {
            try {
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
            // Send initial status
            sendEvent({ status: "started" });

            // Extract job details
            sendEvent({ status: "extracting_details" });
            let jobDetails: JobDetails;
            try {
                if (jobUrl) {
                    jobDetails = await extractJobDetails(jobUrl);
                } else if (jobDescription) {
                    jobDetails = await analyzeJobDescription(jobDescription);
                } else {
                    throw new Error("Either job description or URL is required");
                }

                if (!jobDetails || !jobDetails.description) {
                    throw new Error("Failed to obtain job description from the provided source");
                }

                // Analyze description
                sendEvent({ status: "analyzing_description" });
                const originalScores = await calculateMatchScores(resume.content, jobDetails.description);

                // Optimize resume
                sendEvent({ status: "optimizing_resume" });
                const { optimizedContent, changes, analysis } = await optimizeResume(
                    resume.content,
                    jobDetails.description
                );

                const optimizedScores = await calculateMatchScores(optimizedContent, jobDetails.description, true);

                const optimizedResume = await storage.createOptimizedResume({
                    userId: req.user!.id,
                    sessionId: req.session.id,
                    uploadedResumeId: resume.id,
                    content: optimizedContent,
                    originalContent: resume.content,
                    jobDescription: jobDetails.description,
                    jobUrl: jobUrl || null,
                    jobDetails,
                    metadata: {
                        filename: resume.metadata.filename,
                        optimizedAt: new Date().toISOString(),
                        version: '1.0'
                    },
                    metrics: {
                        before: originalScores,
                        after: optimizedScores
                    },
                    analysis: {
                        strengths: analysis.strengths || [],
                        improvements: analysis.improvements || [],
                        gaps: analysis.gaps || [],
                        suggestions: analysis.suggestions || []
                    }
                });

                // Send completion status with results
                sendEvent({ 
                    status: "completed",
                    optimizedResume,
                    changes 
                });

            } catch (error: any) {
                console.error('Job details extraction error:', error);
                throw error;
            }

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