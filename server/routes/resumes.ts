import { Router } from 'express';
import { requireAuth } from '../auth';
import { storage } from '../storage';
import { logger } from '../utils/logger';

const router = Router();

// Stream the optimization process using SSE
router.get('/api/uploaded-resumes/:id/optimize', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { jobDescription } = req.query;

  if (!jobDescription) {
    return res.status(400).json({ error: true, message: 'Job description is required' });
  }

  // Set up SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disable buffering for proxies
  });

  // Keep connection alive with a ping every 30 seconds
  const keepAliveInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(keepAliveInterval);
    console.log('Client closed connection');
  });

  // Helper function to send events
  const sendEvent = (data: any) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    // ... existing code to process resume optimization ...

  } catch (error) {
    console.error('Error during resume optimization:', error);
    sendEvent({ 
      status: 'error', 
      error: 'Failed to optimize resume' 
    });

    // Clean up resources
    clearInterval(keepAliveInterval);

    // Make sure we properly end the response
    if (!res.writableEnded) {
      res.end();
    }
  } finally {
    // Ensure interval is cleared even if no error
    req.on('end', () => {
      clearInterval(keepAliveInterval);
    });
  }
});

// Delete optimized resume
router.delete('/api/optimized-resumes/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    // Verify the resume exists and belongs to the user
    const resume = await storage.getOptimizedResume(parseInt(id));
    if (!resume || resume.userId !== userId) {
      return res.status(404).json({ error: true, message: 'Resume not found' });
    }

    // Delete the resume
    await storage.deleteOptimizedResume(parseInt(id));

    // Return success response
    return res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error deleting resume:', error);
    return res.status(500).json({ error: true, message: 'Failed to delete resume' });
  }
});

export const resumesRouter = router;