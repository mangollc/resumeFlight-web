import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { optimizeResume, generateCoverLetter, openai } from "./openai"; // Import openai
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import PDFDocument from "pdfkit";
import { insertUploadedResumeSchema } from "@shared/schema"; // Assuming this is the correct import
import axios from "axios";
import * as cheerio from "cheerio";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

interface JobDetails {
  title: string;
  company: string;
  salary?: string;
  location: string;
  description: string;
  positionLevel?: string; // Added fields from AI analysis
  candidateProfile?: string;
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

async function extractJobDetails(url: string): Promise<JobDetails> {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // LinkedIn specific selectors
    const linkedInSelectors = {
      title: ['.top-card-layout__title', '.job-details-jobs-unified-top-card__job-title'],
      company: ['.topcard__org-name-link', '.job-details-jobs-unified-top-card__company-name'],
      location: ['.topcard__flavor:not(:contains("applicants"))', '.job-details-jobs-unified-top-card__bullet:not(:contains("applicants"))'],
      salary: ['.compensation__salary', '.job-details-jobs-unified-top-card__salary-info'],
      description: ['.description__text', '.job-details-jobs-unified-top-card__job-description']
    };

    // Generic job board selectors as fallback
    const genericSelectors = {
      title: ['h1', '.job-title', '[data-testid="job-title"]', '.position-title'],
      company: ['.company-name', '[data-testid="company-name"]', '.employer'],
      location: ['.location', '[data-testid="location"]', '.job-location'],
      salary: ['.salary', '[data-testid="salary-range"]', '.compensation'],
      description: [
        '.job-description',
        '#job-description',
        '[data-testid="job-description"]',
        '.description'
      ]
    };

    // Helper function to find content using multiple selectors with improved text cleaning
    const findContent = (selectors: string[], type: keyof typeof linkedInSelectors): string => {
      // Try LinkedIn specific selectors first
      for (const selector of linkedInSelectors[type]) {
        const element = $(selector);
        if (element.length) {
          let text = element.text().trim().replace(/\s+/g, ' ');
          // Clean up location text specifically
          if (type === 'location') {
            text = text.replace(/\d+\s*applicants?/gi, '')  // Remove applicant counts
                      .replace(/^\s*[,\s]+|\s*[,\s]+$/g, '') // Remove leading/trailing commas and spaces
                      .trim();
          }
          return text;
        }
      }

      // Try generic selectors as fallback
      for (const selector of genericSelectors[type]) {
        const element = $(selector);
        if (element.length) {
          return element.text().trim().replace(/\s+/g, ' ');
        }
      }

      return '';
    };

    // Extract job details with better handling
    const title = findContent(genericSelectors.title, 'title');
    const company = findContent(genericSelectors.company, 'company');
    let location = findContent(genericSelectors.location, 'location');
    const salary = findContent(genericSelectors.salary, 'salary');
    let description = findContent(genericSelectors.description, 'description');

    // If description is empty, try to get content from the main job content area
    if (!description) {
      description = $('.job-view-layout').text().trim() || 
                   $('.description__text').text().trim() || 
                   $('main').text().trim();
    }

    // Check for remote indicators with improved detection
    const isRemote = [description, location, $('body').text()].some(text => 
      text.toLowerCase().includes('remote') ||
      text.toLowerCase().includes('work from home') ||
      text.toLowerCase().includes('wfh')
    );

    if (isRemote) {
      location = location ? `${location} (Remote)` : 'Remote';
    }

    // Analyze job description with AI
    const aiAnalysis = await analyzeJobDescription(description);

    // Validate extracted data
    const jobDetails: JobDetails = {
      title: title || 'Not specified',
      company: company || 'Not specified',
      salary: salary || undefined,
      location: location || 'Not specified',
      description,
      positionLevel: aiAnalysis.positionLevel,
      candidateProfile: aiAnalysis.candidateProfile
    };

    // Validate that we have at least some essential information
    if (!jobDetails.description || jobDetails.description.length < 50) {
      throw new Error("Could not extract sufficient job details. The page might be dynamically loaded or require authentication.");
    }

    return jobDetails;
  } catch (error: any) {
    console.error("Error extracting job details:", error);
    throw new Error(
      error.message === "Could not extract sufficient job details. The page might be dynamically loaded or require authentication."
        ? error.message
        : "Failed to extract job details from URL. Please paste the description manually."
    );
  }
}

// Fix the analyzeJobDescription function
async function analyzeJobDescription(description: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze the job description and provide:
1. The position level (e.g., Senior, Mid-level, Junior, Intern, Entry-level)
2. A concise summary of the ideal candidate profile (skills, experience, and qualifications)
Return as JSON: {
  "positionLevel": "string",
  "candidateProfile": "string (max 100 words)"
}`
        },
        {
          role: "user",
          content: description
        }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return {
        positionLevel: "Not specified",
        candidateProfile: "Unable to generate candidate profile"
      };
    }

    return JSON.parse(content) as {
      positionLevel: string;
      candidateProfile: string;
    };
  } catch (error) {
    console.error("Error analyzing job description:", error);
    return {
      positionLevel: "Not specified",
      candidateProfile: "Unable to generate candidate profile"
    };
  }
}

// Fix the createPDF function
async function createPDF(content: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

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

      const validatedData = insertUploadedResumeSchema.parse({
        content: content,
        metadata: {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });

      const resume = await storage.createUploadedResume({
        ...validatedData,
        userId: req.user!.id
      });

      res.json(resume);
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/uploaded-resumes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const resumes = await storage.getUploadedResumesByUser(req.user!.id);
      res.json(resumes);
    } catch (error: any) {
      console.error("Get uploaded resumes error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/uploaded-resume/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const resume = await storage.getUploadedResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      await storage.deleteUploadedResume(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error: any) {
      console.error("Delete uploaded resume error:", error);
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

      const uploadedResume = await storage.getUploadedResume(parseInt(req.params.id));
      if (!uploadedResume) return res.status(404).send("Resume not found");
      if (uploadedResume.userId !== req.user!.id) return res.sendStatus(403);

      let jobDetails: JobDetails;

      if (jobUrl) {
        jobDetails = await extractJobDetails(jobUrl);
      } else {
        jobDetails = {
          title: 'Manual Entry',
          company: 'Manual Entry',
          location: 'Not specified',
          description: jobDescription
        };
      }

      const optimized = await optimizeResume(uploadedResume.content, jobDetails.description);

      // Create a new optimized resume with jobUrl
      const optimizedResume = await storage.createOptimizedResume({
        content: optimized.optimizedContent,
        jobDescription: jobDetails.description,
        jobUrl: jobUrl || null, // Store jobUrl if available
        jobDetails,
        uploadedResumeId: uploadedResume.id,
        userId: req.user!.id,
        metadata: {
          filename: `${uploadedResume.metadata.filename}_optimized`,
          optimizedAt: new Date().toISOString()
        }
      });

      res.json({
        ...optimizedResume,
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

  app.get("/api/optimized-resumes", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      const resumes = await storage.getOptimizedResumesByUser(req.user!.id);
      res.json(resumes);
    } catch (error: any) {
      console.error("Get optimized resumes error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/optimized-resume/:id/cover-letter", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const optimizedResume = await storage.getOptimizedResume(parseInt(req.params.id));
      if (!optimizedResume) return res.status(404).send("Optimized resume not found");
      if (optimizedResume.userId !== req.user!.id) return res.sendStatus(403);

      const generated = await generateCoverLetter(optimizedResume.content, optimizedResume.jobDescription);

      // Create cover letter with proper optimizedResumeId
      const coverLetter = await storage.createCoverLetter({
        content: generated.coverLetter,
        optimizedResumeId: optimizedResume.id,
        userId: req.user!.id,
        metadata: {
          filename: `cover_letter_${optimizedResume.metadata.filename}`,
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


  // Add this new route to handle deletion of optimized resumes
  app.delete("/api/optimized-resume/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const optimizedResume = await storage.getOptimizedResume(parseInt(req.params.id));
      if (!optimizedResume) return res.status(404).send("Resume not found");
      if (optimizedResume.userId !== req.user!.id) return res.sendStatus(403);

      // Delete the corresponding cover letter first
      const coverLetters = await storage.getCoverLettersByOptimizedResumeId(parseInt(req.params.id));
      for (const coverLetter of coverLetters) {
        await storage.deleteCoverLetter(coverLetter.id);
      }

      // Then delete the optimized resume
      await storage.deleteOptimizedResume(parseInt(req.params.id));
      res.sendStatus(200);
    } catch (error: any) {
      console.error("Delete optimized resume error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}