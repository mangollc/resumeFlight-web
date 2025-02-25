/**
 * Core resume management routes
 * Handles resume upload, retrieval, and deletion
 */

import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import { insertUploadedResumeSchema } from '@shared/schema';
import { MulterRequest } from './types';
import { parseResume } from '../utils/parser';

const router = Router();

// Error handling middleware
const handleApiError = (err: any, res: Response) => {
  console.error('Resume API Error:', err);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// Multer configuration for resume uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (_req, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
        const supportedTypes = [
            "application/pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ];
        if (supportedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Unsupported file type. Please upload PDF or DOCX files only."));
        }
    },
});

// Get all uploaded resumes for user
router.get('/resumes', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ 
                error: "Unauthorized",
                message: "Please log in to view resumes"
            });
        }
        const resumes = await storage.getUploadedResumesByUser(req.user.id);
        return res.json(resumes);
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to fetch resumes",
            details: error.message,
        });
    }
});

// Upload new resume
router.post('/resume/upload', upload.single('file'), async (req: MulterRequest, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const content = await parseResume(req.file.buffer, req.file.mimetype);
        const validatedData = insertUploadedResumeSchema.parse({
            content: content,
            metadata: {
                filename: req.file.originalname,
                fileType: req.file.mimetype,
                uploadedAt: new Date().toISOString(),
            },
        });

        const resume = await storage.createUploadedResume({
            ...validatedData,
            userId: req.user!.id,
        });

        return res.status(201).json(resume);
    } catch (error: any) {
        return res.status(400).json({
            error: "Failed to upload resume",
            details: error.message,
        });
    }
});

// Delete uploaded resume
router.delete('/resume/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const resumeId = parseInt(req.params.id);
        const resume = await storage.getUploadedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }

        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Unauthorized access" });
        }

        await storage.deleteUploadedResume(resumeId);
        return res.json({ message: "Resume deleted successfully" });
    } catch (error: any) {
        return res.status(500).json({
            error: "Failed to delete resume",
            details: error.message,
        });
    }
});

export const resumeRoutes = router;