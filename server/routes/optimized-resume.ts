// Create a new EventSource connection
app.get("/api/uploaded-resumes/:id/optimize", async (req, res) => {
  const { id } = req.params;
  const { jobUrl, jobDescription } = req.query;

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  // Add CORS headers to allow EventSource connection
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.flushHeaders();

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client closed connection');
    // Clean up any resources if needed
  });

  // Send an initial connection message
  res.write(`data: ${JSON.stringify({ step: "connected", status: "pending" })}\n\n`);

  try {
    // Start the optimization process
    const optimizationResult = await resumeOptimizer.optimizeResume({
      uploadedResumeId: parseInt(id),
      userId: req.user?.id,
      jobUrl: jobUrl as string,
      jobDescription: jobDescription as string,
      progressCallback: (step, status, details) => {
        try {
          res.write(`data: ${JSON.stringify({ step, status, details })}\n\n`);
        } catch (err) {
          console.error("Error sending progress update:", err);
        }
      }
    });

    // Send the final result
    res.write(`data: ${JSON.stringify({ 
      step: "complete", 
      status: "completed", 
      result: optimizationResult 
    })}\n\n`);

    res.end();
  } catch (error) {
    console.error("Error in resume optimization:", error);
    // Format error response
    const errorMessage = error.message || "Unknown error occurred";
    const errorCode = error.code || "OPTIMIZATION_ERROR";

    // Send a more detailed error response with proper formatting
    try {
      const errorPayload = {
        step: "error", 
        status: "error", 
        message: errorMessage || "Failed to generate optimized content",
        code: errorCode,
        timestamp: new Date().toISOString(),
        details: error.stack ? error.stack.split('\n')[0] : undefined
      };
      
      const errorData = `data: ${JSON.stringify(errorPayload)}\n\n`;
      console.error("Sending error response:", errorPayload);
      
      // Make sure the connection is still open before writing
      if (!res.writableEnded) {
        res.write(errorData);
      }
    } catch (sendError) {
      console.error("Failed to send error response:", sendError);
    }
    
    // Make sure to end the response if it hasn't been ended yet
    if (!res.writableEnded) {
      res.end();
    }
  }
});