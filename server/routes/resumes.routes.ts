
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
            // Use a timeout to ensure the operation doesn't hang
            const deletePromise = storage.deleteUploadedResume(resumeId);
            
            // Set a timeout of 10 seconds for the operation
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Delete operation timed out')), 10000);
            });
            
            // Wait for the delete operation to complete or timeout
            await Promise.race([deletePromise, timeoutPromise]);
            
            console.log(`Successfully deleted resume with ID: ${resumeId}`);
            
            // Clear all previous headers
            res.removeHeader('Content-Type');
            res.removeHeader('Content-Length');
            
            // Set content type explicitly
            res.setHeader('Content-Type', 'application/json');
            
            // Send a proper JSON response
            return res.status(200).json({ success: true, message: "Resume deleted successfully", resumeId });
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
