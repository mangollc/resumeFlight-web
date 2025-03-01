// Stream the optimization process using SSE
import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../auth';  // Add this import

const router = Router();

// Delete optimized resume
router.delete('/optimized-resumes/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  console.log(`Delete request received for resume ID: ${id}`);

  try {
    if (!req.user || !req.user.id) {
      console.log('Delete request rejected: User not authenticated');
      return res.status(401).json({ error: true, message: 'Unauthorized' });
    }

    const userId = req.user.id;
    console.log(`Authenticated user ID: ${userId}`);

    // Verify the resume exists and belongs to the user
    const resume = await storage.getOptimizedResume(parseInt(id));
    console.log('Found resume:', resume ? `ID: ${resume.id}, UserID: ${resume.userId}` : 'Not found');

    if (!resume) {
      return res.status(404).json({ error: true, message: 'Resume not found' });
    }

    if (resume.userId !== userId) {
      console.log(`Access denied: Resume belongs to user ${resume.userId}, request from user ${userId}`);
      return res.status(403).json({ error: true, message: 'Access denied' });
    }

    // Delete the resume
    console.log(`Attempting to delete resume ID: ${id}`);
    await storage.deleteOptimizedResume(parseInt(id));
    console.log(`Successfully deleted resume ID: ${id}`);

    // Return success response
    return res.json({ success: true, message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Error in delete resume route:', error);
    return res.status(500).json({ error: true, message: 'Failed to delete resume' });
  }
});

export default router;