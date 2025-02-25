/**
 * Resume management routes
 * Handles basic CRUD operations for resumes
 */

import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import { insertUploadedResumeSchema } from '@shared/schema';
import { MulterRequest } from './types';

const router = Router();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === "application/pdf" || 
            file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF and DOCX files are allowed"));
        }
    }
});

// Get user's resumes
router.get('/', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const resumes = await storage.getUploadedResumesByUser(req.user!.id);
        return res.json(resumes);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
});

// Upload new resume
router.post('/', upload.single('file'), async (req: MulterRequest, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const content = await parseResume(req.file.buffer, req.file.mimetype);
        const resumeData = insertUploadedResumeSchema.parse({
            content,
            metadata: {
                filename: req.file.originalname,
                fileType: req.file.mimetype,
                uploadedAt: new Date().toISOString()
            }
        });

        const resume = await storage.createUploadedResume({
            ...resumeData,
            userId: req.user!.id
        });

        res.status(201).json(resume);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete resume
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

        await storage.deleteUploadedResume(resumeId);
        res.json({ message: "Resume deleted" });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export const resumesRoutes = router;