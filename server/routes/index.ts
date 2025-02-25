/**
 * @file index.ts
 * Main router configuration that combines all route modules
 * 
 * This file:
 * 1. Sets up global middleware (auth, logging, etc.)
 * 2. Registers route modules (auth, resume, optimization)
 * 3. Configures error handling
 * 4. Provides health check endpoint
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { optimizationRoutes } from "./optimization.routes";
import { setupAuth } from "../auth";

async function checkDatabaseConnection() {
    try {
        // Add db connection check here
        return true;
    } catch (error) {
        console.error('Database connection check failed:', error);
        return false;
    }
}

// Request logging middleware
function requestLogger(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
}

export function registerRoutes(app: Express): Server {
    // Set up authentication
    setupAuth(app);

    // Global middleware
    app.use(requestLogger);
    app.use((req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    // Health check route
    app.get("/api/health", async (_req, res) => {
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
    });

    // Register route modules
    app.use('/api/auth', authRoutes);
    app.use('/api', resumeRoutes);
    app.use('/api', optimizationRoutes);

    // Error handling middleware
    app.use((err: Error, req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
        console.error('Unhandled error:', err);
        res.status(500).json({
            error: "Internal server error",
            message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
        });
    });

    return createServer(app);
}

export * from './types';