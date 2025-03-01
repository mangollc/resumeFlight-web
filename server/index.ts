// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

// Global error handlers
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', typeof reason === 'object' ? (reason as Error).message : reason);
    process.exit(1);
});

// Only log startup in development
if (process.env.NODE_ENV === 'development') {
    console.log('Starting server initialization...');
}

const app = express();

// Basic middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Import enhanced logger
import { requestLogger } from './utils/logger';

// Request logging middleware with enhanced details
app.use(requestLogger);

// Add CSP headers
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' * https://*.replit.dev https://*.repl.co;"
    );
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
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

// Register routes
const server = registerRoutes(app);

// Enhanced error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
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
    setupVite(app, server).catch(err => {
        console.error('Failed to setup Vite:', err.message);
        process.exit(1);
    });
} else {
    serveStatic(app);
}

const port = process.env.PORT || 5000;
const startServer = async (port: number) => {
  try {
    await new Promise((resolve, reject) => {
      const srv = server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        resolve(srv);
      });
      srv.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.log(`Port ${port} in use, trying ${port + 1}`);
          srv.close();
          startServer(port + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  } catch (err: any) {
    console.error('Server error:', err.message);
    // Wait 3 seconds and try to restart
    setTimeout(() => {
      startServer(port).catch(restartErr => {
        console.error('Failed to restart server');
        process.exit(1);
      });
    }, 3000);
  }
};

startServer(5000).catch(err => {
  log('Failed to start server:', err);
  // Wait 3 seconds and try to restart instead of exiting
  log('Attempting to restart server in 3 seconds...');
  setTimeout(() => {
    startServer(5000).catch(restartErr => {
      log('Failed to restart server after retry:', restartErr);
      process.exit(1);
    });
  }, 3000);
});

// Handle shutdown signals
['SIGTERM', 'SIGINT'].forEach(signal => {
    process.on(signal, () => {
        console.log(`Shutting down due to ${signal}`);
        server.close((err) => {
            if (err) {
                console.error('Error during shutdown');
                process.exit(1);
            }
            process.exit(0);
        });

        // Force shutdown after timeout
        setTimeout(() => {
            process.exit(1);
        }, 5000);
    });
});