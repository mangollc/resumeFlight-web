/**
 * Resume analysis and optimization routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { createReadStream } from "fs";
import { join } from "path";
import { optimizeResume } from "../utils/optimization";
import { db } from "../db";
import { optimizedResumes, eq } from "@shared/schema";

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

        // Log deletion attempt with more details
        console.log(`Deleting optimized resume with ID: ${resumeId} requested by user: ${req.user!.id}`);

        try {
            // Force a complete deletion and cleanup with explicit error handling
            await storage.deleteOptimizedResume(resumeId, true);

            // Double-check if the resume still exists
            const resumeAfterDelete = await storage.getOptimizedResume(resumeId);
            if (resumeAfterDelete) {
                console.log(`Warning: Resume ${resumeId} still exists after deletion attempt`);
                // Try one more time with direct database access
                await db.delete(optimizedResumes).where(eq(optimizedResumes.id, resumeId));
            }

            // Instruct client to invalidate cache
            return res.json({ 
                message: "Resume deleted successfully",
                timestamp: Date.now(),
                id: resumeId
            });
        } catch (deleteError) {
            console.error(`Error during optimized resume deletion:`, deleteError);
            // Attempt direct database deletion as fallback
            try {
                await db.delete(optimizedResumes).where(eq(optimizedResumes.id, resumeId));
                return res.json({ 
                    message: "Resume deleted via fallback method",
                    timestamp: Date.now(),
                    id: resumeId
                });
            } catch (fallbackError) {
                console.error(`Fallback deletion also failed:`, fallbackError);
                return res.status(500).json({
                    error: "Failed to delete resume after multiple attempts",
                    details: fallbackError.message
                });
            }
        }
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

export const analysisRoutes = router;