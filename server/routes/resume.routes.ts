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
                uploadedAt: new Date().toISOString(),
                originalFileBase64: req.file.buffer.toString('base64') //Store original file as Base64
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
        console.error('Delete error:', error);
        res.status(500).json({
            error: "Failed to delete resume",
            details: error.message
        });
    }
});

// Get original resume file
router.get('/resume/:id/original', async (req, res) => {
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

        // Get the original file as Base64 from metadata
        const originalFileBase64 = resume.metadata.originalFileBase64;
        if (!originalFileBase64) {
            return res.status(404).json({ error: "Original file not found" });
        }

        // Convert Base64 back to buffer
        const fileBuffer = Buffer.from(originalFileBase64, 'base64');

        // Set appropriate headers
        res.setHeader('Content-Type', resume.metadata.fileType);
        res.setHeader('Content-Disposition', `attachment; filename="${resume.metadata.filename}"`);

        // Send the file
        res.send(fileBuffer);
    } catch (error: any) {
        console.error("Error getting original resume:", error);
        return res.status(500).json({ error: error.message });
    }
});

export const resumeRoutes = router;