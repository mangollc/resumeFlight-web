/**
 * Resume analysis routes
 * Handles resume optimization and job matching
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';
import { analyzeJobDescription } from '../utils/job-analysis';

const router = Router();

// Get optimized resumes
router.get('/optimized', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const optimizedResumes = await storage.getOptimizedResumesByUser(req.user!.id);
        res.json(optimizedResumes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Optimize resume for job
router.post('/optimize/:resumeId', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const resumeId = parseInt(req.params.resumeId);
        const resume = await storage.getUploadedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        const { jobDescription } = req.body;
        if (!jobDescription) {
            return res.status(400).json({ error: "Job description required" });
        }

        const jobDetails = await analyzeJobDescription(jobDescription);
        const { optimizedContent } = await optimizeResume(resume.content, jobDescription);

        const optimizedResume = await storage.createOptimizedResume({
            userId: req.user!.id,
            uploadedResumeId: resumeId,
            content: optimizedContent,
            originalContent: resume.content,
            jobDescription,
            jobDetails,
            metadata: {
                filename: resume.metadata.filename,
                optimizedAt: new Date().toISOString()
            }
        });

        res.json(optimizedResume);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Delete optimized resume
router.delete('/optimized/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getOptimizedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized" });
        }

        await storage.deleteOptimizedResume(resumeId);
        res.json({ message: "Optimized resume deleted" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export const analysisRoutes = router;
