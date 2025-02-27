/**
 * Main routes configuration
 */

import { Express } from "express";
import { createServer, type Server } from "http";
import { authRoutes } from "./auth.routes";
import { resumeRoutes } from "./resume.routes";
import { analysisRoutes } from "./analysis.routes";
import { optimizationRoutes } from "./optimization.routes";
import { setupAuth } from "../auth";

export function registerRoutes(app: Express): Server {
    // Set up authentication
    setupAuth(app);

    // Global middleware
    app.use((req, res, next) => {
        res.setHeader("Content-Type", "application/json");
        next();
    });

    // Health check endpoint
    app.get("/api/health", (_req, res) => {
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString()
        });
    });

    // Register route modules with proper prefixes
    app.use('/api', authRoutes);
    app.use('/api', resumeRoutes);  // This will handle /api/uploaded-resumes
    app.use('/api', optimizationRoutes); // Add optimization routes
    app.use('/api/analysis', analysisRoutes);

    return createServer(app);
}

// Export types used by routes
export * from './types';
import express, { Express, Router } from "express";
import http from "http";
import path from "path";
import session from "express-session";
import passport from "passport";
import { storage } from "../storage";
import { setupPassport } from "../auth";
import analysisRoutes from "./analysis.routes";
import optimizationRoutes from "./optimization.routes";
import uploadedResumesRoutes from "./resumes.routes";

// Constants for session configuration
const ONE_DAY = 86400000; // 24 hours in milliseconds

export function registerRoutes(app: Express): http.Server {
  // Setup session
  app.use(
    session({
      store: storage.sessionStore,
      secret: process.env.SESSION_SECRET || "keyboard cat",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: ONE_DAY,
      },
    })
  );

  // Setup passport
  setupPassport(app);

  // API routes
  const apiRouter = Router();

  // Register API routes
  apiRouter.use("/analysis", analysisRoutes);
  apiRouter.use("/optimization", optimizationRoutes);
  apiRouter.use("/uploaded-resumes", uploadedResumesRoutes);

  // Authentication routes
  apiRouter.post("/register", async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }

      const user = await storage.createUser({
        email,
        password,
        name: name || "",
      });

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to login" });
        }
        return res.json(user);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/login", (req, res, next) => {
    passport.authenticate("local", (err: Error, user: any, info: any) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ error: info.message });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        return res.json(user);
      });
    })(req, res, next);
  });

  apiRouter.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      req.session.destroy((err) => {
        if (err) {
          console.error("Error destroying session:", err);
        }
        res.clearCookie("connect.sid");
        return res.json({ success: true });
      });
    });
  });

  apiRouter.get("/me", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json(req.user);
  });

  // Mount API router
  app.use("/api", apiRouter);

  // Create HTTP server
  const server = http.createServer(app);

  return server;
}
