// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

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

// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;

    res.on("finish", () => {
        const duration = Date.now() - start;
        if (path.startsWith("/api") && !path.includes("/resume/")) {
            log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
        }
    });
    next();
});

// Add CSP headers
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:;"
    );
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

const port = process.env.PORT || 5000;
const startServer = async (port: number) => {
  try {
    await new Promise((resolve, reject) => {
      const srv = server.listen(port, '0.0.0.0', () => {
        log(`Server successfully started on port ${port}`);
        resolve(srv);
      });
      srv.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          log(`Port ${port} is in use, trying ${port + 1}`);
          srv.close();
          startServer(port + 1).then(resolve).catch(reject);
        } else {
          reject(err);
        }
      });
    });
  } catch (err: any) {
    log('Server error:', err);
    // Wait 3 seconds and try to restart instead of throwing
    log('Attempting to restart server in 3 seconds...');
    setTimeout(() => {
      startServer(port).catch(restartErr => {
        log('Failed to restart server:', restartErr);
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

process.on('SIGTERM', () => {
    log('Received SIGTERM. Attempting graceful shutdown...');
    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
        
        // Instead of exiting, try to restart after a delay
        log('Server closed successfully. Attempting to restart in 3 seconds...');
        setTimeout(() => {
            log('Restarting server after SIGTERM...');
            startServer(5000).catch(restartErr => {
                console.error('Failed to restart server after SIGTERM:', restartErr);
                process.exit(1);
            });
        }, 3000);
    });
    
    // Still keep the force shutdown as a fallback, but extend the timeout
    setTimeout(() => {
        console.error('Force restarting after timeout');
        server.close();
        startServer(5000).catch(err => {
            console.error('Failed to restart after force shutdown:', err);
            process.exit(1);
        });
    }, 15000);
});

process.on('SIGINT', () => {
    log('Received SIGINT. Attempting graceful shutdown...');
    server.close((err) => {
        if (err) {
            console.error('Error during shutdown:', err);
            process.exit(1);
        }
        process.exit(0);
    });
});