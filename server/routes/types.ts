/**
 * @file types.ts
 * Shared types and interfaces for the routes
 */

import { Request } from "express";
import { Express } from "multer";

export interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

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

export interface JobDetails {
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
    metrics?: JobMetrics;
    improvements?: string[];
    changes?: string[];
    matchScore?: number;
    _internalDetails?: Record<string, any>;
}

export interface ResumeVersion {
    version: string;
    content: string;
    timestamp: string;
    changes?: string[];
    metrics?: {
        before: JobMetrics;
        after: JobMetrics;
    };
    confidence?: number;
}

export interface FileType {
    size: number;
    name: string;  
    type: string;
}

export type ProgressStep = {
    id: string;
    label: string;
    status: "pending" | "loading" | "completed" | "error";
};
