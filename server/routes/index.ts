/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumesRoutes } from "./resumes.routes";
import { analysisRoutes } from "./analysis.routes";
import { setupAuth } from "../auth";

export function registerRoutes(app: Express): Server {
    // Set up authentication
    setupAuth(app);

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

    // Register route modules
    app.use('/api/auth', authRoutes);
    app.use('/api/resumes', resumesRoutes);
    app.use('/api/analysis', analysisRoutes);

    return createServer(app);
}

// Export types used by routes
export * from './types';