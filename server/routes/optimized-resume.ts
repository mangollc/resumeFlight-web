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

      // Save the final optimized resume to the database
      try {
        const optimizedResume = await storage.createOptimizedResume({
          userId: req.user!.id,
          sessionId: result.sessionId,
          uploadedResumeId: resumeId,
          optimisedResume: result.optimisedResume,
          originalContent: resume.content,
          jobDescription: jobDescription || jobDetails?.description || "",
          jobUrl: jobUrl || null,
          jobDetails: result.jobDetails,
          metadata: {
            filename: resume.metadata?.filename || 'resume.txt',
            optimizedAt: new Date().toISOString(),
            version: '1.0'
          },
          metrics: result.metrics,
          analysis: result.analysis,
          resumeContent: result.resumeContent,
          contactInfo: result.contactInfo
        });

        // Send completion with the optimized resume
        sendEvent({ 
          status: "completed", 
          optimizedResume: {
            id: optimizedResume.id,
            uploadedResumeId: resumeId,
            optimisedResume: optimizedResume.optimisedResume,
            resumeContent: optimizedResume.resumeContent,
            jobDescription: optimizedResume.jobDescription,
            changes: result.changes,
            analysis: result.analysis,
            metrics: result.metrics || {},
            createdAt: optimizedResume.createdAt,
            updatedAt: optimizedResume.updatedAt,
            contactInfo: result.contactInfo
          }
        });
      } catch (error: any) {
        // Handle various error types
        clearInterval(heartbeatInterval);
        console.error("Error during resume optimization:", error);

        // Check if we have result data - this could mean optimization was successful
        // but there was an error saving to database
        if (error.code === 'STORAGE_ERROR' && error._result) {
          // Even if DB save failed, still send successful completion with the result
          sendEvent({ 
            status: "completed",
            optimizedResume: {
              uploadedResumeId: resumeId,
              optimisedResume: error._result.optimisedResume,
              resumeContent: error._result.resumeContent,
              jobDescription: jobDescription || jobDetails?.description || "",
              changes: error._result.changes,
              analysis: error._result.analysis,
              metrics: error._result.metrics || {},
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              contactInfo: error._result.contactInfo
            }
          });
        }
        // Send appropriate error message based on error type
        else if (error.code === 'TIMEOUT_ERROR' || error.message.includes('timed out')) {
          sendEvent({ 
            status: "error", 
            message: "Resume optimization is taking longer than expected. Please try again with a shorter resume.",
            code: "TIMEOUT_ERROR"
          });
        } else {
          sendEvent({ 
            status: "error", 
            message: "Failed to generate optimized content", 
            code: error.code || "OPTIMIZATION_ERROR" 
          });
        }
      } finally {
        res.end();
      }

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