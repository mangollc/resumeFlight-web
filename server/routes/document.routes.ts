import express from "express";
import { storage } from "../storage";
import { generateResumeDOCX, generateCoverLetterDOCX } from "../utils/docx-generator";
import { generateCoverLetter } from "../openai";
import { requireAuth } from "../auth";
// Assuming db is imported elsewhere, adjust as needed.
import { eq, desc } from 'drizzle-orm'; // Or your ORM's equivalent
import { optimizedResumes } from '../db/schema'; // Or your schema import


const router = express.Router();

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
    const userId = req.user?.id;

    // If no user, return only public resumes (none for now)
    if (!userId) {
      return res.json([]);
    }

    const resumes = await db.query.optimizedResumes.findMany({
      where: eq(optimizedResumes.userId, userId),
      orderBy: [desc(optimizedResumes.createdAt)],
    });

    // Transform data to ensure all required fields exist
    const processedResumes = resumes.map(resume => {
      return {
        ...resume,
        metadata: resume.metadata || {
          version: "1.0",
          optimizedAt: resume.createdAt?.toISOString(),
          filename: "resume.docx"
        },
        jobDetails: resume.jobDetails || {
          title: "Untitled Position",
          company: "Unknown Company",
          location: "Not specified",
          description: "",
          requirements: []
        },
        analysis: resume.analysis || {
          strengths: [],
          improvements: [],
          gaps: [],
          suggestions: []
        }
      };
    });

    return res.json(processedResumes);
  } catch (error) {
    console.error("Error fetching optimized resumes:", error);
    return res.status(500).json({ error: "Failed to fetch optimized resumes" });
  }
});

export default router;