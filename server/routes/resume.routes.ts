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
import { Packer } from 'docx';
import { generateResumeDoc, generateCoverLetterDoc, generateResumeName, generateCoverLetterName } from '../utils/document-generator';

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
router.get('/uploaded-resumes', async (req, res) => {
    try {
        if (!req.isAuthenticated() || !req.user) {
            return res.status(401).json({ 
                error: "Unauthorized",
                message: "Please log in to view resumes"
            });
        }

        const resumes = await storage.getUploadedResumesByUser(req.user.id);
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

// Delete uploaded resume
router.delete('/resume/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        console.log(`API: Delete request for resume ID: ${req.params.id}`);
        const resumeId = parseInt(req.params.id);

        if (isNaN(resumeId)) {
            console.error(`API: Invalid resume ID: ${req.params.id}`);
            return res.status(400).json({ error: "Invalid resume ID" });
        }

        const resume = await storage.getUploadedResume(resumeId);

        if (!resume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        if (resume.userId !== req.user!.id) {
            return res.status(403).json({ error: "Not authorized" });
        }

        await storage.deleteUploadedResume(resumeId);
        return res.status(200).json({ 
            success: true,
            message: "Resume deleted successfully", 
            resumeId 
        });
    } catch (error: any) {
        console.error('Delete error:', error);
        return res.status(500).json({
            success: false,
            error: "Failed to delete resume",
            details: error.message
        });
    }
});

// Delete optimized resume - Updated route to match client-side request
router.delete('/resume/optimized/:id', async (req, res) => {
    try {
        if (!req.isAuthenticated()) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        console.log(`API: Delete request for optimized resume ID: ${req.params.id}`);
        const resumeId = parseInt(req.params.id);

        if (isNaN(resumeId)) {
            console.error(`API: Invalid optimized resume ID: ${req.params.id}`);
            return res.status(400).json({ error: "Invalid resume ID" });
        }

        const resume = await storage.getOptimizedResume(resumeId);

        if (!resume) {
            console.error(`API: Optimized resume with ID ${resumeId} not found`);
            return res.status(404).json({ error: "Resume not found" });
        }

        if (resume.userId !== req.user!.id) {
            console.error(`API: User ${req.user!.id} not authorized to delete optimized resume ${resumeId}`);
            return res.status(403).json({ error: "Not authorized" });
        }

        await storage.deleteOptimizedResume(resumeId);
        res.status(200).json({ 
            success: true,
            message: "Optimized resume deleted successfully", 
            resumeId 
        });

        console.log(`API: Successfully deleted optimized resume with ID: ${resumeId}`);
    } catch (error: any) {
        console.error('Delete optimized resume error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to delete optimized resume",
            details: error.message
        });
    }
});

// Download optimized resume in DOCX format
router.get('/optimized/:id/download', async (req, res) => {
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

        // Generate DOCX document
        const doc = generateResumeDoc(resume);
        const buffer = await Packer.toBuffer(doc);

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${generateResumeName(resume)}`);

        // Send the document
        res.send(buffer);
    } catch (error: any) {
        console.error('Error downloading resume:', error);
        res.status(500).json({
            error: "Failed to download resume",
            details: error.message
        });
    }
});

// Download cover letter in DOCX format
router.get('/optimized/:id/cover-letter/download', async (req, res) => {
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

        const coverLetter = await storage.getCoverLetterByResumeId(resumeId);

        if (!coverLetter) {
            return res.status(404).json({ error: "Cover letter not found" });
        }

        // Generate DOCX document
        const doc = generateCoverLetterDoc(coverLetter, resume);
        const buffer = await Packer.toBuffer(doc);

        // Set response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        res.setHeader('Content-Disposition', `attachment; filename=${generateCoverLetterName(coverLetter, resume)}`);

        // Send the document
        res.send(buffer);
    } catch (error: any) {
        console.error('Error downloading cover letter:', error);
        res.status(500).json({
            error: "Failed to download cover letter",
            details: error.message
        });
    }
});

export const resumeRoutes = router;