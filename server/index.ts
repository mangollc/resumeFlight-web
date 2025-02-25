// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

// Safe timeout calculation
function safeTimeout(ms: number): number {
    const MAX_32_BIT = 2147483647;
    return Math.min(ms, MAX_32_BIT);
}

// Timeout configurations
const timeouts = {
    request: safeTimeout(5 * 60 * 1000),      // 5 minutes
    keepAlive: safeTimeout(65 * 1000),        // 65 seconds
    headers: safeTimeout(66 * 1000),          // 66 seconds
    shutdown: safeTimeout(30 * 1000)          // 30 seconds
};

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Create server with safe timeout values
const server = app.listen(5000, '0.0.0.0', () => {
    console.log('Server successfully started on port 5000');
});

// Apply timeout configurations
server.timeout = timeouts.request;
server.keepAliveTimeout = timeouts.keepAlive;
server.headersTimeout = timeouts.headers;

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api")) {
            let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
            if (capturedJsonResponse) {
                logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
            }

            if (logLine.length > 80) {
                logLine = logLine.slice(0, 79) + "…";
            }

            log(logLine);
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

// Enhanced graceful shutdown
const gracefulShutdown = (signal: string) => {
    log(`Received ${signal} signal. Shutting down gracefully...`);
    server.close(() => {
        log('Server closed');
        process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
        log('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, timeouts.shutdown);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Log server startup
log(`Server starting on port 5000...`);