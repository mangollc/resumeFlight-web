import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { optimizeResume, generateCoverLetter } from "./openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import PDFDocument from "pdfkit";
import { insertResumeSchema } from "@shared/schema";
import axios from "axios";
import * as cheerio from "cheerio";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

async function parseResume(buffer: Buffer, mimetype: string): Promise<string> {
  try {
    if (mimetype === "application/pdf") {
      const pdfParser = new PDFParser(null);
      return new Promise((resolve, reject) => {
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
          resolve(pdfData.Pages.map(page =>
            page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(" ")
          ).join("\n"));
        });
        pdfParser.on("pdfParser_dataError", reject);
        pdfParser.parseBuffer(buffer);
      });
    } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    throw new Error("Unsupported file type");
  } catch (error) {
    console.error("Error parsing resume:", error);
    throw new Error("Failed to parse resume file");
  }
}

async function extractJobDescription(url: string): Promise<string> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Common job description selectors
    const selectors = [
      '.job-description',
      '#job-description',
      '[data-testid="job-description"]',
      '.description',
      '.jobDescription',
      'article',
      'section'
    ];

    for (const selector of selectors) {
      const element = $(selector);
      if (element.length) {
        return element.text().trim();
      }
    }

    // Fallback to main content if specific selectors not found
    return $('main').text().trim() || $('body').text().trim();
  } catch (error) {
    console.error("Error extracting job description:", error);
    throw new Error("Failed to extract job description from URL. Please paste the description manually.");
  }
}

function createPDF(content: string): Buffer {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Add content to PDF
      doc.fontSize(12)
         .font('Helvetica')
         .text(content, {
           align: 'left',
           lineGap: 5
         });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/resume/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!req.file) return res.status(400).send("No file uploaded");

      const content = await parseResume(req.file.buffer, req.file.mimetype);

      const validatedData = insertResumeSchema.parse({
        originalContent: content,
        metadata: {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });

      const resume = await storage.createResume({
        ...validatedData,
        jobDescription: "",
        userId: req.user!.id
      });

      res.json(resume);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/resume/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      const content = resume.optimizedContent || resume.originalContent;
      const pdfBuffer = await createPDF(content);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${resume.metadata.filename}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/resume/:id/optimize", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const { jobUrl, jobDescription } = req.body;

      if (!jobUrl && !jobDescription) {
        return res.status(400).json({ error: "Please provide either a job URL or description" });
      }

      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      // Extract job description from URL if provided
      const finalJobDescription = jobUrl ? await extractJobDescription(jobUrl) : jobDescription;

      const optimized = await optimizeResume(resume.originalContent, finalJobDescription);

      // Update resume with optimization results
      const updated = await storage.updateResume(resume.id, {
        optimizedContent: optimized.optimizedContent,
        jobDescription: finalJobDescription
      });

      res.json({
        ...updated,
        optimizationDetails: {
          changes: optimized.changes,
          matchScore: optimized.matchScore
        }
      });
    } catch (error: any) {
      console.error("Optimization error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/resume", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const resumes = await storage.getResumesByUser(req.user!.id);
      res.json(resumes);
    } catch (error: any) {
      console.error("Get resumes error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add these new routes after the existing resume routes
  app.post("/api/resume/:id/cover-letter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);
      if (!resume.jobDescription) return res.status(400).send("No job description available");

      const generated = await generateCoverLetter(resume.originalContent, resume.jobDescription);

      const coverLetter = await storage.createCoverLetter({
        content: generated.coverLetter,
        jobDescription: resume.jobDescription,
        resumeId: resume.id,
        userId: req.user!.id,
        metadata: {
          filename: `cover-letter-${new Date().toISOString()}.pdf`,
          generatedAt: new Date().toISOString()
        }
      });

      res.json({
        ...coverLetter,
        highlights: generated.highlights,
        confidence: generated.confidence
      });
    } catch (error: any) {
      console.error("Cover letter generation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cover-letter/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const coverLetter = await storage.getCoverLetter(parseInt(req.params.id));
      if (!coverLetter) return res.status(404).send("Cover letter not found");
      if (coverLetter.userId !== req.user!.id) return res.sendStatus(403);

      const pdfBuffer = await createPDF(coverLetter.content);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${coverLetter.metadata.filename}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cover-letter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const coverLetters = await storage.getCoverLettersByUser(req.user!.id);
      res.json(coverLetters);
    } catch (error: any) {
      console.error("Get cover letters error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}