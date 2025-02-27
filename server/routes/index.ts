/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { analysisRoutes } from "./analysis.routes";
import { optimizationRoutes } from "./optimization.routes";
import optimizedResumeRoutes from "./optimized-resumes.routes";

export function registerRoutes(app: Express): Server {
    // Global middleware
    app.use((req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    // Register route modules with proper prefixes
    app.use('/api/auth', authRoutes);
    app.use('/api/resumes', resumeRoutes);
    app.use('/api/optimization', optimizationRoutes);
    app.use('/api/analysis', analysisRoutes);
    app.use('/api/optimized-resumes', optimizedResumeRoutes);

    return createServer(app);
}

// Export types used by routes
export * from './types';