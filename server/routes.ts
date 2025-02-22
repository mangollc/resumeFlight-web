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

// Constants
const MAX_ALLOWED_TIMEOUT = 2147483647;
const DEFAULT_TIMEOUT = 30000;
const API_TIMEOUT = 60000; // Increased to 60 seconds
const PARSING_TIMEOUT = 30000; // Increased to 30 seconds
const SAFE_TIMEOUT = 45000; // Increased to 45 seconds

const MAX_FILE_SIZE = 5 * 1024 * 1024;
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
                    content: `You are a resume analysis expert. Compare the resume against the job description and calculate match scores based on likelyhood of ATS selecting the resume.
Return a JSON object in this exact format:
{
 "keywords": <number between 0-100>,
 "skills": <number between 0-100>,
 "experience": <number between 0-100>,
 "overall": <number between 0-100>
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
            experience: Math.min(
                100,
                Math.max(0, Number(metrics.experience) || 0),
            ),
            overall: Math.min(100, Math.max(0, Number(metrics.overall) || 0)),
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
        const description =
            $(linkedInSelectors.description).text().trim() ||
            $("main").text().trim();

        if (!description) {
            throw new Error(
                "Could not extract job description. The page might require authentication.",
            );
        }

        console.log("[Job Details] Successfully extracted details:", {
            title,
            company,
            location,
        });

        return {
            title: title || "Unknown Position",
            company: company || "Unknown Company",
            location: location || "Location Not Specified",
            description: description,
        };
    } catch (error: any) {
        console.error("[Job Details] Error:", error);
        throw new Error(`Failed to extract job details: ${error.message}`);
    }
}

async function analyzeJobDescription(description: string): Promise<JobDetails> {
    try {
        console.log("[Job Analysis] Analyzing description...");
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
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
) {
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
export function registerRoutes(app: Express): Server {
    setupAuth(app);

    // Add error handling middleware
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

    // Optimize resume route
    app.post("/api/resume/:id/optimize", async (req: Request, res) => {
        // Add timeout to the request
        req.setTimeout(60000);
        try {
            console.log("[Optimize] Starting optimization request...");
            if (!req.isAuthenticated()) {
                console.log("[Optimize] User not authenticated");
                return res.status(401).json({ error: "Unauthorized" });
            }

            const { jobUrl, jobDescription } = req.body;
            if (!jobUrl && !jobDescription) {
                console.log("[Optimize] Missing job details");
                return res.status(400).json({
                    error: "Please provide either a job URL or description",
                });
            }

            const uploadedResume = await storage.getUploadedResume(
                parseInt(req.params.id),
            );
            if (!uploadedResume) {
                console.log("[Optimize] Resume not found");
                return res.status(404).json({ error: "Resume not found" });
            }
            if (uploadedResume.userId !== req.user!.id) {
                console.log("[Optimize] Unauthorized access");
                return res.status(403).json({ error: "Unauthorized access" });
            }

            let finalJobDescription: string;
            let jobDetails: JobDetails;

            try {
                if (jobUrl) {
                    console.log("[Optimize] Processing job URL:", jobUrl);
                    const extractedDetails = await extractJobDetails(jobUrl);
                    finalJobDescription = extractedDetails.description;
                    jobDetails =
                        await analyzeJobDescription(finalJobDescription);
                    jobDetails = {
                        ...extractedDetails,
                        ...jobDetails,
                    };
                } else {
                    console.log("[Optimize] Processing manual job description");
                    finalJobDescription = jobDescription;
                    jobDetails = await analyzeJobDescription(jobDescription);
                }

                console.log("[Optimize] Starting optimization process");
                const optimized = await optimizeResume(
                    uploadedResume.content,
                    finalJobDescription,
                );

                if (!optimized || !optimized.optimizedContent) {
                    throw new Error("Failed to generate optimized content");
                }

                console.log("[Optimize] Calculating match scores...");
                const beforeMetrics = await calculateMatchScores(
                    uploadedResume.content,
                    finalJobDescription,
                );
                const afterMetrics = await calculateMatchScores(
                    optimized.optimizedContent,
                    finalJobDescription,
                );

                const initials = getInitials(uploadedResume.content);
                const cleanJobTitle = (jobDetails.title || "job")
                    .replace(/[^a-zA-Z0-9\s]/g, "")
                    .replace(/\s+/g, "_")
                    .substring(0, 30);

                const newFilename = `${initials}_${cleanJobTitle}.pdf`;

                console.log("[Optimize] Saving optimized resume");
                const optimizedResume = await storage.createOptimizedResume({
                    content: optimized.optimizedContent,
                    originalContent: uploadedResume.content,
                    jobDescription: finalJobDescription,
                    jobUrl: jobUrl || null,
                    jobDetails,
                    uploadedResumeId: uploadedResume.id,
                    userId: req.user!.id,
                    metadata: {
                        filename: newFilename,
                        optimizedAt: new Date().toISOString(),
                        version: 1.0,
                    },
                    metrics: {
                        before: beforeMetrics,
                        after: afterMetrics,
                    },
                });

                console.log("[Optimize] Successfully completed optimization");
                return res.status(200).json(optimizedResume);
            } catch (error) {
                console.error(
                    "[Optimize] Error during optimization process:",
                    error,
                );
                throw new Error(`Optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } catch (error) {
            console.error("[Optimize] Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Failed to optimize resume";
            return res.status(500).json({
                error: errorMessage,
                details: error instanceof Error ? error.message : "Unknown error",
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

            // Create PDF document
            const doc = new PDFDocument({
                size: "A4",
                margin: 50,
            });

            // Set response headers
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename=${resume.metadata.filename || `resume-${Date.now()}.pdf`}`,
            );

            // Pipe the PDF document to the response
            doc.pipe(res);

            // Add content to PDF
            doc.fontSize(16).font("Helvetica-Bold");

            // Format the content properly with sections
            const sections = resume.content.split("\n\n");
            sections.forEach((section, index) => {
                if (index > 0) doc.moveDown();
                doc.fontSize(index === 0 ? 16 : 12)
                    .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
                    .text(section.trim());
            });

            // Finalize the PDF
            doc.end();
        } catch (error) {
            console.error("[Download] Error:", error);
            res.status(500).json({
                error: "Failed to generate PDF",
                details:
                    error instanceof Error ? error.message : "Unknown error",
            });
        }
    });

    // Cover letter generation route
    app.post("/api/optimized-resume/:id/cover-letter", async (req, res) => {
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

            console.log(
                "[Cover Letter] Generating cover letter for resume:",
                req.params.id,
            );

            // Extract contact info from the first section of the resume
            const firstSection = optimizedResume.content.split('\n\n')[0];

            // More robust name matching
            const nameMatch = firstSection.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m) || 
                            optimizedResume.content.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/m);

            // More robust email matching
            const emailMatch = firstSection.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i) ||
                             optimizedResume.content.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);

            // More robust phone matching
            const phoneMatch = firstSection.match(/(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) ||
                             optimizedResume.content.match(/(\+?\d{1,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

            // More robust address matching
            const addressMatch = firstSection.match(/(\d+[^@\n]+(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Ln|Rd|Blvd|Dr|St)\.?(?:[^@\n]+)?(?:\s+[^@\n]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)?)/i) ||
                               optimizedResume.content.match(/(\d+[^@\n]+(?:Avenue|Lane|Road|Boulevard|Drive|Street|Ave|Ln|Rd|Blvd|Dr|St)\.?(?:[^@\n]+)?(?:\s+[^@\n]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)?)/i);

            const contactInfo = {
                fullName: nameMatch ? nameMatch[1].trim() : '',
                email: emailMatch ? emailMatch[1].trim() : '',
                phone: phoneMatch ? phoneMatch[0].trim() : '',
                address: addressMatch ? addressMatch[1].trim() : ''
            };

            if (!contactInfo.fullName || !contactInfo.email || !contactInfo.phone) {
                throw new Error("Unable to extract complete contact information (name, email, and phone) from resume");
            }

            const coverLetterResult = await generateCoverLetter(
                optimizedResume.content,
                optimizedResume.jobDescription,
                contactInfo
            );

            const coverLetter = await storage.createCoverLetter({
                content: coverLetterResult.coverLetter,
                optimizedResumeId: optimizedResume.id,
                userId: req.user!.id,
                metadata: {
                    filename: optimizedResume.metadata.filename.replace(
                        ".pdf",
                        "_cover.pdf",
                    ),
                    generatedAt: new Date().toISOString(),
                    version: 1.0,
                },
            });

            return res.status(200).json({
                ...coverLetter,
                highlights: coverLetterResult.highlights,
                confidence: coverLetterResult.confidence,
            });
        } catch (error: any) {
            console.error("[Cover Letter] Error:", error);
            return res.status(500).json({
                error: "Failed to generate cover letter",
                details: error.message,
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