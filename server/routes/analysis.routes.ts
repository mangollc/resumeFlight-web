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
    // Ensure we always send JSON response
    res.setHeader('Content-Type', 'application/json');
    
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

        // Force a complete deletion and cleanup
        await storage.deleteOptimizedResume(resumeId, true);
        
        // Return success with timestamp to help client avoid caching
        return res.json({ 
          message: "Resume deleted successfully",
          timestamp: Date.now()
        });
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export const analysisRoutes = router;