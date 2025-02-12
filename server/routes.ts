import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { optimizeResume } from "./openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import { insertResumeSchema } from "@shared/schema";

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

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/resume/upload", upload.single("file"), async (req, res) => {
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
        jobDescription: null,
        userId: req.user!.id
      });

      res.json(resume);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/resume/:id/optimize", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const { jobDescription } = req.body;
      if (!jobDescription) {
        return res.status(400).json({ error: "Job description is required" });
      }

      const resume = await storage.getResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      const optimized = await optimizeResume(resume.originalContent, jobDescription);

      // Update resume with optimization results
      const updated = await storage.updateResume(resume.id, {
        optimizedContent: optimized.optimizedContent,
        jobDescription
      });

      res.json(updated);
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

  const httpServer = createServer(app);
  return httpServer;
}