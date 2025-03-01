/**
 * Resume analysis and optimization routes
 */

import { Router } from 'express';
import { storage } from '../storage';
import { optimizeResume } from '../openai';

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

// Delete optimized resume
router.delete('/optimized/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const resumeId = parseInt(req.params.id);

        if (isNaN(resumeId)) {
            console.error(`API: Invalid optimized resume ID: ${req.params.id}`);
            return res.status(400).json({ error: "Invalid resume ID" });
        }

        console.log(`API: Processing delete request for optimized resume ID: ${resumeId}`);


        try {
            await storage.deleteOptimizedResume(resumeId);
            return res.status(200).json({ message: 'Resume deleted successfully' });
        } catch (deleteError) {
            console.error('Error during resume deletion:', deleteError);

            // Check if it's a "not found" error
            if (deleteError instanceof Error && deleteError.message.includes('not found')) {
                return res.status(404).json({ message: `Optimized resume with ID ${resumeId} not found` });
            }

            throw deleteError; // Re-throw for general error handling
        }
    } catch (error) {
        console.error('Delete optimized resume error:', error);
        return res.status(500).json({ message: error instanceof Error ? error.message : 'An unknown error occurred' });
    }
});

export const analysisRoutes = router;