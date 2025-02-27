/**
 * Resume management routes
 * Handles basic CRUD operations for resumes
 */

import { Router } from 'express';
import { storage } from '../storage';
import multer from 'multer';
import { insertUploadedResumeSchema } from '@shared/schema';
import { MulterRequest } from './types';
import { parseResume } from '../utils/parser';
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import express from "express";
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { uploadedResumes } from "@shared/schema";

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

// Get user's resumes - endpoint matching client expectation
router.get('/uploaded-resumes', async (req, res) => {
    try {
        console.log('GET /uploaded-resumes - Auth status:', req.isAuthenticated());
        console.log('User:', req.user);

        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ 
                error: "Unauthorized",
                message: "Please log in to view resumes"
            });
        }

        const resumes = await storage.getUploadedResumesByUser(req.user.id);
        console.log('Found resumes:', resumes);

        // Set proper content type and return JSON response
        res.setHeader('Content-Type', 'application/json');
        res.json(resumes);
    } catch (error: any) {
        console.error('Error fetching resumes:', error);
        res.status(500).json({
            error: "Failed to fetch resumes",
            details: error.message
        });
    }
});

// Upload new resume
router.post('/resume/upload', upload.single('file'), async (req: MulterRequest, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
        }

        const { content, contactInfo } = await parseResume(req.file.buffer, req.file.mimetype);
        const resumeData = insertUploadedResumeSchema.parse({
            content,
            metadata: {
                filename: req.file.originalname,
                fileType: req.file.mimetype,
                uploadedAt: new Date().toISOString()
            },
            contactInfo
        });

        const resume = await storage.createUploadedResume({
            ...resumeData,
            userId: req.user!.id
        });

        res.status(201).json(resume);
    } catch (error: any) {
        console.error('Upload error:', error);
        res.status(400).json({
            error: "Failed to upload resume",
            details: error.message
        });
    }
});

// Delete resume
router.delete('/resume/:id', async (req, res) => {
    // Ensure we always send JSON response
    res.setHeader('Content-Type', 'application/json');

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

        console.log(`Deleting uploaded resume with ID: ${resumeId} requested by user: ${req.user!.id}`);

        try {
            // Attempt to delete the resume
            await storage.deleteUploadedResume(resumeId);

            // Double-check if deletion was successful
            const resumeStillExists = await db.select().from(uploadedResumes).where(eq(uploadedResumes.id, resumeId));
            if (resumeStillExists.length > 0) {
                console.log(`Warning: Resume ${resumeId} still exists after deletion attempt, trying direct DB deletion`);
                await db.delete(uploadedResumes).where(eq(uploadedResumes.id, resumeId));
            }

            return res.json({ 
                message: "Resume deleted successfully",
                id: resumeId,
                timestamp: Date.now() 
            });
        } catch (error) {
            console.error("Error deleting uploaded resume:", error);
            // Attempt direct database deletion as fallback
            try {
                await db.delete(uploadedResumes).where(eq(uploadedResumes.id, resumeId));
                return res.json({ 
                    message: "Resume deleted via fallback method",
                    id: resumeId,
                    timestamp: Date.now()
                });
            } catch (fallbackError) {
                return res.status(500).json({ 
                    error: "Failed to delete resume", 
                    details: fallbackError.message 
                });
            }
        }
    } catch (error: any) {
        console.error('Delete error:', error);
        res.status(500).json({
            error: "Failed to delete resume",
            details: error.message
        });
    }
});

export const resumeRoutes = router;