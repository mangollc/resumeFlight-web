import express, { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { optimizedResumes } from '@shared/schema';
import { db } from '../db';
import { storage } from "../storage";
import { generateResumeDOCX, generateCoverLetterDOCX } from "../utils/docx-generator";
import { generateCoverLetter } from "../openai";
import { requireAuth } from "../auth";

const router = Router();

// Test endpoint to verify JSON responses are working
router.get('/api/test-json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify({ success: true, message: "JSON endpoint working correctly" }));
});

// Get all optimized resumes
router.get('/optimized-resumes', requireAuth, async (req, res) => {
  try {
    // Query the database for optimized resumes
    const resumes = await db.select().from(optimizedResumes).orderBy(desc(optimizedResumes.createdAt));

    // Map to safe data format
    const safeResumes = resumes.map(resume => ({
      id: resume.id,
      title: resume.title || "Untitled Resume",
      jobTitle: resume.jobTitle || "Unknown Position",
      createdAt: resume.createdAt.toISOString(),
      updatedAt: resume.updatedAt.toISOString(),
      company: resume.company || "Unknown Company",
      // Don't include the full content in the list view
      resumeId: resume.resumeId
    }));

    // Log what we're about to return 
    console.log("Returning optimized resumes:", 
      `${safeResumes.length} resumes found`);

    // Explicitly set content type header
    res.setHeader('Content-Type', 'application/json');

    // Send the JSON response directly with res.json
    return res.json(safeResumes);
  } catch (error) {
    console.error("Error fetching optimized resumes:", error);
    return res.status(500).json({ 
      error: true,
      message: "Failed to fetch optimized resumes", 
      details: error instanceof Error ? error.message : "Unknown error" 
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