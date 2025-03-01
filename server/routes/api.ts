
import express from 'express';
import { db } from '../db';
import { optimizedResumes } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Endpoint to fetch optimized resumes with proper error handling
router.get('/optimized-resumes', async (req, res) => {
  try {
    // Set proper JSON header
    res.setHeader('Content-Type', 'application/json');
    
    // Get user ID from session
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized", data: [] });
    }
    
    // Query database directly with drizzle
    const results = await db.select()
      .from(optimizedResumes)
      .where(eq(optimizedResumes.userId, userId));
    
    // Return empty array instead of error
    return res.json(Array.isArray(results) ? results : []);
  } catch (error) {
    console.error("API error fetching optimized resumes:", error);
    // Always return JSON, even on error
    return res.status(500).json({ error: "Failed to fetch optimized resumes", data: [] });
  }
});

export default router;
