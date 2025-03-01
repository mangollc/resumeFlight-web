/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { analysisRoutes } from "./analysis.routes";
import { optimizationRoutes } from "./optimization.routes";
import documentRoutes from "./document.routes";
import { setupAuth } from "../auth";
import { corsMiddleware } from "../utils/cors";

export function registerRoutes(app: Express): Server {
    // Set up authentication first
    setupAuth(app);

    // Apply CORS middleware globally
    app.use(corsMiddleware);

    // Strict JSON content-type enforcement for API routes
    app.use('/api', (req, res, next) => {
        res.setHeader('Content-Type', 'application/json');

        // Override send to ensure JSON
        const originalSend = res.send;
        res.send = function(body) {
            res.setHeader('Content-Type', 'application/json');
            if (typeof body === 'string' && (!body.startsWith('{') && !body.startsWith('['))) {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    body = { data: body };
                }
            }
            return originalSend.call(this, JSON.stringify(body));
        };

        next();
    });

    // Register API routes with proper prefixes
    app.use('/api', authRoutes);
    app.use('/api', resumeRoutes);
    app.use('/api', documentRoutes);
    app.use('/api', optimizationRoutes);
    app.use('/api/analysis', analysisRoutes);

    // Error handler specifically for API routes
    app.use('/api', (err: any, req: any, res: any, next: any) => {
        console.error('API Error:', err);
        res.status(err.status || 500).json({
            error: true,
            message: err.message || 'Internal Server Error'
        });
    });

    return createServer(app);
}

// Export types used by routes
export * from './types';