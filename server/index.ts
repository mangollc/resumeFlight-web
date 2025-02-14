// Force development mode when running with npm run dev
process.env.NODE_ENV = process.env.NODE_ENV || "development";

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set timeout to 2 minutes (120000ms), well within 32-bit integer limits
const TIMEOUT_DURATION = 120000;

app.use((req, res, next) => {
  // Set timeouts safely
  if (req.setTimeout) {
    req.setTimeout(TIMEOUT_DURATION);
  }
  if (res.setTimeout) {
    res.setTimeout(TIMEOUT_DURATION);
  }

  // Handle request timeouts
  req.on('timeout', () => {
    const err = new Error('Request timeout') as any;
    err.status = 408;
    next(err);
  });

  // Handle response timeouts
  res.on('timeout', () => {
    const err = new Error('Response timeout') as any;
    err.status = 503;
    next(err);
  });

  next();
});

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

server.listen(5000, "0.0.0.0", () => {
  log("Server started on port 5000");
});