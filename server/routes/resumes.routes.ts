
import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Get all uploaded resumes
router.get('/', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const resumes = await storage.getUploadedResumesByUser(req.user!.id);
        return res.json(resumes);
    } catch (error: any) {
        console.error("Error fetching uploaded resumes:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Get a specific uploaded resume
router.get('/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getUploadedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Not authorized" });
        }

        return res.json(resume);
    } catch (error: any) {
        console.error("Error fetching uploaded resume:", error);
        return res.status(500).json({ error: error.message });
    }
});

// Delete an uploaded resume
router.delete('/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getUploadedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Not authorized" });
        }

        console.log(`Deleting resume with ID: ${resumeId}`);
        try {
            await storage.deleteUploadedResume(resumeId);
            console.log(`Successfully deleted resume with ID: ${resumeId}`);
            
            // Explicitly clear any previous headers to prevent conflicts
            res.setHeader('Content-Type', 'application/json');
            
            // Send a proper JSON response
            return res.status(200).json({ success: true, message: "Resume deleted successfully" });
        } catch (deleteError) {
            console.error("Error in deleteUploadedResume operation:", deleteError);
            res.setHeader('Content-Type', 'application/json');
            return res.status(500).json({ error: "Database deletion failed", details: String(deleteError) });
        }
    } catch (error: any) {
        console.error("Error deleting uploaded resume:", error);
        // Set content type header even for error responses
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({ error: error.message || "Failed to delete resume", success: false });
    }
});

export default router;
