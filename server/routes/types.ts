/**
 * Essential types for resume optimization platform
 */

import { Request } from "express";
import { Express } from "multer";

// Request type with file upload support
export interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

// Job analysis metrics
export interface JobMetrics {
    keywords: number;
    skills: number;
    experience: number;
    education: number;
    personalization: number;
    aiReadiness: number;
    overall: number;
    analysis: {
        strengths: string[];
        gaps: string[];
        suggestions: string[];
    };
    confidence: number;
}

// Job posting details
export interface JobDetails {
    title: string;
    company: string;
    location: string;
    description: string;
    salary?: string;
    positionLevel?: string;
    keyRequirements?: string[];
    skillsAndTools?: string[];
    metrics?: JobMetrics;
}

// Resume version tracking
export interface ResumeVersion {
    version: string;
    content: string;
    timestamp: string;
    changes?: string[];
    metrics?: {
        before: JobMetrics;
        after: JobMetrics;
    };
}

// File metadata
export interface FileType {
    size: number;
    name: string;  
    type: string;
}