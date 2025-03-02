import { Router } from "express";
import { z } from "zod";
import { findUploadedResume } from "../storage";
import { optimizeResume } from "../utils/optimize";
import { logger } from "../utils/logger";
import { v4 as uuid } from 'uuid';

export const optimizedResumeRouter = Router();

// Schema for validating optimization requests
const optimizationSchema = z.object({
  jobDescription: z.string().optional(),
  jobUrl: z.string().url().optional(),
  version: z.number().optional(),
});

// Update the optimization endpoint
optimizedResumeRouter.get("/:id/optimize", async (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Helper function to send SSE events
  const sendEvent = (data: any) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  // Start heartbeat interval
  const heartbeatInterval = setInterval(() => {
    try {
      sendEvent({ type: 'heartbeat', timestamp: Date.now() });
    } catch (error) {
      clearInterval(heartbeatInterval);
    }
  }, 15000);

  try {
    // Parse and validate input
    const { id } = req.params;
    const { jobDescription, jobUrl } = optimizationSchema.parse(req.query);

    // Check authorization
    if (!req.session.userId) {
      sendEvent({ 
        status: "error", 
        message: "Authentication required", 
        code: "AUTH_ERROR" 
      });
      return res.end();
    }

    // Fetch the uploaded resume
    const resume = await findUploadedResume(parseInt(id, 10));
    if (!resume) {
      sendEvent({ 
        status: "error", 
        message: "Resume not found", 
        code: "NOT_FOUND" 
      });
      return res.end();
    }

    // Verify ownership
    if (resume.userId !== req.session.userId) {
      sendEvent({ 
        status: "error", 
        message: "Unauthorized access", 
        code: "UNAUTHORIZED" 
      });
      return res.end();
    }

    try {
      // Start optimization process
      const result = await optimizeResume(
        resume.content,
        jobDescription || "",
        (status) => sendEvent({ status, ...status })
      );

      if (!result || !result.optimisedResume) {
        throw new Error('Invalid optimization result');
      }

      // Save optimized resume
      const optimizedResume = await storage.createOptimizedResume({
        userId: req.session.userId,
        sessionId: result.sessionId || uuid(),
        uploadedResumeId: parseInt(id),
        optimisedResume: result.optimisedResume,
        originalContent: resume.content,
        jobDescription,
        jobUrl: jobUrl || null,
        jobDetails: result.jobDetails || {},
        metadata: {
          filename: resume.metadata?.filename || 'resume.txt',
          optimizedAt: new Date().toISOString(),
          version: '1.0'
        },
        metrics: result.metrics || {
          before: {},
          after: {}
        },
        analysis: result.analysis || {
          strengths: [],
          improvements: [],
          gaps: [],
          suggestions: []
        },
        resumeContent: result.resumeContent || {}
      });

      // Send completion event
      sendEvent({ 
        status: "completed",
        optimizedResume
      });

    } catch (error: any) {
      console.error('Optimization error:', error);
      sendEvent({ 
        status: "error",
        message: error.message || "Failed to optimize resume",
        code: error.code || "OPTIMIZATION_ERROR"
      });
    }

  } catch (error: any) {
    console.error('Fatal error:', error);
    sendEvent({ 
      status: "error",
      message: error.message || "An unexpected error occurred",
      code: "FATAL_ERROR"
    });
  } finally {
    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
  }
});