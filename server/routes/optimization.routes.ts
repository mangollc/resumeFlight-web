/**
 * @file optimization.routes.ts
 * Routes for handling resume optimization, analysis, and related operations
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';
import { JobDetails, JobMetrics, ProgressStep } from './types';
import { extractJobDetails, analyzeJobDescription } from '../utils/job-analysis';
import { calculateMatchScores } from '../utils/scoring';

const router = Router();

// Get all optimized resumes
router.get('/optimized-resumes', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumes = await storage.getOptimizedResumesByUser(req.user!.id);
        const resumesWithScores = await Promise.all(resumes.map(async (resume) => {
            const matchScore = await storage.getResumeMatchScore(resume.id);
            return {
                ...resume,
                matchScore
            };
        }));

        return res.status(200).json(resumesWithScores);
    } catch (error: any) {
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

        return res.status(200).json(resume);
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to fetch optimized resume",
            details: error.message,
        });
    }
});

// Optimize resume
router.post('/uploaded-resumes/:id/optimize', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumeId = parseInt(req.params.id);
        const uploadedResume = await storage.getUploadedResume(resumeId);

        if (!uploadedResume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        if (uploadedResume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        const { jobDescription, jobUrl } = req.body;
        const jobDetails = jobUrl 
            ? await extractJobDetails(jobUrl)
            : await analyzeJobDescription(jobDescription);

        const { optimizedContent, changes } = await optimizeResume(
            uploadedResume.content,
            jobDescription,
            parseFloat(req.body.version || '1.0')
        );

        const originalScores = await calculateMatchScores(uploadedResume.content, jobDescription);
        const optimizedScores = await calculateMatchScores(optimizedContent, jobDescription, true);

        const optimizedResume = await storage.createOptimizedResume({
            userId: req.user!.id,
            uploadedResumeId: uploadedResume.id,
            content: optimizedContent,
            originalContent: uploadedResume.content,
            jobDescription,
            jobUrl: jobUrl || null,
            jobDetails,
            metadata: {
                filename: uploadedResume.metadata.filename,
                optimizedAt: new Date().toISOString(),
                version: req.body.version || '1.0'
            }
        });

        await storage.createResumeMatchScore({
            userId: req.user!.id,
            optimizedResumeId: optimizedResume.id,
            originalScores,
            optimizedScores,
            analysis: changes
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
        return res.status(200).json({ message: "Resume deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to delete resume",
            details: error.message
        });
    }
});

export const optimizationRoutes = router;
