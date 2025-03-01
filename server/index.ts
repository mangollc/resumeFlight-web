// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { checkDatabaseConnection } from "./db";

// Initialize Express app
const app = express();

// Basic middleware setup
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Import enhanced logger
import { requestLogger } from './utils/logger';

// Request logging middleware with enhanced details
app.use(requestLogger);

// Add security headers before any route handling
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' * https://*.replit.dev https://*.repl.co;"
  );
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// API routes must be registered before Vite middleware
const server = registerRoutes(app);

// API middleware
app.use('/api', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json');
  }
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

// Error handler for API routes
app.use('/api', (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const errorId = Math.random().toString(36).substring(7);

  console.error(`[Error ${errorId}] ${status} - ${message} - ${req.method} ${req.originalUrl}`, {
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
});

// Setup environment-specific middleware as a self-executing async function
(async () => {
  try {
    if (process.env.NODE_ENV === "development") {
      // Set up Vite once
      await setupVite(app, server);
    } else {
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

          srv.once('error', (err: any) => {
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
        setTimeout(() => {
          startServer(port).catch(console.error);
        }, 3000);
      }
    };

    startServer(5000).catch(console.error);

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      log('Received SIGTERM. Attempting graceful shutdown...');
      server.close((err) => {
        if (err) {
          console.error('Error during shutdown:', err);
          process.exit(1);
        }
        process.exit(0);
      });
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

  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
})();