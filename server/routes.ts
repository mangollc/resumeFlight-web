import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import { optimizeResume as originalOptimizeResume, generateCoverLetter, openai, analyzeResumeDifferences } from "./openai";
import mammoth from "mammoth";
import PDFParser from "pdf2json";
import PDFDocument from "pdfkit";
import { insertUploadedResumeSchema } from "@shared/schema";
import axios from "axios";
import * as cheerio from "cheerio";

// Validation and timeout constants
const MAX_ALLOWED_TIMEOUT = 2147483647;
const DEFAULT_TIMEOUT = 30000;
const API_TIMEOUT = 15000;
const PARSING_TIMEOUT = 10000;
const SAFE_TIMEOUT = 20000;

// File upload configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
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
}

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_req, file, cb) => {
        if (SUPPORTED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Unsupported file type. Please upload PDF or DOCX files only.'));
        }
    }
});

// Helper functions
function validateTimeout(value: number | undefined, defaultValue: number = DEFAULT_TIMEOUT): number {
    if (!value || typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        console.warn(`Invalid timeout value: ${value}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return Math.min(value, MAX_ALLOWED_TIMEOUT);
}

async function calculateMatchScores(resumeContent: string, jobDescription: string) {
    try {
        console.log("[Match Analysis] Starting analysis...");
        const operationTimeout = validateTimeout(SAFE_TIMEOUT, 20000);
        console.log(`[Match Analysis] Using timeout: ${operationTimeout}ms`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o",  
            messages: [
                {
                    role: "system",
                    content: `You are a resume analysis expert. Compare the resume against the job description and calculate match scores.
Return a JSON object in this exact format:
{
 "keywords": <number between 0-100>,
 "skills": <number between 0-100>,
 "experience": <number between 0-100>,
 "overall": <number between 0-100>
}`
                },
                {
                    role: "user",
                    content: `Resume Content:\n${resumeContent}\n\nJob Description:\n${jobDescription}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3
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
            overall: Math.min(100, Math.max(0, Number(metrics.overall) || 0))
        };
    } catch (error) {
        console.error("[Match Analysis] Error calculating scores:", error);
        return getDefaultMetrics();
    }
}

// Resume optimization function
export async function optimizeResume(content: string, jobDescription: string, version?: number) {
    try {
        console.log("[Optimization] Starting resume optimization...");
        console.log("[Optimization] Version:", version);
        const result = await originalOptimizeResume(content, jobDescription, version);
        console.log("[Optimization] Successfully optimized resume");
        console.log("[Optimization] Match score:", result.matchScore);
        return result;
    } catch (error: any) {
        console.error("[Optimization] Error:", error);
        throw new Error(`Failed to optimize resume: ${error.message}`);
    }
}

// Routes registration
export function registerRoutes(app: Express): Server {
    setupAuth(app);

    // Add error handling middleware
    app.use((req, res, next) => {
        res.setHeader('Content-Type', 'application/json');
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

            console.log("[Get Resumes] Fetching resumes for user:", req.user!.id);
            const resumes = await storage.getUploadedResumesByUser(req.user!.id);
            console.log("[Get Resumes] Found resumes:", resumes.length);

            return res.status(200).json(resumes);
        } catch (error: any) {
            console.error("[Get Resumes] Error:", error);
            return res.status(500).json({ 
                error: "Failed to fetch resumes",
                details: error.message 
            });
        }
    });

    // Upload route
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
            console.error("[Upload Route] Error:", error);
            res.status(400).json({ error: error.message });
        }
    });

    // Optimization route
    app.post("/api/resume/:id/optimize", async (req: Request, res) => {
        let timeoutId: NodeJS.Timeout | null = null;
        const controller = new AbortController();

        try {
            if (!req.isAuthenticated()) {
                return res.sendStatus(401);
            }

            const { jobUrl, jobDescription, version } = req.body;
            if (!jobUrl && !jobDescription) {
                return res.status(400).json({ error: "Please provide either a job URL or description" });
            }

            const uploadedResume = await storage.getUploadedResume(parseInt(req.params.id));
            if (!uploadedResume) {
                return res.status(404).json({ error: "Resume not found" });
            }
            if (uploadedResume.userId !== req.user!.id) {
                return res.sendStatus(403);
            }

            let finalJobDescription: string;
            let jobDetails: JobDetails;
            let existingOptimization = null;
            let nextVersion = version || 1.0;

            try {
                console.log("[Optimization] Starting optimization process...");
                console.log("[Optimization] Version:", nextVersion);

                // Find existing optimization if this is a reoptimization request
                if (version) {
                    console.log("[Optimization] Looking for existing optimization");
                    const optimizations = await storage.getOptimizedResumesByUser(req.user!.id);
                    existingOptimization = optimizations.find(opt => 
                        opt.uploadedResumeId === uploadedResume.id &&
                        (opt.jobUrl === jobUrl || opt.jobDescription === jobDescription)
                    );

                    if (existingOptimization) {
                        console.log("[Optimization] Found existing optimization:", existingOptimization.id);
                        nextVersion = Math.round((existingOptimization.metadata.version + 0.1) * 10) / 10;
                        console.log("[Optimization] Next version will be:", nextVersion);
                    }
                }

                // Handle job details
                if (jobUrl) {
                    console.log("[Optimization] Processing job URL:", jobUrl);
                    if (existingOptimization?.jobDetails) {
                        console.log("[Optimization] Using existing job details");
                        jobDetails = existingOptimization.jobDetails;
                        finalJobDescription = existingOptimization.jobDescription;
                    } else {
                        console.log("[Optimization] Extracting new job details from URL");
                        const extractedDetails = await extractJobDetails(jobUrl);
                        finalJobDescription = extractedDetails.description;
                        const analysis = await analyzeJobDescription(finalJobDescription);
                        jobDetails = {
                            ...extractedDetails,
                            ...analysis
                        };
                    }
                } else {
                    console.log("[Optimization] Processing manual job description");
                    finalJobDescription = jobDescription;
                    const analysis = await analyzeJobDescription(jobDescription);
                    jobDetails = {
                        ...analysis,
                        description: jobDescription
                    };
                }

                console.log("[Optimization] Starting optimization with details:", {
                    resumeId: uploadedResume.id,
                    version: nextVersion,
                    hasJobDetails: !!jobDetails
                });

                const optimized = await optimizeResume(uploadedResume.content, finalJobDescription, nextVersion);
                const beforeMetrics = await calculateMatchScores(uploadedResume.content, finalJobDescription);
                const afterMetrics = await calculateMatchScores(optimized.optimizedContent, finalJobDescription);

                const initials = getInitials(uploadedResume.content);
                const cleanJobTitle = (jobDetails.title || 'job')
                    .replace(/[^a-zA-Z0-9\s]/g, '')
                    .replace(/\s+/g, '_')
                    .substring(0, 30);

                const versionStr = `_v${nextVersion.toFixed(1)}`;
                const newFilename = `${initials}_${cleanJobTitle}${versionStr}.pdf`;

                console.log("[Optimization] Saving optimized resume");
                const optimizedResume = await storage.createOptimizedResume({
                    content: optimized.optimizedContent,
                    originalContent: uploadedResume.content,
                    jobDescription: finalJobDescription,
                    jobUrl: jobUrl || null,
                    jobDetails: {
                        ...jobDetails,
                        improvements: optimized.improvements,
                        changes: optimized.changes,
                        matchScore: optimized.matchScore
                    },
                    uploadedResumeId: uploadedResume.id,
                    userId: req.user!.id,
                    metadata: {
                        filename: newFilename,
                        optimizedAt: new Date().toISOString(),
                        version: nextVersion
                    },
                    metrics: {
                        before: beforeMetrics,
                        after: afterMetrics
                    }
                });

                if (timeoutId) clearTimeout(timeoutId);
                console.log("[Optimization] Successfully completed optimization");
                res.json(optimizedResume);
            } catch (error: any) {
                console.error("[Optimization] Error during optimization:", error);
                throw error;
            }
        } catch (error: any) {
            if (timeoutId) clearTimeout(timeoutId);
            console.error("[Optimization] Error:", error);

            if (controller.signal.aborted) {
                console.log("[Optimization] Request aborted");
                return res.status(408).json({ error: "Request timed out" });
            }

            const errorMessage = error.message || "Failed to optimize resume";
            res.status(500).json({ error: errorMessage });
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
                    reject(new Error('PDF parsing timed out'));
                }, validatedTimeout);

                pdfParser.on("pdfParser_dataReady", (pdfData) => {
                    clearTimeout(timeoutId);
                    resolve(pdfData.Pages.map(page =>
                        page.Texts.map(text => decodeURIComponent(text.R[0].T)).join(" ")
                    ).join("\n"));
                });

                pdfParser.on("pdfParser_dataError", (error) => {
                    clearTimeout(timeoutId);
                    reject(error);
                });

                pdfParser.parseBuffer(buffer);
            });
        } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
            return new Promise(async (resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('DOCX parsing timed out'));
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
        throw new Error(error instanceof Error ? error.message : "Failed to parse resume file");
    }
}

// Utility functions
function getDefaultMetrics() {
    return {
        keywords: 0,
        skills: 0,
        experience: 0,
        overall: 0
    };
}

function getInitials(text: string): string {
    const nameMatch = text.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)+/);
    if (nameMatch) {
        return nameMatch[0]
            .split(/\s+/)
            .map(name => name[0])
            .join('')
            .toUpperCase();
    }

    const firstParagraph = text.split('\n\n')[0];
    const anyNameMatch = firstParagraph.match(/[A-Z][a-z]+(\s+[A-Z][a-z]+)+/);
    if (anyNameMatch) {
        return anyNameMatch[0]
            .split(/\s+/)
            .map(name => name[0])
            .join('')
            .toUpperCase();
    }

    return "RES";
}

async function extractJobDetails(url: string): Promise<JobDetails> {
    try {
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        //Implementation to extract job details from the webpage using cheerio
        //This is a placeholder and needs to be implemented based on the specific website structure.
        return { title: "", company: "", location: "", description: "" };
    } catch (error) {
        console.error("Error extracting job details:", error);
        throw new Error("Failed to extract job details from URL");
    }
}

async function analyzeJobDescription(description: string): Promise<Partial<JobDetails>> {
    try {
        //Implementation to analyze the job description using OpenAI or other methods
        //This is a placeholder and needs to be implemented.
        return {};
    } catch (error) {
        console.error("Error analyzing job description:", error);
        throw new Error("Failed to analyze job description");
    }
}