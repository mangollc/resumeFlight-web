// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { checkDatabaseConnection } from "./db";
import { logger, requestLogger, setupGlobalErrorLogging } from './utils/logger';

// Set up global error handlers
setupGlobalErrorLogging();

// Log startup information
logger.info(`Starting server in ${process.env.NODE_ENV} mode`);

const app = express();

// Basic middleware setup with error handling
app.use(express.json({ 
  limit: '50mb',
  verify: (req: any, res, buf, encoding) => {
    try {
      if (buf && buf.length) {
        JSON.parse(buf.toString(encoding || 'utf8'));
      }
    } catch (e) {
      logger.warn('Invalid JSON received in request body', { 
        path: req.originalUrl, 
        error: (e as Error).message 
      });
      res.status(400).json({ 
        error: true, 
        message: 'Invalid JSON in request body',
        code: 'INVALID_JSON'
      });
      throw e;
    }
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Request logging middleware with enhanced details
app.use(requestLogger);

// Add security headers
app.use((req, res, next) => {
    // Add CSP headers
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' * https://*.replit.dev https://*.repl.co;"
    );
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }
    
    next();
});

// Health check endpoint
app.get("/api/health", async (_req, res) => {
    try {
        const dbConnected = await checkDatabaseConnection();
        if (dbConnected) {
            logger.debug('Health check: database connected');
            res.status(200).json({
                status: "healthy",
                database: "connected",
                timestamp: new Date().toISOString()
            });
        } else {
            logger.warn('Health check: database disconnected');
            res.status(503).json({
                status: "unhealthy",
                database: "disconnected",
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        logger.error('Health check failed', error);
        res.status(500).json({
            status: "error",
            message: "Health check failed",
            timestamp: new Date().toISOString()
        });
    }
});

// API response type validation middleware
app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    // Store the original json method
    const originalJson = res.json;
    
    // Override the json method to ensure we're always sending valid json
    res.json = function(body: any): any {
        // Check if body is defined and can be serialized
        if (body === undefined) {
            logger.warn('Attempt to send undefined as JSON response', {
                path: req.path,
                method: req.method
            });
            
            return originalJson.call(this, {
                error: true,
                message: 'Internal Server Error - Invalid Response',
                code: 'INVALID_RESPONSE'
            });
        }
        
        // Restore original method and continue
        return originalJson.call(this, body);
    };
    
    next();
});

// Register routes
const server = registerRoutes(app);

// Enhanced error handling middleware
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    // Generate a unique error ID for tracking
    const errorId = Math.random().toString(36).substring(7);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Log the error with context
    logger.error(`Request error (${errorId})`, err, {
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
        userId: req.user?.id,
        statusCode: status
    });

    // Only send detailed errors in development mode
    if (req.path.startsWith('/api')) {
        res.status(status).json({
            error: true,
            message: process.env.NODE_ENV === "production"
                ? `An unexpected error occurred (ID: ${errorId})`
                : message,
            code: err.code || 'SERVER_ERROR',
            errorId,
            ...(process.env.NODE_ENV !== "production" && {
                stack: err.stack,
                details: err.details || err.response?.data
            })
        });
    } else {
        // For non-API routes, let the client side error handler manage it
        next(err);
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