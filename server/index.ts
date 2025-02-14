import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set safe timeout values well below 32-bit integer limit
const TIMEOUT_DURATION = 10000; // 10 seconds in milliseconds

app.use((req, res, next) => {
  // Set timeouts with proper error handling and explicit conversion
  const timeout = Math.min(TIMEOUT_DURATION, 0x7FFFFFFF); // Ensure value stays within 32-bit signed int
  req.setTimeout(timeout);
  res.setTimeout(timeout);
  req.setTimeout(TIMEOUT_DURATION, () => {
    const err = new Error('Request timeout');
    err.status = 408;
    next(err);
  });

  res.setTimeout(TIMEOUT_DURATION, () => {
    const err = new Error('Response timeout');
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

(async () => {
  const server = registerRoutes(app);

  // Enhanced error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log the error for debugging
    console.error(`[Error] ${status} - ${message}`, err.stack);

    // Don't expose internal error details in production
    const responseMessage = app.get("env") === "production" 
      ? "An unexpected error occurred" 
      : message;

    res.status(status).json({ 
      error: true,
      message: responseMessage,
      ...(app.get("env") !== "production" && { stack: err.stack })
    });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const PORT = 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();