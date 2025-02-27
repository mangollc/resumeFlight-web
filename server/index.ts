// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";
import { setupAuth } from "./auth";

console.log('Starting server initialization...');

const app = express();

// Basic middleware setup
console.log('Setting up middleware...');
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

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

// Setup authentication
console.log('Setting up authentication...');
setupAuth(app);

// Health check endpoint
app.get("/api/health", async (_req, res) => {
    try {
        console.log('Checking database connection...');
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
const server = registerRoutes(app);

// Setup environment-specific middleware
let viteSetupPromise: Promise<void>;
if (process.env.NODE_ENV === "development") {
    console.log('Setting up development environment with Vite...');
    viteSetupPromise = setupVite(app, server);
} else {
    console.log('Setting up production environment...');
    serveStatic(app);
    viteSetupPromise = Promise.resolve();
}

const startServer = async (port: number): Promise<void> => {
    try {
        // Wait for Vite setup to complete before starting server
        console.log('Waiting for Vite setup to complete...');
        await viteSetupPromise;

        console.log(`Attempting to start server on port ${port}...`);
        await new Promise<void>((resolve, reject) => {
            const srv = server.listen(port, '0.0.0.0', () => {
                console.log(`Server successfully started on port ${port}`);
                resolve();
            });

            srv.once('error', (err: NodeJS.ErrnoException) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${port} is in use, trying ${port + 1}`);
                    srv.close();
                    startServer(port + 1).then(resolve).catch(reject);
                } else {
                    console.error('Server startup error:', err);
                    reject(err);
                }
            });

            // Add timeout for server startup
            setTimeout(() => {
                reject(new Error(`Server startup timed out after 10 seconds on port ${port}`));
            }, 10000);
        });
    } catch (err: any) {
        console.error('Server startup error:', err);
        throw err;
    }
};

console.log('Starting server on initial port 5000...');
startServer(5000).catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// Graceful shutdown handlers
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Attempting graceful shutdown...');
    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT. Attempting graceful shutdown...');
    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
        process.exit(0);
    });
});