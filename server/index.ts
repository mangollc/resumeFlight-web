// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

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

log("Initializing server...");

// Create HTTP server
const server = registerRoutes(app);

// Set reasonable timeout values
server.timeout = 30000; // 30 seconds
server.keepAliveTimeout = 30000; // 30 seconds

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

// Handle process termination
process.on('SIGTERM', () => {
  log('Received SIGTERM signal. Shutting down gracefully...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('Received SIGINT signal. Shutting down gracefully...');
  server.close(() => {
    log('Server closed');
    process.exit(0);
  });
});

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