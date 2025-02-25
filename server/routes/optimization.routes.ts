/**
 * Resume optimization routes
 * Handles resume analysis, optimization, and version management
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';
import { JobDetails, JobMetrics } from './types';
import { extractJobDetails, analyzeJobDescription } from '../utils/job-analysis';
import { calculateMatchScores } from '../utils/scoring';

const router = Router();

// Get optimized resumes
router.get('/optimized-resumes', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumes = await storage.getOptimizedResumesByUser(req.user!.id);

        // Transform resumes to include required properties
        const transformedResumes = resumes.map(resume => ({
            ...resume,
            matchScore: {
                originalScores: resume.metrics?.before || {
                    keywords: 0,
                    skills: 0,
                    experience: 0,
                    education: 0,
                    personalization: 0,
                    aiReadiness: 0,
                    overall: 0,
                    confidence: 0
                },
                optimizedScores: resume.metrics?.after || {
                    keywords: 0,
                    skills: 0,
                    experience: 0,
                    education: 0,
                    personalization: 0,
                    aiReadiness: 0,
                    overall: 0,
                    confidence: 0
                },
                analysis: resume.analysis || {
                    matches: [],
                    gaps: [],
                    suggestions: []
                }
            }
        }));

        return res.json(transformedResumes);
    } catch (error: any) {
        console.error("Error fetching optimized resumes:", error);
        return res.status(500).json({
            error: "Failed to fetch optimized resumes",
            details: error.message,
        });
    }
});

// Get single optimized resume
router.get('/optimized-resume/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getOptimizedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        // Transform single resume to include required properties
        const transformedResume = {
            ...resume,
            metrics: {
                before: resume.metrics?.before || {
                    keywords: 0,
                    skills: 0,
                    experience: 0,
                    education: 0,
                    personalization: 0,
                    aiReadiness: 0,
                    overall: 0,
                    confidence: 0
                },
                after: {
                    ...(resume.metrics?.after || {
                        keywords: 0,
                        skills: 0,
                        experience: 0,
                        education: 0,
                        personalization: 0,
                        aiReadiness: 0,
                        overall: 0,
                        confidence: 0
                    }),
                    strengths: resume.analysis?.matches || [],
                    improvements: resume.analysis?.improvements || [],
                    gaps: resume.analysis?.gaps || [],
                    suggestions: resume.analysis?.suggestions || []
                }
            }
        };

        return res.json(transformedResume);
    } catch (error: any) {
        console.error("Error fetching optimized resume:", error);
        return res.status(500).json({
            error: "Failed to fetch optimized resume",
            details: error.message,
        });
    }
});

// Optimize resume
router.post('/resume/:id/optimize', async (req, res) => {
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

        const { jobDescription, jobUrl } = req.body;
        const jobDetails = jobUrl 
            ? await extractJobDetails(jobUrl)
            : await analyzeJobDescription(jobDescription);

        const { optimizedContent, changes } = await optimizeResume(
            resume.content,
            jobDescription
        );

        const originalScores = await calculateMatchScores(resume.content, jobDescription);
        const optimizedScores = await calculateMatchScores(optimizedContent, jobDescription, true);

        const optimizedResume = await storage.createOptimizedResume({
            userId: req.user!.id,
            uploadedResumeId: resume.id,
            content: optimizedContent,
            originalContent: resume.content,
            jobDescription,
            jobUrl,
            jobDetails,
            metadata: {
                filename: resume.metadata.filename,
                optimizedAt: new Date().toISOString()
            }
        });

        return res.json(optimizedResume);
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to optimize resume",
            details: error.message
        });
    }
});

// Delete optimized resume
router.delete('/optimized-resume/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getOptimizedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        await storage.deleteOptimizedResume(resumeId);
        return res.json({ message: "Resume deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to delete resume",
            details: error.message
        });
    }
});

// Error handling middleware specific to optimization routes
router.use((err: any, req: any, res: any, next: any) => {
    if (err.type === 'entity.too.large') {
        return res.status(413).json({
            error: 'Request entity too large',
            message: 'The uploaded file exceeds the maximum allowed size'
        });
    }
    
    console.error('Optimization route error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
    });
});

export const optimizationRoutes = router;