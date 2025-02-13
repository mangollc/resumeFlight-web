import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    log("[Startup] Registering routes...");
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });

    log("[Startup] Initializing environment...");
    if (app.get("env") === "development") {
      log("[Startup] Setting up Vite for development...");
      await setupVite(app, server);
      log("[Startup] Vite setup complete");
    } else {
      log("[Startup] Serving static files for production...");
      serveStatic(app);
    }

    const PORT = 5000;
    const MAX_PORT_ATTEMPTS = 10;
    let currentPort = PORT;
    let serverStarted = false;

    log("[Startup] Beginning server start sequence...");
    while (!serverStarted && currentPort < PORT + MAX_PORT_ATTEMPTS) {
      try {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Server startup timed out on port ${currentPort}`));
          }, 5000);

          server.listen(currentPort, "0.0.0.0", () => {
            clearTimeout(timeout);
            log(`[express] Server started successfully on port ${currentPort}`);
            serverStarted = true;
            resolve();
          }).on('error', (err: any) => {
            clearTimeout(timeout);
            if (err.code === 'EADDRINUSE') {
              log(`[express] Port ${currentPort} is in use`);
              currentPort++;
              resolve(); // Continue to next port
            } else {
              reject(err);
            }
          });
        });
      } catch (error: any) {
        log(`[express] Failed to start server on port ${currentPort}: ${error.message}`);
        if (currentPort >= PORT + MAX_PORT_ATTEMPTS - 1) {
          throw error;
        }
        currentPort++;
      }
    }

    if (!serverStarted) {
      throw new Error(`Failed to start server after trying ports ${PORT} through ${currentPort}`);
    }
  } catch (error) {
    log(`[express] Fatal error starting server: ${error}`);
    process.exit(1);
  }
})();