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
            return res.status(401).json({ 
                error: "Not authenticated",
                message: "Please log in to delete optimized resumes"
            });
        }

        const resumeId = parseInt(req.params.id);
        if (isNaN(resumeId)) {
            return res.status(400).json({ 
                error: "Invalid resume ID",
                message: "The provided resume ID is not valid"
            });
        }

        const resume = await storage.getOptimizedResume(resumeId);
        if (!resume) {
            return res.status(404).json({ 
                error: "Resume not found",
                message: "The requested optimized resume could not be found"
            });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ 
                error: "Not authorized",
                message: "You don't have permission to delete this optimized resume"
            });
        }

        await storage.deleteOptimizedResume(resumeId);
        return res.json({ 
            success: true,
            message: "Optimized resume deleted successfully" 
        });
    } catch (error: any) {
        console.error('Error deleting optimized resume:', error);
        return res.status(500).json({ 
            error: "Failed to delete optimized resume",
            message: "An unexpected error occurred while deleting the optimized resume",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

export const analysisRoutes = router;