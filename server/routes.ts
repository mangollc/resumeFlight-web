async function calculateMatchScores(resumeContent: string, jobDescription: string): Promise<{
 keywords: number;
 skills: number;
 experience: number;
 overall: number;
}> {
 try {
  const response = await openai.chat.completions.create({
   model: "gpt-4o",
   messages: [
    {
     role: "system",
     content: `You are a resume analysis expert. Compare the resume against the job description and calculate match scores.
Your response should be a valid JSON string in the following format ONLY:
{
  "keywords": <number between 0-100>,
  "skills": <number between 0-100>,
  "experience": <number between 0-100>,
  "overall": <number between 0-100>
}
Do not include any explanations, just the JSON object.`
    },
    {
     role: "user",
     content: `Resume:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
    }
   ]
  });

  const content = response.choices[0].message.content;
  if (!content) return getDefaultMetrics();

  try {
   const metrics = JSON.parse(content);
   return {
    keywords: Math.min(100, Math.max(0, Number(metrics.keywords) || 0)),
    skills: Math.min(100, Math.max(0, Number(metrics.skills) || 0)),
    experience: Math.min(100, Math.max(0, Number(metrics.experience) || 0)),
    overall: Math.min(100, Math.max(0, Number(metrics.overall) || 0))
   };
  } catch (parseError) {
   console.error("Error parsing metrics response:", parseError);
   return getDefaultMetrics();
  }
 } catch (error) {
  console.error("Error calculating match scores:", error);
  return getDefaultMetrics();
 }
}

function getDefaultMetrics() {
 return {
  keywords: 0,
  skills: 0,
  experience: 0,
  overall: 0
 };
}

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
 keyPoints?: string[];
 keyRequirements?: string[];
 skillsAndTools?: string[];
 metrics?: {
  keywords?: number;
  skills?: number;
  experience?: number;
  overall?: number;
 };
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

  const linkedInSelectors = {
   title: ['.top-card-layout__title', '.job-details-jobs-unified-top-card__job-title'],
   company: ['.topcard__org-name-link', '.job-details-jobs-unified-top-card__company-name'],
   location: ['.topcard__flavor:not(:contains("applicants"))', '.job-details-jobs-unified-top-card__bullet:not(:contains("applicants"))'],
   salary: ['.compensation__salary', '.job-details-jobs-unified-top-card__salary-info'],
   description: ['.description__text', '.job-details-jobs-unified-top-card__job-description']
  };

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

  const findContent = (selectors: string[], type: keyof typeof linkedInSelectors): string => {
   for (const selector of linkedInSelectors[type]) {
    const element = $(selector);
    if (element.length) {
     let text = element.text().trim().replace(/\s+/g, ' ');
     if (type === 'location') {
      text = text.replace(/\d+\s*applicants?/gi, '')
        .replace(/^\s*[,\s]+|\s*[,\s]+$/g, '')
        .trim();
     }
     return text;
    }
   }

   for (const selector of genericSelectors[type]) {
    const element = $(selector);
    if (element.length) {
     return element.text().trim().replace(/\s+/g, ' ');
    }
   }

   return '';
  };

  const title = findContent(genericSelectors.title, 'title');
  const company = findContent(genericSelectors.company, 'company');
  let location = findContent(genericSelectors.location, 'location');
  const salary = findContent(genericSelectors.salary, 'salary');
  let description = findContent(genericSelectors.description, 'description');

  if (!description) {
   description = $('.job-view-layout').text().trim() ||
    $('.description__text').text().trim() ||
    $('main').text().trim();
  }

  const isRemote = [description, location, $('body').text()].some(text =>
   text.toLowerCase().includes('remote') ||
   text.toLowerCase().includes('work from home') ||
   text.toLowerCase().includes('wfh')
  );

  if (isRemote) {
   location = location ? `${location} (Remote)` : 'Remote';
  }

  const aiAnalysis = await analyzeJobDescription(description);

  const jobDetails: JobDetails = {
   title: title || 'Not specified',
   company: company || 'Not specified',
   salary: salary || undefined,
   location: location || 'Not specified',
   description,
   positionLevel: aiAnalysis.positionLevel,
   keyRequirements: aiAnalysis.keyRequirements,
   skillsAndTools: aiAnalysis.skillsAndTools,
   metrics: aiAnalysis.metrics
  };

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

async function analyzeJobDescription(description: string) {
  try {
    console.log("[AI Analysis] Analyzing job description:", description.substring(0, 100) + "...");

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a job analysis expert. Analyze the job description and extract key information.
Your response must be a valid JSON string in the following format ONLY:
{
  "title": "Job title extracted from description",
  "company": "Company name if found, otherwise 'Not specified'",
  "location": "Job location if found, otherwise 'Not specified'",
  "positionLevel": "Senior, Mid-level, Junior, Entry-level, or Intern based on requirements",
  "keyRequirements": ["3-5 key requirements, each under 50 words"],
  "skillsAndTools": ["List of specific technologies, programming languages, software, tools required"],
  "metrics": {
    "keywords": <number between 0-100>,
    "skills": <number between 0-100>,
    "experience": <number between 0-100>,
    "overall": <number between 0-100>
  }
}
Do not include any explanations, just the JSON object.`
        },
        {
          role: "user",
          content: description
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0].message.content;
    console.log("[AI Analysis] Raw OpenAI response:", content);

    if (!content) {
      console.warn("[AI Analysis] No content in OpenAI response");
      return getDefaultAnalysis();
    }

    try {
      const parsed = JSON.parse(content);
      return {
        title: parsed.title || "Not specified",
        company: parsed.company || "Not specified",
        location: parsed.location || "Not specified",
        positionLevel: parsed.positionLevel || "Not specified",
        keyRequirements: parsed.keyRequirements || ["Unable to extract requirements"],
        skillsAndTools: parsed.skillsAndTools || ["No specific skills/tools found"],
        metrics: parsed.metrics || {
          keywords: 0,
          skills: 0,
          experience: 0,
          overall: 0
        }
      };
    } catch (parseError) {
      console.error("[AI Analysis] Error parsing OpenAI response:", parseError);
      return getDefaultAnalysis();
    }
  } catch (error) {
    console.error("[AI Analysis] Error during job description analysis:", error);
    return getDefaultAnalysis();
  }
}

function getDefaultAnalysis() {
  return {
    title: "Not specified",
    company: "Not specified",
    location: "Not specified",
    positionLevel: "Not specified",
    keyRequirements: ["Unable to extract requirements"],
    skillsAndTools: ["No specific skills/tools found"],
    metrics: {
      keywords: 0,
      skills: 0,
      experience: 0,
      overall: 0
    }
  };
}

async function createPDF(content: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        bufferPages: true,
        info: {
          Title: 'Generated Document',
          Author: 'Resume Optimizer',
          Subject: 'Resume/Cover Letter'
        }
      });

      const chunks: Buffer[] = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.font('Helvetica')
         .fontSize(11)
         .lineGap(2);

      const paragraphs = content.split('\n\n');
      let isFirstParagraph = true;

      paragraphs.forEach(paragraph => {
        if (!isFirstParagraph) {
          doc.moveDown(2);
        }

        const lines = paragraph.split('\n');
        lines.forEach((line, lineIndex) => {
          if (lineIndex > 0) {
            doc.moveDown(1);
          }
          doc.text(line.trim(), {
            align: 'left',
            lineGap: 2,
            width: doc.page.width - 100,
          });
        });

        isFirstParagraph = false;
      });

      doc.end();
    } catch (error) {
      console.error('PDF generation error:', error);
      reject(error);
    }
  });
}

function getInitials(text: string): string {
  const nameMatch = text.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/);
  if (!nameMatch) return "NA";

  return nameMatch[0]
    .split(/\s+/)
    .map(name => name[0])
    .join('')
    .toUpperCase();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  app.post("/api/resume/upload", upload.single("file"), async (req: MulterRequest, res) => {
    try {
      console.log("[Upload Route] Authentication status:", req.isAuthenticated());
      if (!req.isAuthenticated()) return res.sendStatus(401);

      console.log("[Upload Route] User:", req.user);
      if (!req.file) {
        console.log("[Upload Route] No file uploaded");
        return res.status(400).send("No file uploaded");
      }

      console.log("[Upload Route] File details:", {
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const content = await parseResume(req.file.buffer, req.file.mimetype);
      console.log("[Upload Route] Parsed content length:", content.length);

      const validatedData = insertUploadedResumeSchema.parse({
        content: content,
        metadata: {
          filename: req.file.originalname,
          fileType: req.file.mimetype,
          uploadedAt: new Date().toISOString()
        }
      });

      console.log("[Upload Route] Creating resume for user:", req.user!.id);
      const resume = await storage.createUploadedResume({
        ...validatedData,
        userId: req.user!.id
      });

      console.log("[Upload Route] Resume created:", resume.id);
      res.json(resume);
    } catch (error: any) {
      console.error("[Upload Route] Error:", error);
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
      let finalJobDescription: string;

      if (jobUrl) {
        try {
          const extractedDetails = await extractJobDetails(jobUrl);
          finalJobDescription = extractedDetails.description;
          const analysis = await analyzeJobDescription(finalJobDescription);
          jobDetails = {
            title: extractedDetails.title,
            company: extractedDetails.company,
            location: extractedDetails.location,
            salary: extractedDetails.salary,
            description: finalJobDescription,
            positionLevel: analysis.positionLevel,
            keyRequirements: analysis.keyRequirements,
            skillsAndTools: analysis.skillsAndTools
          };
        } catch (error: any) {
          console.error("[URL Extraction] Error:", error);
          return res.status(400).json({ error: error.message });
        }
      } else {
        console.log("[Manual Input] Processing manual job description");
        finalJobDescription = jobDescription;
        const analysis = await analyzeJobDescription(jobDescription);
        jobDetails = {
          title: analysis.title || "Manual Input",
          company: analysis.company || "Not specified",
          location: analysis.location || "Not specified",
          description: jobDescription,
          positionLevel: analysis.positionLevel,
          keyRequirements: analysis.keyRequirements,
          skillsAndTools: analysis.skillsAndTools
        };
      }

      // Calculate before optimization metrics
      console.log("[Metrics] Calculating pre-optimization scores");
      const beforeMetrics = await calculateMatchScores(uploadedResume.content, finalJobDescription);

      const optimized = await optimizeResume(uploadedResume.content, finalJobDescription);

      // Calculate after optimization metrics
      console.log("[Metrics] Calculating post-optimization scores");
      const afterMetrics = await calculateMatchScores(optimized.optimizedContent, finalJobDescription);

      const initials = getInitials(uploadedResume.content);
      const cleanJobTitle = jobDetails.title
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);

      const newFilename = `${initials}_${cleanJobTitle}.pdf`;

      const optimizedResume = await storage.createOptimizedResume({
        content: optimized.optimizedContent,
        originalContent: uploadedResume.content, // Ensure original content is set
        jobDescription: finalJobDescription,
        jobUrl: jobUrl || null,
        jobDetails,
        uploadedResumeId: uploadedResume.id,
        userId: req.user!.id,
        metadata: {
          filename: newFilename,
          optimizedAt: new Date().toISOString()
        },
        metrics: {
          before: beforeMetrics,
          after: afterMetrics
        }
      });

      res.json(optimizedResume);
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

      const filename = `cover_letter_${optimizedResume.metadata.filename}`;
      const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

      const coverLetter = await storage.createCoverLetter({
        content: generated.coverLetter,
        optimizedResumeId: optimizedResume.id,
        userId: req.user!.id,
        metadata: {
          filename: pdfFilename,
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

      const filename = coverLetter.metadata.filename.endsWith('.pdf')
        ? coverLetter.metadata.filename
        : `${coverLetter.metadata.filename}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
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


  app.get("/api/uploaded-resume/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const resume = await storage.getUploadedResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      const contentType = resume.metadata.fileType || 'application/octet-stream';
      const filename = resume.metadata.filename;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(resume.content);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimized-resume/:id/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const resume = await storage.getOptimizedResume(parseInt(req.params.id));
      if (!resume) return res.status(404).send("Resume not found");
      if (resume.userId !== req.user!.id) return res.sendStatus(403);

      const pdfBuffer = await createPDF(resume.content);
      const filename = resume.metadata.filename.endsWith('.pdf')
        ? resume.metadata.filename
        : `${resume.metadata.filename}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/optimized-resume/:id/cover-letter/download", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const optimizedResume = await storage.getOptimizedResume(parseInt(req.params.id));
      if (!optimizedResume) return res.status(404).send("Optimized resume not found");
      if (optimizedResume.userId !== req.user!.id) return res.sendStatus(403);

      const coverLetters = await storage.getCoverLettersByOptimizedResumeId(parseInt(req.params.id));
      if (!coverLetters.length) return res.status(404).send("Cover letter not found");

      const coverLetter = coverLetters[0];
      const pdfBuffer = await createPDF(coverLetter.content);

      const filename = coverLetter.metadata.filename.endsWith('.pdf')
        ? coverLetter.metadata.filename
        : `${coverLetter.metadata.filename}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Download error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/optimized-resume/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);

      const optimizedResume = await storage.getOptimizedResume(parseInt(req.params.id));
      if (!optimizedResume) return res.status(404).send("Resume not found");
      if (optimizedResume.userId !== req.user!.id) return res.sendStatus(403);

      const coverLetters = await storage.getCoverLettersByOptimizedResumeId(parseInt(req.params.id));
      for (const coverLetter of coverLetters) {
        await storage.deleteCoverLetter(coverLetter.id);
      }

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