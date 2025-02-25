/**
 * Essential types for resume optimization platform
 */

import { Request } from "express";
import { Multer } from "multer";

// Request type with file upload support
export interface MulterRequest extends Request {
    file?: Multer.File;
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
}

// Job posting details
export interface JobDetails {
    title: string;
    company: string;
    location: string;
    description: string;
    requirements?: string[];
    skills?: string[];
    metrics?: JobMetrics;
}

// File metadata
export interface FileMetadata {
    filename: string;
    fileType: string;
    uploadedAt?: string;
    optimizedAt?: string;
}