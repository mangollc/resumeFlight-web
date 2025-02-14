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

const server = registerRoutes(app);

// Set server timeout to 2 minutes (120 seconds)
server.timeout = 120000;
server.keepAliveTimeout = 120000;

// Function to find an available port
async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const testServer = express().listen(startPort, "0.0.0.0", () => {
      const port = (testServer.address() as any).port;
      testServer.close(() => resolve(port));
    }).on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

// Enhanced server startup with port fallback
async function startServer() {
  try {
    log("Attempting to start server...");
    const port = await findAvailablePort(5000);
    log(`Found available port: ${port}`);

    server.listen(port, "0.0.0.0", () => {
      log(`Server started successfully on port ${port}`);
      // Set environment variable for Vite to use
      process.env.PORT = port.toString();
    }).on('error', (err: any) => {
      log(`Server startup error: ${err.message}`);
      process.exit(1);
    });

    // Graceful shutdown handler
    process.on('SIGTERM', () => {
      log('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        log('Server closed. Exiting process.');
        process.exit(0);
      });
    });

  } catch (err) {
    log(`Failed to start server: ${err}`);
    process.exit(1);
  }
}

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

// Initialize server
startServer().catch(err => {
  log(`Fatal error during server startup: ${err}`);
  process.exit(1);
});