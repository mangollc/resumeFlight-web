
import { Router } from "express";
import { z } from "zod";
import { findUploadedResume } from "../storage";
import { optimizeResume } from "../utils/optimize";
import { logger } from "../utils/logger";

export const optimizedResumeRouter = Router();

// Schema for validating optimization requests
const optimizationSchema = z.object({
  jobDescription: z.string().optional(),
  jobUrl: z.string().url().optional(),
  version: z.number().optional(),
});

// SSE route for resume optimization
optimizedResumeRouter.get("/:id/optimize", async (req, res) => {
  // Set headers for SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Helper function to send SSE events
  const sendEvent = (data: any) => {
    logger.info(`Sending SSE event: ${data.status}`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Parse and validate input
    const { id } = req.params;
    const { jobDescription, jobUrl } = optimizationSchema.parse(req.query);

    // Check authorization (user id from session should match resume owner)
    if (!req.session.userId) {
      res.status(401).end();
      return;
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
        message: "You do not have permission to access this resume", 
        code: "UNAUTHORIZED" 
      });
      return res.end();
    }

    // Ensure we have either job description or URL
    if (!jobDescription && !jobUrl) {
      sendEvent({ 
        status: "error", 
        message: "Job description or URL is required", 
        code: "MISSING_JOB_INFO" 
      });
      return res.end();
    }

    let jobDetails;
    if (jobUrl && !jobDescription) {
      sendEvent({ status: "fetching_job" });
      try {
        // If implemented: fetch job description from URL
        jobDetails = { description: "Job description would be fetched here" };
      } catch (error) {
        sendEvent({ 
          status: "error", 
          message: "Failed to fetch job description from URL", 
          code: "JOB_FETCH_ERROR" 
        });
        return res.end();
      }
    }

    // Start heartbeat interval to keep connection alive
    const heartbeatInterval = setInterval(() => {
      try {
        sendEvent({ type: 'heartbeat', timestamp: Date.now() });
      } catch (error) {
        clearInterval(heartbeatInterval);
      }
    }, 15000); // Send heartbeat every 15 seconds
    
    try {
      // Start optimization process with status updates
      const result = await optimizeResume(
        resume.content, 
        jobDescription || jobDetails?.description || "", 
        (status) => sendEvent(status)
      );
      
      // On successful completion
      sendEvent({ 
        status: "completed", 
        message: "Resume optimization completed successfully",
        timestamp: new Date().toISOString()
      });
      
      // End the connection
      clearInterval(heartbeatInterval);
      res.end();
    } catch (error: any) {
      // Clear heartbeat on error
      clearInterval(heartbeatInterval);
      
      // Enhanced error reporting
      const errorMessage = error.message || "Unknown error occurred";
      const errorCode = error.code || "OPTIMIZATION_ERROR";
      const errorStep = error.step || "unknown";

      // Send structured error response
      sendEvent({ 
        status: "error", 
        message: errorMessage,
        code: errorCode,
        step: errorStep,
        timestamp: new Date().toISOString(),
        details: error.details || null
      });
      
      logger.error(`Optimization error in ${errorStep} step:`, error);
      res.end();
    }
  } catch (outer_error: any) {
    // Catch any errors during the entire process
    logger.error('Fatal optimization error:', outer_error);
    
    try {
      // Send final error response if not already sent
      sendEvent({ 
        status: "error", 
        message: outer_error.message || "A critical error occurred",
        code: "FATAL_ERROR",
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      // Last resort error logging
      console.error('Failed to send error event:', e);
    }
    
    res.end();
  }
});
