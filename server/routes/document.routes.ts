import express, { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { optimizedResumes } from '../db/schema';
import { db } from '../db';
import { generateDocx } from '../utils/docx-generator';
import fs from 'fs';
import path from 'path';
import { storage } from "../storage";
import { generateResumeDOCX, generateCoverLetterDOCX } from "../utils/docx-generator";
import { generateCoverLetter } from "../openai";
import { requireAuth } from "../auth";


const router = Router();

// Get optimized resume as DOCX
router.get("/resume/:id/download", requireAuth, async (req, res) => {
  try {
    const resumeId = parseInt(req.params.id);
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

    // Generate filename with position and company
    const position = resume.jobDetails?.title || "Resume";
    const company = resume.jobDetails?.company || "";
    const name = resume.contactInfo?.fullName?.replace(/\s+/g, "_") || "resume";
    const filename = `${name}_${position}${company ? "_" + company : ""}_v${resume.metadata.version}.docx`;

    // Generate DOCX file using optimisedResume field
    const buffer = generateResumeDOCX(
      resume.optimisedResume, 
      resume.contactInfo || {},
      resume.jobDetails || {}
    );

    // Send file to client
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ error: "Failed to download resume" });
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

router.get('/api/optimized-resumes', async (req, res) => {
  try {
    // Set the content type explicitly to JSON
    res.setHeader('Content-Type', 'application/json');

    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const results = await db.query.optimizedResumes.findMany({
      where: eq(optimizedResumes.userId, userId),
      orderBy: [desc(optimizedResumes.updatedAt)],
    });

    // Ensure we're not sending undefined or null values
    const safeResumes = results.map(resume => ({
      id: resume.id || 0,
      userId: resume.userId || 0,
      uploadedResumeId: resume.uploadedResumeId || 0,
      createdAt: resume.createdAt || new Date(),
      updatedAt: resume.updatedAt || new Date(),
      optimisedResume: resume.optimisedResume || "",
      analysis: resume.analysis || { 
        strengths: [], 
        improvements: [],
        gaps: [], 
        suggestions: [] 
      },
      metadata: resume.metadata || {
        version: "1.0",
        optimizedAt: new Date().toISOString(),
        filename: "resume.docx"
      },
      jobDetails: resume.jobDetails || {
        title: "Untitled Position",
        company: "Unknown Company",
        location: "Not specified",
        description: ""
      }
    }));

    // Always set content type header before sending response
    res.setHeader('Content-Type', 'application/json');
    
    // Send the JSON response
    return res.json(safeResumes); // Use res.json() instead of res.send(JSON.stringify())
  } catch (error) {
    console.error("Error fetching optimized resumes:", error);
    // Ensure we're still returning JSON even in error case
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ 
      error: "Failed to fetch optimized resumes", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

// Download endpoint for optimized resume
router.get('/api/optimized-resumes/:id/download', async (req, res) => {
  try {
    const resumeId = Number(req.params.id);
    const userId = req.session?.user?.id;

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

// Test endpoint to verify JSON responses are working
router.get('/api/test-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ success: true, message: "JSON endpoint working correctly" }));
});

export default router;