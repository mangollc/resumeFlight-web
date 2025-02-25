// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { storage } from "./storage";
import rateLimit from "express-rate-limit";

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    console.error(error.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    process.exit(1);
});

console.log('Starting server initialization...');

const app = express();

// Basic middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Security middleware
const ONE_HOUR = 3600000;
const TWELVE_HOURS = ONE_HOUR * 12;

// Session configuration
app.use(session({
    store: storage.sessionStore,
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    name: 'sessionId', // Change from default 'connect.sid'
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiration on every response
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Only send cookies over HTTPS in production
        httpOnly: true, // Prevent client-side access to the cookie
        sameSite: 'strict', // CSRF protection
        maxAge: TWELVE_HOURS, // 12 hours
    },
    proxy: true // Trust the reverse proxy
}));

// Rate limiting for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply rate limiting to auth routes
app.use('/api/auth', authLimiter);

// Security headers middleware
app.use((req, res, next) => {
    // HSTS (force HTTPS)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');

    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob:; " +
        "connect-src 'self'; " +
        "font-src 'self'; " +
        "object-src 'none'; " +
        "media-src 'self'; " +
        "frame-src 'self';"
    );

    next();
});

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
app.get("/api/health", async (_req, res) => {
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
        console.error('Health check error:', error);
        res.status(500).json({
            status: "error",
            message: "Health check failed",
            timestamp: new Date().toISOString()
        });
    }
});

console.log('Registering routes...');
// Register routes
const server = registerRoutes(app);

// Enhanced error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Ensure we're sending JSON for API routes
    if (req.path.startsWith('/api')) {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        const errorId = Math.random().toString(36).substring(7);

        console.error(`[Error ${errorId}] ${status} - ${message} - ${req.method} ${req.path}`, {
            error: err,
            stack: err.stack,
            body: req.body,
            query: req.query,
            user: req.user?.id
        });

        res.status(status).json({
            error: true,
            message: process.env.NODE_ENV === "production" 
                ? `An unexpected error occurred (ID: ${errorId})`
                : message,
            errorId,
            ...(process.env.NODE_ENV !== "production" && {
                stack: err.stack,
                details: err.details || err.response?.data
            })
        });
    }
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

server.listen(5000, '0.0.0.0', () => {
    log('Server successfully started on port 5000');
});