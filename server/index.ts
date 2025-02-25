// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Add health check endpoint
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

log("Initializing server...");

// Create HTTP server
const server = registerRoutes(app);

// Set appropriate timeout values (all within 32-bit integer limit)
const MAX_32_BIT_INT = 2147483647;
const TIMEOUT_5_MINUTES = Math.min(5 * 60 * 1000, MAX_32_BIT_INT); // 300,000 ms
const TIMEOUT_1_MINUTE = Math.min(60 * 1000, MAX_32_BIT_INT); // 60,000 ms

// General request timeout
server.timeout = TIMEOUT_5_MINUTES;

// Keep-alive timeout (slightly above 60 seconds to handle proxies)
server.keepAliveTimeout = Math.min(TIMEOUT_1_MINUTE + 1000, MAX_32_BIT_INT);

// Headers timeout (slightly above keep-alive timeout)
server.headersTimeout = Math.min(TIMEOUT_1_MINUTE + 2000, MAX_32_BIT_INT);

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

// Get port from environment variable or use default
const port = Number(process.env.PORT) || 5000;

// Enhanced graceful shutdown with reasonable timeout
const gracefulShutdown = (signal: string) => {
    log(`Received ${signal} signal. Shutting down gracefully...`);
    server.close(() => {
        log('Server closed');
        process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
        log('Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server with enhanced error logging
log(`Attempting to start server on port ${port}...`);
server.listen(port, "0.0.0.0", () => {
    log(`Server successfully started on port ${port}`);
}).on('error', (err: NodeJS.ErrnoException) => {
    console.error('Failed to start server:', err);
    if (err.code === 'EADDRINUSE') {
        log(`Critical error: Port ${port} is already in use. Please ensure no other instance is running.`);
    }
    process.exit(1);
});