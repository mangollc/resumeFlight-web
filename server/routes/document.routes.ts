import express, { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { optimizedResumes } from '@shared/schema';
import { db } from '../db';
import { storage } from "../storage";
import { generateResumeDOCX, generateCoverLetterDOCX } from "../utils/docx-generator";
import { generateCoverLetter } from "../openai";
import { requireAuth } from "../auth";
import { Router as Router2 } from "express";
import { z } from "zod";
import { uploadedResumes } from "../../migrations/schema";
import { uploadFile, getSignedUrl, deleteFile } from "../storage";
import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { DocxGenerator } from "../utils/docx-generator";
import { optimizeResume, analyzeJobPosting, analyzeResumeDifferences } from "../openai";

const router = Router();

// Test endpoint to verify JSON responses are working
router.get('/api/test-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ success: true, message: "JSON endpoint working correctly" }));
});

// Get all optimized resumes
router.get('/optimized-resumes', requireAuth, async (req, res) => {
  try {
    // Set the content type header to ensure proper JSON response
    res.setHeader('Content-Type', 'application/json');

    console.log("Fetching optimized resumes...");
    const results = await db.select().from(optimizedResumes).orderBy(desc(optimizedResumes.createdAt));

    // Ensure we have valid array data
    if (!Array.isArray(results)) {
      console.log("Results not an array, returning empty array");
      return res.json([]);
    }

    // Process each resume safely
    const safeResumes = results.map(resume => ({
      id: resume.id,
      title: resume.title || "Untitled Resume",
      jobTitle: resume.jobTitle || "Unknown Position",
      company: resume.company || "Unknown Company",
      resumeId: resume.resumeId,
      createdAt: resume.createdAt ? new Date(resume.createdAt).toISOString() : new Date().toISOString()
    }));

    console.log("Returning optimized resumes:", safeResumes.length);

    // Return JSON response
    return res.json(safeResumes);
  } catch (error) {
    console.error("Error fetching optimized resumes:", error);
    // Always return a valid JSON response, even in error cases
    return res.status(500).json({ 
      error: "Error fetching optimized resumes", 
      message: error instanceof Error ? error.message : "Unknown error",
      resumes: [] 
    });
  }
});

// Generate and download cover letter
router.get("/cover-letter/:resumeId/download", requireAuth, async (req, res) => {
  try {
    const resumeId = parseInt(req.params.resumeId);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const resume = await storage.getOptimizedResume(resumeId);
    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    if (resume.userId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check if we already have a cover letter for this resume
    // If not, generate one using OpenAI
    let coverLetterContent;
    let existingCoverLetter;

    try {
      existingCoverLetter = await storage.getCoverLetterByResumeId(resumeId);
    } catch (error) {
      console.log("Error getting existing cover letter:", error);
    }

    if (existingCoverLetter && existingCoverLetter.content) {
      coverLetterContent = existingCoverLetter.content;
    } else {
      // Generate a new cover letter
      const result = await generateCoverLetter(
        resume.content,
        resume.jobDescription,
        resume.contactInfo,
        parseFloat(resume.metadata.version)
      );

      coverLetterContent = result.content;

      // Store the generated cover letter
      try {
        await storage.createCoverLetter({
          userId,
          optimizedResumeId: resumeId,
          content: coverLetterContent,
          metadata: {
            filename: `Cover_Letter_${resume.metadata.version}`,
            generatedAt: new Date().toISOString(),
            version: resume.metadata.version
          },
          highlights: result.highlights,
          confidence: result.confidence,
          version: `${result.version}`,
          versionHistory: [{
            content: coverLetterContent,
            version: `${result.version}`,
            generatedAt: new Date().toISOString()
          }]
        });
      } catch (error) {
        console.error("Error saving cover letter:", error);
      }
    }

    // Generate position-specific filename
    const position = resume.jobDetails?.title || "Position";
    const company = resume.jobDetails?.company || "";
    const name = resume.contactInfo?.fullName?.replace(/\s+/g, "_") || "cover_letter";
    const filename = `${name}_CoverLetter_${position}${company ? "_" + company : ""}_v${resume.metadata.version}.docx`;

    // Generate DOCX file
    const buffer = generateCoverLetterDOCX(
      coverLetterContent,
      resume.contactInfo,
      resume.jobDetails
    );

    // Send file to client
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error generating cover letter:", error);
    res.status(500).json({ error: "Failed to generate cover letter" });
  }
});

// Download endpoint for optimized resume
router.get('/api/optimized-resumes/:id/download', requireAuth, async (req, res) => {
  try {
    const resumeId = Number(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const resume = await db.query.optimizedResumes.findFirst({
      where: eq(optimizedResumes.id, resumeId),
    });

    if (!resume || resume.userId !== userId) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Generate DOCX content
    const docxBuffer = await generateDocx(resume.optimisedResume || "");

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="optimized-resume-${resumeId}.docx"`);
    res.setHeader('Content-Length', docxBuffer.length);

    res.end(docxBuffer);
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ error: "Failed to download resume" });
  }
});


// Export as named export
export const documentRoutes = router;

// Also keep default export for backward compatibility
export default router;