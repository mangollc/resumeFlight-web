// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

const app = express();

// Basic middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Safe timeout values (30 seconds)
const SAFE_TIMEOUT = 30000;
const server = app.listen(5000, '0.0.0.0', () => {
    log('Server successfully started on port 5000');
});
server.setTimeout(Math.min(120000, MAX_TIMEOUT));
server.keepAliveTimeout = Math.min(60000, MAX_TIMEOUT);

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});

// Health check endpoint
app.get("/health", async (_req, res) => {
    try {
        const dbConnected = await checkDatabaseConnection();
        if (dbConnected) {
            res.status(200).json({
                status: "healthy",
                database: "connected",
                timestamp: new Date().toISOString()
            });
        } else {
            res.status(503).json({
                status: "unhealthy",
                database: "disconnected",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Health check failed",
            timestamp: new Date().toISOString()
        });
    }
});

// Register routes
registerRoutes(app);

// Enhanced error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[Error] ${status} - ${message}`, err.stack);

    const responseMessage = process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : message;

    res.status(status).json({
        error: true,
        message: responseMessage,
        ...(process.env.NODE_ENV !== "production" && { stack: err.stack })
    });
});

// Setup environment-specific middleware
if (process.env.NODE_ENV === "development") {
    log("Setting up development environment with Vite...");
    setupVite(app, server).catch(err => {
        console.error('Failed to setup Vite:', err);
        process.exit(1);
    });
} else {
    log("Setting up production environment...");
    serveStatic(app);
}

// Simple graceful shutdown
process.on('SIGTERM', () => {
    log('Received SIGTERM. Shutting down...');
    server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
    log('Received SIGINT. Shutting down...');
    server.close(() => process.exit(0));
});