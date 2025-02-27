import { Router } from "express";
import { db } from "../db";
import { optimizedResumes, coverLetters } from "@shared/schema";
import { eq } from "drizzle-orm";
import { ensureAuthenticated } from "../auth";

const router = Router();

// Get all optimized resumes
router.get("/", ensureAuthenticated, async (req, res) => {
  try {
    const resumes = await db.query.optimizedResumes.findMany({
      where: eq(optimizedResumes.userId, req.user!.id),
      orderBy: (optimizedResumes, { desc }) => [desc(optimizedResumes.createdAt)],
      with: {
        coverLetter: true,
      },
    });

    res.json(resumes);
  } catch (error) {
    console.error("Error fetching optimized resumes:", error);
    res.status(500).json({ error: "Failed to fetch optimized resumes" });
  }
});

// Get a single optimized resume by ID
router.get("/:id", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { and, eq }) => 
        and(eq(optimizedResumes.id, parseInt(id)), eq(optimizedResumes.userId, req.user!.id)),
      with: {
        uploadedResume: true,
        coverLetter: true,
      },
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.json(resume);
  } catch (error) {
    console.error("Error fetching optimized resume:", error);
    res.status(500).json({ error: "Failed to fetch optimized resume" });
  }
});

// Download an optimized resume
router.get("/:id/download", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const resume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { and, eq }) => 
        and(eq(optimizedResumes.id, parseInt(id)), eq(optimizedResumes.userId, req.user!.id)),
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Here you would generate and send the PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume.pdf"`);

    // In a real implementation, you would generate and send the PDF here
    res.send("PDF Content Would Go Here");
  } catch (error) {
    console.error("Error downloading resume:", error);
    res.status(500).json({ error: "Failed to download resume" });
  }
});

// Download a cover letter
router.get("/:resumeId/cover-letter/:letterId/download", ensureAuthenticated, async (req, res) => {
  try {
    const { resumeId, letterId } = req.params;

    // Verify the resume belongs to the user
    const resume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { and, eq }) => 
        and(eq(optimizedResumes.id, parseInt(resumeId)), eq(optimizedResumes.userId, req.user!.id)),
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    // Get the cover letter
    const letter = await db.query.coverLetters.findFirst({
      where: (coverLetters, { and, eq }) => 
        and(eq(coverLetters.id, parseInt(letterId)), eq(coverLetters.optimizedResumeId, parseInt(resumeId))),
    });

    if (!letter) {
      return res.status(404).json({ error: "Cover letter not found" });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cover_letter.pdf"`);

    // In a real implementation, you would generate and send the PDF here
    res.send("Cover Letter PDF Content Would Go Here");
  } catch (error) {
    console.error("Error downloading cover letter:", error);
    res.status(500).json({ error: "Failed to download cover letter" });
  }
});

// Download complete package (resume + cover letter)
router.post("/:id/package/download", ensureAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { coverLetterId } = req.body;

    // Verify the resume belongs to the user
    const resume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { and, eq }) => 
        and(eq(optimizedResumes.id, parseInt(id)), eq(optimizedResumes.userId, req.user!.id)),
    });

    if (!resume) {
      return res.status(404).json({ error: "Resume not found" });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="resume_package.zip"`);

    // In a real implementation, you would generate and send the ZIP here
    res.send("ZIP Package Content Would Go Here");
  } catch (error) {
    console.error("Error downloading package:", error);
    res.status(500).json({ error: "Failed to download package" });
  }
});

export default router;