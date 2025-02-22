import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import {
    optimizeResume as originalOptimizeResume,
    generateCoverLetter,
    openai,
    analyzeResumeDifferences,
} from "./openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import PDFDocument from "pdfkit";
import { insertUploadedResumeSchema } from "@shared/schema";
import axios from "axios";
import * as cheerio from "cheerio";
import { v4 as uuidv4 } from 'uuid';

// Constants
const MAX_ALLOWED_TIMEOUT = 2147483647;
const DEFAULT_TIMEOUT = 30000;
const API_TIMEOUT = 300000; // Increased to 5 minutes
const PARSING_TIMEOUT = 60000; // Increased to 1 minute
const SAFE_TIMEOUT = 240000; // Increased to 4 minutes

const MAX_FILE_SIZE = 10 * 1024 * 1024; // Increased to 10MB
const SUPPORTED_MIME_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

interface JobDetails {
    title: string;
    company: string;
    salary?: string;
    location: string;
    description: string;
    positionLevel?: string;
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
    improvements?: string[];
    changes?: string[];
    matchScore?: number;
    _internalDetails?: any;
}

// Multer configuration
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(
                new Error(
                    "Unsupported file type. Please upload PDF or DOCX files only.",
                ),
            );
        }
    },
});

// Helper functions
function validateTimeout(
    value: number | undefined,
    defaultValue: number = DEFAULT_TIMEOUT,
): number {
    if (
        !value ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0
    ) {
        console.warn(
            `Invalid timeout value: ${value}, using default: ${defaultValue}`,
        );
        return defaultValue;
    }
    return Math.min(value, MAX_ALLOWED_TIMEOUT);
}

async function calculateMatchScores(
  resumeContent: string,
  jobDescription: string,
) {
  try {
    console.log("[Match Analysis] Starting analysis...");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a resume analysis expert. Compare the resume against the job description and calculate match scores based on likelihood of ATS selecting the resume.

Scoring Guidelines:
1. Keywords (0-100):
   - Measure presence and context of job-specific keywords
   - Consider keyword placement and relevance
   - Account for variations and synonyms
   - Weight industry-specific terms higher

2. Skills (0-100):
   - Evaluate technical and soft skills match
   - Consider skill level and recency
   - Look for practical applications
   - Check for required vs nice-to-have skills

3. Experience (0-100):
   - Assess relevance of past roles
   - Consider years of experience
   - Evaluate accomplishments
   - Check for industry alignment

4. Overall (0-100):
   - Calculate weighted average favoring most critical factors
   - Consider ATS optimization level
   - Account for presentation and clarity
   - Factor in quantifiable achievements

Return a JSON object in this exact format:
{
 "keywords": <number between 0-100>,
 "skills": <number between 0-100>,
 "experience": <number between 0-100>,
 "overall": <number between 0-100>,
 "analysis": {
   "strengths": ["list of strong matches"],
   "gaps": ["list of potential gaps"],
   "suggestions": ["improvement suggestions"]
 }
}`,
        },
        {
          role: "user",
          content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      console.warn("[Match Analysis] Empty response from OpenAI");
      return getDefaultMetrics();
    }

    const metrics = JSON.parse(content);
    return {
      keywords: Math.min(100, Math.max(0, Number(metrics.keywords) || 0)),
      skills: Math.min(100, Math.max(0, Number(metrics.skills) || 0)),
      experience: Math.min(100, Math.max(0, Number(metrics.experience) || 0)),
      overall: Math.min(100, Math.max(0, Number(metrics.overall) || 0)),
      analysis: metrics.analysis || {
        strengths: [],
        gaps: [],
        suggestions: []
      }
    };
  } catch (error) {
    console.error("[Match Analysis] Error calculating scores:", error);
    return getDefaultMetrics();
  }
}

async function extractJobDetails(url: string): Promise<JobDetails> {
    try {
        console.log("[Job Details] Fetching URL:", url);
        const response = await axios.get(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            },
        });
        const $ = cheerio.load(response.data);

        // LinkedIn selectors
        const linkedInSelectors = {
            title: ".top-card-layout__title, .job-details-jobs-unified-top-card__job-title",
            company:
                ".topcard__org-name-link, .job-details-jobs-unified-top-card__company-name",
            location:
                '.topcard__flavor:not(:contains("applicants")), .job-details-jobs-unified-top-card__bullet',
            description:
                ".description__text, .job-details-jobs-unified-top-card__job-description",
        };

        const title = $(linkedInSelectors.title).first().text().trim();
        const company = $(linkedInSelectors.company).first().text().trim();
        const location = $(linkedInSelectors.location)
            .first()
            .text()
            .trim()
            .replace(/\d+\s*applicants?/gi, "")
            .trim();
        const fullContent = $("main").text().trim();
        const description = $(linkedInSelectors.description).text().trim() || fullContent;

        if (!description) {
            throw new Error("Could not extract job description.");
        }

        // Use AI to extract comprehensive job information
        const model = "gpt-4-turbo-preview"; // Updated to use the correct model name

        const analysis = await openai.chat.completions.create({
            model: model,
            messages: [{
                role: "system",
                content: `Extract detailed job information from the LinkedIn posting. Return a JSON object with two sets of fields:

                1. Client-side display fields (clean, concise):
                {
                    "title": "exact job title, unchanged",
                    "company": "company name, unchanged",
                    "location": "job location with remote/hybrid/onsite tag",
                    "salary": "salary range if mentioned, otherwise 'Not specified'",
                    "positionLevel": "seniority level (Entry/Junior/Mid/Senior/Lead/Executive)",
                    "keyRequirements": ["key requirements in 2-3 word phrases"],
                    "skillsAndTools": ["required skills, max 2 words each"],
                }

                2. Internal AI processing fields (comprehensive):
                {
                    "_internal": {
                        "fullDescription": "complete job description",
                        "responsibilities": ["detailed list of all responsibilities"],
                        "requirements": ["detailed list of all requirements"],
                        "qualifications": ["detailed list of all qualifications"],
                        "benefits": ["detailed list of benefits if mentioned"],
                        "technicalSkills": ["detailed technical skills"],
                        "softSkills": ["detailed soft skills"],
                        "workplaceType": "detailed workplace arrangement",
                        "department": "department or team information",
                        "reportingStructure": "reporting relationships if mentioned",
                        "travelRequirements": "travel requirements if any",
                        "industries": ["relevant industry sectors"]
                    }
                }`
            }, {
                role: "user",
                content: `Title: ${title}\nCompany: ${company}\nLocation: ${location}\nContent: ${fullContent}`
            }],
            response_format: { type: "json_object" },
            temperature: 0.1
        });

        const enhancedDetails = JSON.parse(analysis.choices[0].message.content || "{}");
        console.log("[Job Details] Enhanced details:", {
            title: enhancedDetails.title,
            company: enhancedDetails.company,
            location: enhancedDetails.location,
            salary: enhancedDetails.salary,
            positionLevel: enhancedDetails.positionLevel,
            keyRequirements: enhancedDetails.keyRequirements,
            skillsAndTools: enhancedDetails.skillsAndTools
        });

        // Return client-visible details and store internal details for AI processing
        const cleanJobTitle = (enhancedDetails.title || "job")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, "_")
            .substring(0, 30);

        const skillsAndTools = (enhancedDetails.skillsAndTools || []).filter((skill: string) =>
            skill.split(' ').length <= 2
        );

        return {
            title: enhancedDetails.title || title || "Unknown Position",
            company: enhancedDetails.company || company || "Unknown Company",
            location: enhancedDetails.location || location || "Location Not Specified",
            description: enhancedDetails._internal?.fullDescription || description,
            salary: enhancedDetails.salary || "Not specified",
            positionLevel: enhancedDetails.positionLevel || "Not specified",
            keyRequirements: (enhancedDetails.keyRequirements || []).map(req =>
                req.length > 30 ? req.substring(0, 30) + '...' : req
            ),
            skillsAndTools: skillsAndTools,
            _internalDetails: enhancedDetails._internal || null
        };
    } catch (error: any) {
        console.error("[Job Details] Error:", error);
        throw new Error(`Failed to extract job details: ${error.message}`);
    }
}

async function analyzeJobDescription(description: string): Promise<JobDetails> {
    try {
        console.log("[Job Analysis] Analyzing description...");
        const model = "gpt-4-turbo-preview"; // Updated to use the correct model name
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `Analyze the job description and extract key information.
Return a JSON object in this format:
{
    "title": "Extracted job title",
    "company": "Company name if found",
    "location": "Job location if found",
    "positionLevel": "Senior/Mid/Junior/Entry based on requirements",
    "keyRequirements": ["Array of key requirements with condensed word choices"],
    "skillsAndTools": ["Array of required skills and tools with max two words per skills or tools"]
}`,
                },
                {
                    role: "user",
                    content: description,
                },
            ],
            response_format: { type: "json_object" },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error("Empty response from OpenAI");
        }

        const analysis = JSON.parse(content);
        return {
            ...analysis,
            description: description,
        };
    } catch (error) {
        console.error("[Job Analysis] Error:", error);
        throw new Error("Failed to analyze job description");
    }
}

// Resume optimization function
async function optimizeResume(
    content: string,
    jobDescription: string,
    version?: number,
): Promise<{ optimizedContent: string; changes: string[] }> {
    try {
        console.log("[Optimization] Starting resume optimization...");
        console.log("[Optimization] Version:", version);
        const result = await originalOptimizeResume(
            content,
            jobDescription,
            version,
        );
        if (!result || !result.optimizedContent) {
            throw new Error("Invalid optimization result");
        }
        return result;
    } catch (error: any) {
        console.error("[Optimization] Error:", error);
        throw new Error(`Failed to optimize resume: ${error.message}`);
    }
}

// Routes registration
// Route handlers
const handlers = {
  health: async (_req: Request, res: Response) => {
    try {
      const dbConnected = await checkDatabaseConnection();
      const status = dbConnected ? 200 : 503;
      const message = {
        status: dbConnected ? "healthy" : "unhealthy",
        database: dbConnected ? "connected" : "disconnected",
        timestamp: new Date().toISOString()
      };
      res.status(status).json(message);
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Health check failed",
        timestamp: new Date().toISOString()
      });
    }
  },

  getResumes: async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const resumes = await storage.getUploadedResumesByUser(req.user!.id);
      return res.status(200).json(resumes);
    } catch (error: any) {
      return res.status(500).json({
        error: "Failed to fetch resumes",
        details: error.message,
      });
    }
  }
};

export function registerRoutes(app: Express): Server {
    setupAuth(app);

    // Global middleware
    app.use((req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    // Get uploaded resumes route
    app.get("/api/uploaded-resumes", async (req, res) => {
        try {
            console.log("[Get Resumes] Checking authentication");
            if (!req.isAuthenticated()) {
                console.log("[Get Resumes] User not authenticated");
                return res.status(401).json({ error: "Unauthorized" });
            }

            console.log(
                "[Get Resumes] Fetching resumes for user:",
                req.user!.id,
            );
            const resumes = await storage.getUploadedResumesByUser(
                req.user!.id,
            );
            console.log("[Get Resumes] Found resumes:", resumes.length);

            return res.status(200).json(resumes);
        } catch (error: any) {
            console.error("[Get Resumes] Error:", error);
            return res.status(500).json({
                error: "Failed to fetch resumes",
                details: error.message,
            });
        }
    });

    // Get optimized resumes route
    app.get("/api/optimized-resumes", async (req, res) => {
        try {
            console.log("[Get Optimized] Checking authentication");
            if (!req.isAuthenticated()) {
                console.log("[Get Optimized] User not authenticated");
                return res.status(401).json({ error: "Unauthorized" });
            }

            console.log(
                "[Get Optimized] Fetching optimized resumes for user:",
                req.user!.id,
            );
            const resumes = await storage.getOptimizedResumesByUser(
                req.user!.id,
            );
            console.log(
                "[Get Optimized] Found optimized resumes:",
                resumes.length,
            );

            return res.status(200).json(resumes);
        } catch (error: any) {
            console.error("[Get Optimized] Error:", error);
            return res.status(500).json({
                error: "Failed to fetch optimized resumes",
                details: error.message,
            });
        }
    });

    // Get single optimized resume route
    app.get("/api/optimized-resume/:id", async (req, res) => {
        try {
            console.log("[Get Single Optimized] Checking authentication");
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const resumeId = parseInt(req.params.id);
            console.log("[Get Single Optimized] Fetching resume:", resumeId);

            const resume = await storage.getOptimizedResume(resumeId);
            if (!resume) {
                return res.status(404).json({ error: "Resume not found" });
            }

            if (resume.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            console.log("[Get Single Optimized] Found resume");
            return res.status(200).json(resume);
        } catch (error: any) {
            console.error("[Get Single Optimized] Error:", error);
            return res.status(500).json({
                error: "Failed to fetch optimized resume",
                details: error.message,
            });
        }
    });

    // Upload route
    app.post(
        "/api/resume/upload",
        upload.single("file"),
        async (req: MulterRequest, res) => {
            try {
                console.log("[Upload] Checking authentication");
                if (!req.isAuthenticated()) {
                    return res.status(401).json({ error: "Unauthorized" });
                }

                if (!req.file) {
                    return res.status(400).json({ error: "No file uploaded" });
                }

                console.log("[Upload] Processing file upload");
                const content = await parseResume(
                    req.file.buffer,
                    req.file.mimetype,
                );
                const validatedData = insertUploadedResumeSchema.parse({
                    content: content,
                    metadata: {
                        filename: req.file.originalname,
                        fileType: req.file.mimetype,
                        uploadedAt: new Date().toISOString(),
                    },
                });

                console.log("[Upload] Creating resume for user:", req.user!.id);
                const resume = await storage.createUploadedResume({
                    ...validatedData,
                    userId: req.user!.id,
                });

                console.log("[Upload] Resume created successfully");
                return res.status(201).json(resume);
            } catch (error: any) {
                console.error("[Upload] Error:", error);
                return res.status(400).json({
                    error: "Failed to upload resume",
                    details: error.message,
                });
            }
        },
    );

    // Delete uploaded resume route
    app.delete("/api/uploaded-resume/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                console.log("[Delete Uploaded] User not authenticated");
                return res.status(401).json({ error: "Unauthorized" });
            }

            const resumeId = parseInt(req.params.id);
            console.log(
                `[Delete Uploaded] Attempting to delete resume ${resumeId}`,
            );

            const resume = await storage.getUploadedResume(resumeId);
            if (!resume) {
                console.log(`[Delete Uploaded] Resume ${resumeId} not found`);
                return res.status(404).json({ error: "Resume not found" });
            }

            if (resume.userId !== req.user!.id) {
                console.log(
                    `[Delete Uploaded] Unauthorized: User ${req.user!.id} attempting to delete resume ${resumeId} owned by ${resume.userId}`,
                );
                return res.status(403).json({ error: "Unauthorized access" });
            }

            await storage.deleteUploadedResume(resumeId);
            console.log(
                `[Delete Uploaded] Successfully deleted resume ${resumeId}`,
            );
            return res
                .status(200)
                .json({ message: "Resume deleted successfully" });
        } catch (error: any) {
            console.error("[Delete Uploaded] Error:", error);
            return res.status(500).json({
                error: "Failed to delete resume",
                details: error.message,
            });
        }
    });

    // Delete optimized resume route
    app.delete("/api/optimized-resume/:id", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                console.log("[Delete Optimized] User not authenticated");
                return res.status(401).json({ error: "Unauthorized" });
            }

            const resumeId = parseInt(req.params.id);
            console.log(
                `[Delete Optimized] Attempting to delete optimized resume ${resumeId}`,
            );

            const resume = await storage.getOptimizedResume(resumeId);
            if (!resume) {
                console.log(`[Delete Optimized] Resume ${resumeId} not found`);
                return res.status(404).json({ error: "Resume not found" });
            }

            if (resume.userId !== req.user!.id) {
                console.log(
                    `[Delete Optimized] Unauthorized: User ${req.user!.id} attempting to delete resume ${resumeId} owned by ${resume.userId}`,
                );
                return res.status(403).json({ error: "Unauthorized access" });
            }

            await storage.deleteOptimizedResume(resumeId);
            console.log(
                `[Delete Optimized] Successfully deleted resume ${resumeId}`,
            );
            return res
                .status(200)
                .json({ message: "Resume deleted successfully" });
        } catch (error: any) {
            console.error("[Delete Optimized] Error:", error);
            return res.status(500).json({
                error: "Failed to delete resume",
                details: error.message,
            });
        }
    });

    //New routes for optimization sessions
    app.get("/api/optimization-sessions", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const sessions = await storage.getOptimizationSessionsByUser(req.user!.id);
            return res.status(200).json(sessions);
        } catch (error: any) {
            console.error("[Get Sessions] Error:", error);
            return res.status(500).json({
                error: "Failed to fetch optimization sessions",
                details: error.message,
            });
        }
    });

    app.get("/api/optimization-session/:sessionId", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const session = await storage.getOptimizationSession(req.params.sessionId);
            if (!session) {
                return res.status(404).json({ error: "Session not found" });
            }

            if (session.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            return res.status(200).json(session);
        } catch (error: any) {
            console.error("[Get Session] Error:", error);
            return res.status(500).json({
                error: "Failed to fetch optimization session",
                details: error.message,
            });
        }
    });


    // Update the optimize resume route
    app.get("/api/resume/:id/optimize", async (req: Request, res) => {
        // Increase timeout to 5 minutes for long-running optimizations
        req.setTimeout(300000);
        res.setTimeout(300000);

        // Enable keep-alive for longer connections
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Keep-Alive', 'timeout=300');
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('X-Accel-Buffering', 'no');

        const sendEvent = (data: any) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        try {
            console.log("[Optimize] Starting optimization request...");
            sendEvent({ status: "started" });

            if (!req.isAuthenticated()) {
                console.log("[Optimize] User not authenticated");
                sendEvent({ status: "error", message: "Unauthorized" });
                return res.end();
            }

            const { jobUrl, jobDescription } = req.query;
            if (!jobUrl && !jobDescription) {
                console.log("[Optimize] Missing job details");
                sendEvent({ status: "error", message: "Please provide either a job URL or description" });
                return res.end();
            }

            console.log("[Optimize] Fetching uploaded resume...");
            sendEvent({ status: "fetching_resume" });
            const uploadedResume = await storage.getUploadedResume(parseInt(req.params.id));
            if (!uploadedResume) {
                console.log("[Optimize] Resume not found");
                sendEvent({ status: "error", message: "Resume not found" });
                return res.end();
            }
            if (uploadedResume.userId !== req.user!.id) {
                console.log("[Optimize] Unauthorized access");
                sendEvent({ status: "error", message: "Unauthorized access" });
                return res.end();
            }

            let finalJobDescription: string;
            let jobDetails: JobDetails;

            try {
                if (jobUrl) {
                    console.log("[Optimize] Processing job URL:", jobUrl);
                    sendEvent({ status: "extracting_details" });
                    const extractedDetails = await extractJobDetails(jobUrl as string);
                    finalJobDescription = extractedDetails.description;
                    console.log("[Optimize] Job details extracted, analyzing description...");
                    sendEvent({ status: "analyzing_description" });
                    jobDetails = await analyzeJobDescription(finalJobDescription);
                    jobDetails = {
                        ...extractedDetails,
                        ...jobDetails,
                    };
                } else {
                    console.log("[Optimize] Processing manual job description");
                    finalJobDescription = jobDescription as string;
                    sendEvent({ status: "analyzing_description" });
                    jobDetails = await analyzeJobDescription(jobDescription as string);
                }

                console.log("[Optimize] Starting optimization process");
                sendEvent({ status: "optimizing_resume" });
                const optimized = await optimizeResume(
                    uploadedResume.content,
                    finalJobDescription,
                );

                if (!optimized || !optimized.optimizedContent) {
                    console.error("[Optimize] Failed to generate optimized content");
                    sendEvent({ status: "error", message: "Failed to generate optimized content" });
                    return res.end();
                }


                const initials = getInitials(uploadedResume.content);
                const cleanJobTitle = (jobDetails.title || "job")
                    .replace(/[^a-zA-Z0-9\s]/g, "")
                    .replace(/\s+/g, "_")
                    .substring(0, 30);

                const newFilename = `${initials}_${cleanJobTitle}.pdf`;

                console.log("[Optimize] Creating optimized resume record");
                const optimizedResume = await storage.createOptimizedResume({
                    sessionId: uuidv4(),
                    content: optimized.optimizedContent,
                    originalContent: uploadedResume.content,
                    jobDescription: finalJobDescription,
                    jobUrl: jobUrl as string || null,
                    jobDetails,
                    uploadedResumeId: uploadedResume.id,
                    userId: req.user!.id,
                    metadata: {
                        filename: newFilename,
                        optimizedAt: new Date().toISOString(),
                        version: 1.0,
                    }
                });

                console.log("[Optimize] Successfully completed optimization");
                sendEvent({
                    status: "completed",
                    optimizedResume: optimizedResume
                });
                return res.end();
            } catch (error) {
                console.error("[Optimize] Error during optimization process:", error);
                sendEvent({ status: "error", message: error instanceof Error ? error.message : "Optimization failed" });
                return res.end();
            }
        } catch (error) {
            console.error("[Optimize] Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to optimize resume";
            sendEvent({ status: "error", message: errorMessage });
            return res.end();
        }
    });

    // Update session state
    app.patch("/api/optimization-session/:sessionId", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const session = await storage.getOptimizationSession(req.params.sessionId);
            if (!session) {
                return res.status(404).json({ error: "Session not found" });
            }

            if (session.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            const updatedSession = await storage.updateOptimizationSession(
                req.params.sessionId,
                req.body
            );

            return res.status(200).json(updatedSession);
        } catch (error: any) {
            console.error("[Update Session] Error:", error);
            return res.status(500).json({
                error: "Failed to update optimization session",
                details: error.message,
            });
        }
    });

    app.get("/api/optimized-resume/:id/differences", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const optimizedResume = await storage.getOptimizedResume(
                parseInt(req.params.id),
            );
            if (!optimizedResume) {
                return res.status(404).json({ error: "Resume not found" });
            }

            if (optimizedResume.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            const differences = await analyzeResumeDifferences(
                optimizedResume.originalContent,
                optimizedResume.content,
            );

            return res.status(200).json(differences);
        } catch (error: any) {
            console.error("[Differences] Error:", error);
            return res.status(500).json({
                error: "Failed to analyze differences",
                details: error.message,
            });
        }
    });

    // Add the download route for optimized resumes
    app.get("/api/optimized-resume/:id/download", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const resumeId = parseInt(req.params.id);
            const resume = await storage.getOptimizedResume(resumeId);

            if (!resume) {
                return res.status(404).json({ error: "Resume not found" });
            }

            if (resume.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            // Create PDF document with error handling
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
            });

            // Set response headers
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${resume.metadata.filename || `resume-${Date.now()}.pdf`}`
            );

            // Handle potential stream errors
            doc.on('error', (err) => {
                console.error('PDF generation error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: "Failed to generate PDF",
                        details: "Internal server error during PDF generation"
                    });
                }
            });

            // Pipe the PDF document to the response with error handling
            const stream = doc.pipe(res);
            stream.on('error', (err) => {
                console.error('Stream error:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: "Failed to stream PDF",
                        details: "Error streaming PDF to client"
                    });
                }
            });

            // Add content to PDF with proper error handling
            try {
                doc.fontSize(16).font("Helvetica-Bold");
                const sections = resume.content.split("\n\n");
                sections.forEach((section, index) => {
                    if (index > 0) doc.moveDown();
                    doc.fontSize(index === 0 ? 16 : 12)
                        .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
                        .text(section.trim());
                });

                // Finalize the PDF
                doc.end();
            } catch (pdfError) {
                console.error('Error generating PDF content:', pdfError);
                if (!res.headersSent) {
                    res.status(500).json({
                        error: "Failed to generate PDF content",
                        details: "Error while writing PDF content"
                    });
                }
            }
        } catch (error) {
            console.error("[Download] Error:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: "Failed to generate PDF",
                    details: error instanceof Error ? error.message : "Unknown error",
                });
            }
        }
    });

    // Cover letter generation route (NEW)
    app.post("/api/optimized-resume/:id/cover-letter", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const resumeId = parseInt(req.params.id);
            const optimizedResume = await storage.getOptimizedResume(resumeId);

            if (!optimizedResume) {
                return res.status(404).json({ error: "Resume not found" });
            }

            if (optimizedResume.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            // Extract contact information
            console.log("[Cover Letter] Extracting contact information...");
            const contactInfo = await extractContactInfo(optimizedResume.content);

            console.log("[Cover Letter] Generating cover letter for resume:", resumeId);
            const coverLetter = await generateCoverLetter(
                optimizedResume.content,
                optimizedResume.jobDescription,
                contactInfo,
                req.body.version
            );

            // Store the cover letter in the database
            const storedCoverLetter = await storage.createCoverLetter({
                optimizedResumeId: optimizedResume.id,
                userId: req.user!.id,
                content: coverLetter.content,
                metadata: {
                    filename: optimizedResume.metadata.filename.replace(/\.[^/.]+$/, "") + "_cover_letter",
                    version: coverLetter.version,
                    generatedAt: new Date().toISOString()
                },
                highlights: coverLetter.highlights,
                confidence: coverLetter.confidence,
                version: coverLetter.version
            });

            return res.json(storedCoverLetter);
        } catch (error: any) {
            console.error("[Cover Letter] Error:", error);
            return res.status(500).json({
                error: "Failed to generate cover letter",
                details: error.message
            });
        }
    });

    // Add cover letter download route
    app.get("/api/cover-letter/:id/download", async (req, res) => {
        try {
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const coverLetter = await storage.getCoverLetter(
                parseInt(req.params.id),
            );
            if (!coverLetter) {
                return res
                    .status(404)
                    .json({ error: "Cover letter not found" });
            }

            if (coverLetter.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            // Create PDF document
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
            });

            // Set response headers
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${coverLetter.metadata.filename}`,
            );

            // Pipe the PDF document to the response
            doc.pipe(res);

            // Format and add content to PDF
            const sections = coverLetter.content.split("\n\n");
            sections.forEach((section, index) => {
                if (index > 0) doc.moveDown();
                doc.fontSize(index === 0 ? 16 : 12)
                    .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
                    .text(section.trim());
            });

            // Finalize the PDF
            doc.end();
        } catch (error) {
            console.error("[Cover Letter Download] Error:", error);
            res.status(500).json({
                error: "Failed to generate PDF",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    // Add new analyze endpoint
    app.post("/api/optimized-resume/:id/analyze", async (req, res) => {
        try {
            console.log("[Analyze] Starting analysis...");
            if (!req.isAuthenticated()) {
                return res.status(401).json({ error: "Unauthorized" });
            }

            const optimizedResume = await storage.getOptimizedResume(parseInt(req.params.id));
            if (!optimizedResume) {
                return res.status(404).json({ error: "Resume not found" });
            }

            if (optimizedResume.userId !== req.user!.id) {
                return res.status(403).json({ error: "Unauthorized access" });
            }

            console.log("[Analyze] Calculating match scores...");
            const originalScores = await calculateMatchScores(
                optimizedResume.originalContent,
                optimizedResume.jobDescription
            );

            const optimizedScores = await calculateMatchScores(
                optimizedResume.content,
                optimizedResume.jobDescription
            );

            const matchScore = await storage.createResumeMatchScore({
                optimizedResumeId: optimizedResume.id,
                userId: req.user!.id,
                originalScores,
                optimizedScores,
                analysis: {
                    strengths: optimizedScores.analysis.strengths,
                    gaps: optimizedScores.analysis.gaps,
                    suggestions: optimizedScores.analysis.suggestions
                },
                createdAt: new Date().toISOString()
            });

            return res.status(200).json({
                originalScores,
                optimizedScores,
                analysis: matchScore.analysis
            });
        } catch (error: any) {
            console.error("[Analyze] Error:", error);
            return res.status(500).json({
                error: "Failed to analyze resume",
                details: error.message
            });
        }
    });

    return createServer(app);
}

// Helper functions for file operations
async function parseResume(buffer: Buffer, mimetype: string): Promise<string> {
    const validatedTimeout = validateTimeout(PARSING_TIMEOUT, 10000);
    console.log(`[Parse Resume] Using timeout: ${validatedTimeout}ms`);

    try {
        if (mimetype === "application/pdf") {
            return new Promise((resolve, reject) => {
                const pdfParser = new PDFParser(null);
                const timeoutId = setTimeout(() => {
                    pdfParser.removeAllListeners();
                    reject(new Error("PDF parsing timed out"));
                }, validatedTimeout);

                pdfParser.on("pdfParser_dataReady", (pdfData) => {
                    clearTimeout(timeoutId);
                    resolve(
                        pdfData.Pages.map((page) =>
                            page.Texts.map((text) =>
                                decodeURIComponent(text.R[0].T),
                            ).join(" "),
                        ).join("\n"),
                    );
                });

                pdfParser.on("pdfParser_dataError", (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });

                pdfParser.parseBuffer(buffer);
            });
        } else if (
            mimetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ) {
            return new Promise(async (resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error("DOCX parsing timed out"));
                }, validatedTimeout);

                try {
                    const result = await mammoth.extractRawText({ buffer });
                    clearTimeout(timeoutId);
                    resolve(result.value);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });
        }
        throw new Error("Unsupported file type");
    } catch (error) {
        console.error("[Parse Resume] Error:", error);
        throw new Error(
            error instanceof Error
                ? error.message
                : "Failed to parse resume file",
        );
    }
}

function getDefaultMetrics() {
    return {
        keywords: 0,
        skills: 0,
        experience: 0,
        overall: 0,
    };
}

function getInitials(text: string): string {
    const nameMatch = text.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/);
    if (nameMatch) {
        return nameMatch[0]
            .split(/\s+/)
            .map((name) => name[0])
            .join("")
            .toUpperCase();
    }

    const firstParagraph = text.split("\n\n")[0];
    const anyNameMatch = firstParagraph.match(/[A-Z][a-z]+(\s+[A-Z][a-z]+)+/);
    if (anyNameMatch) {
        return anyNameMatch[0]
            .split(/\s+/)
            .map((name) => name[0])
            .join("")
            .toUpperCase();
    }

    return "RES";
}

// Add this helper function after existing helpers
async function extractContactInfo(resumeContent: string) {
    try {
        // Use OpenAI to extract contact information
        const model = "gpt-4-turbo-preview"; // Updated to use the correct model name
        const response = await openai.chat.completions.create({
            model: model,
            messages: [
                {
                    role: "system",
                    content: `Extract contact information from the resume. Return a JSON object with these fields:
{
    "fullName": "full name of the candidate",
    "email": "email address",
    "phone": "phone number",
    "address": "full address if available"
}
If any field is not found, set it to null.`
                },
                {
                    role: "user",
                    content: resumeContent
                }
            ],
            response_format: { type: "json_object" }
        });
        const content = response.choices[0].message.content;
        if (!content) throw new Error("Failed to parse contact information");

        const contactInfo = JSON.parse(content);
        if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone) {
            throw new Error("Missing required contact information");
        }
        return contactInfo;
    } catch (error) {
        console.error("[Contact Info] Extraction error:", error);
        throw new Error("Failed to extract contact information from resume");
    }
}