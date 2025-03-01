/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { analysisRoutes } from "./analysis.routes";
import { optimizationRoutes } from "./optimization.routes";
import { setupAuth } from "../auth";
import { corsMiddleware } from "../utils/cors";
import { Router } from 'express'; // Added import for Router

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
    app.use('/api/analysis', analysisRoutes);

    //Added api route for optimized resumes (assuming this is what was intended)
    const apiRouter = Router();
    apiRouter.get('/optimized-resumes', (req, res) => {
        //Replace this with actual database query and JSON response
        res.json([{id:1, title: "Resume 1"}, {id:2, title: "Resume 2"}]);
    });
    app.use('/api', apiRouter);

    return createServer(app);
}

// Export types used by routes
export * from './types';