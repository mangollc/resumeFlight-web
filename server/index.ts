import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Set timeout to maximum safe value for 32-bit signed integer
const TIMEOUT_DURATION = Math.min(5 * 60 * 1000, 2147483647); // 2147483647 is 0x7FFFFFFF

app.use((req, res, next) => {
  req.setTimeout(TIMEOUT_DURATION);
  res.setTimeout(TIMEOUT_DURATION);

  const timeoutHandler = () => {
    const err = new Error('Request timeout') as any;
    err.status = 408;
    next(err);
  };

  res.setTimeout(TIMEOUT_DURATION, () => {
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

(async () => {
  try {
    log("Starting server initialization...");
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
      log("Setting up Vite for development...");
      await setupVite(app, server);
    } else {
      log("Setting up static file serving for production...");
      serveStatic(app);
    }

    const DEFAULT_PORT = 5000; // Changed from 3000 to 5000

    const tryPort = (port: number): Promise<number> => {
      return new Promise((resolve, reject) => {
        log(`Attempting to start server on port ${port}...`);
        server.listen(port, "0.0.0.0")
          .on('listening', () => {
            const address = server.address();
            const actualPort = typeof address === 'object' && address ? address.port : port;
            log(`Server successfully started on port ${actualPort}`);
            resolve(actualPort);
          })
          .on('error', (err: any) => {
            if (err.code === 'EADDRINUSE') {
              log(`Port ${port} is in use, attempting to use a random port...`);
              server.listen(0, "0.0.0.0")
                .on('listening', () => {
                  const address = server.address();
                  const actualPort = typeof address === 'object' && address ? address.port : 0;
                  log(`Server started on alternative port ${actualPort}`);
                  resolve(actualPort);
                })
                .on('error', (fallbackErr) => {
                  log(`Failed to start server on alternative port: ${fallbackErr.message}`);
                  reject(fallbackErr);
                });
            } else {
              log(`Failed to start server: ${err.message}`);
              reject(err);
            }
          });
      });
    };

    tryPort(DEFAULT_PORT).catch(err => {
      console.error('Failed to start server:', err);
      process.exit(1);
    });
  } catch (error) {
    console.error('Critical error during server startup:', error);
    process.exit(1);
  }
})();