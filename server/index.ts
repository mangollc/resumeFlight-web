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
server.listen(port, "0.0.0.0", () => {
  log(`Server started on port ${port}`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    const nextPort = port + 1;
    log(`Port ${port} is busy, trying ${nextPort}`);
    server.listen(nextPort, "0.0.0.0", () => {
      log(`Server started on port ${nextPort}`);
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});