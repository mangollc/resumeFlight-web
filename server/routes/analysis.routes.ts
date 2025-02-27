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
        return res.status(200).json({ success: true });
    } catch (error: any) {
        console.error("Error deleting optimized resume:", error);
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

/**
 * Submit a resume for analysis and optimization
 */
router.post('/analyze-resume', async (req, res) => {
  try {
    const { userId, resumeId, jobDescription } = req.body;

    if (!userId || !resumeId || !jobDescription) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the resume content
    const resume = await storage.getResume(resumeId);

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Start the optimization process
    const result = await optimizeResume(resume.content, jobDescription);

    // Store the optimization result
    await storage.saveOptimizedResume(userId, resumeId, result);

    return res.json({ success: true, optimizedResumeId: resumeId });
  } catch (error) {
    console.error('Resume analysis error:', error);
    return res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

/**
 * Get analysis results
 */
router.get('/analysis/:resumeId', async (req, res) => {
  try {
    const { resumeId } = req.params;
    const result = await storage.getOptimizedResume(resumeId);

    if (!result) {
      return res.status(404).json({ error: 'Analysis not found' });
    }

    return res.json(result);
  } catch (error) {
    console.error('Get analysis error:', error);
    return res.status(500).json({ error: 'Failed to get analysis' });
  }
});

export const analysisRoutes = router;