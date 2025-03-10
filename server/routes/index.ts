/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { analysisRoutes } from "./analysis.routes";
import { optimizationRoutes } from "./optimization.routes";
import { jobDetailsRouter } from "./job-details";
import { setupAuth } from "../auth";
import { corsMiddleware } from "../utils/cors";

export function registerRoutes(app: Express): Server {
    // Set up authentication
    setupAuth(app);

    // Apply CORS middleware globally
    app.use(corsMiddleware);

    // Global middleware
    app.use((req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    // Health check endpoint
    app.get("/api/health", (_req, res) => {
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString()
        });
    });

    // Register route modules with proper prefixes
    app.use('/api', authRoutes);
    app.use('/api', resumeRoutes);  // This handles /api/resume routes including optimized
    app.use('/api', optimizationRoutes);
    app.use('/api', jobDetailsRouter); // Added job details router
    app.use('/api/analysis', analysisRoutes);

    return createServer(app);
}

// Export types used by routes
export * from './types';