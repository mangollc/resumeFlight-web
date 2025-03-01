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

// Import enhanced logger
import { requestLogger } from './utils/logger';

// Request logging middleware with enhanced details
app.use(requestLogger);

// Add security and CORS headers
app.use((req, res, next) => {
    // Set CSP headers
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' * https://*.replit.dev https://*.repl.co;"
    );
    
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle OPTIONS requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

// Special middleware for API routes to ensure JSON content type
app.use('/api', (req, res, next) => {
  // Set content type early and ensure it doesn't get overridden
  res.type('application/json');

  // Store the original send/json methods
  const originalSend = res.send;
  const originalJson = res.json;

  // Override send method to ensure it maintains JSON format
  res.send = function(body) {
    // If body is not already a string, convert it to JSON
    if (typeof body !== 'string') {
      return originalJson.call(this, body);
    }

    // If it's a string that doesn't look like JSON, convert it
    if (!body.startsWith('{') && !body.startsWith('[')) {
      try {
        return originalJson.call(this, JSON.parse(body));
      } catch (e) {
        // If parsing fails, wrap it as an error object
        return originalJson.call(this, { error: body });
      }
    }

    // Ensure content type is application/json
    this.type('application/json');
    return originalSend.call(this, body);
  };

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

    // Ensure proper content type for API responses
    res.setHeader('Content-Type', 'application/json');

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
  } else {
    _next(err); // Pass non-API errors to next handler
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
        log(`Server accessible at http://0.0.0.0:${port} and via Replit domains`);
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
        log('Server closed successfully.');
        process.exit(0);
    });

    // Force shutdown as a fallback
    setTimeout(() => {
        console.error('Force shutting down after timeout');
        process.exit(1);
    }, 5000);
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