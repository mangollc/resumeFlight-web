/**
 * Resume analysis and optimization routes
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';
import { JobDetails } from './types';

const router = Router();

// Get optimized resumes
router.get('/optimized', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const resumes = await storage.getOptimizedResumesByUser(req.user!.id);
        return res.json(resumes);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Get single optimized resume
router.get('/optimized/:id', async (req, res) => {
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
            return res.status(403).json({ error: "Not authorized" });
        }

        return res.json(resume);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Optimize resume
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
            return res.status(403).json({ error: "Not authorized" });
        }

        const { jobDescription } = req.body;
        if (!jobDescription) {
            return res.status(400).json({ error: "Job description required" });
        }

        const { optimizedContent, changes } = await optimizeResume(resume.content, jobDescription);

        const optimizedResume = await storage.createOptimizedResume({
            userId: req.user!.id,
            uploadedResumeId: resumeId,
            content: optimizedContent,
            originalContent: resume.content,
            jobDescription,
            metadata: {
                filename: resume.metadata.filename,
                optimizedAt: new Date().toISOString()
            }
        });

        return res.json(optimizedResume);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
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
            return res.status(403).json({ error: "Not authorized" });
        }

        await storage.deleteOptimizedResume(resumeId);
        return res.json({ message: "Resume deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export const analysisRoutes = router;