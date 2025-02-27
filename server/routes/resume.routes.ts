
import { Router } from 'express';
import { db } from '../db';
import { ensureAuthenticated } from '../auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { OptimizedResume } from '@shared/schema';

const router = Router();

// Fetch all optimized resumes for the authenticated user
router.get('/optimized-resumes', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const optimizedResumes = await db.query.optimizedResumes.findMany({
      where: (optimizedResumes, { eq }) => eq(optimizedResumes.userId, userId)
    });
    
    res.json(optimizedResumes);
  } catch (error) {
    console.error('Error fetching optimized resumes:', error);
    res.status(500).json({ error: 'Failed to fetch optimized resumes' });
  }
});

// Fetch a specific optimized resume by ID
router.get('/optimized-resume/:id', ensureAuthenticated, async (req, res) => {
  try {
    const resumeId = req.params.id;
    const userId = req.user!.id;
    
    const optimizedResume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { eq, and }) => 
        and(
          eq(optimizedResumes.id, resumeId),
          eq(optimizedResumes.userId, userId)
        )
    });
    
    if (!optimizedResume) {
      return res.status(404).json({ error: 'Optimized resume not found' });
    }
    
    res.json(optimizedResume);
  } catch (error) {
    console.error('Error fetching optimized resume:', error);
    res.status(500).json({ error: 'Failed to fetch optimized resume' });
  }
});

// Download optimized resume
router.get('/optimized-resume/:id/download', ensureAuthenticated, async (req, res) => {
  try {
    const resumeId = req.params.id;
    const userId = req.user!.id;
    const format = req.query.format as string || 'pdf';
    
    // Fetch the optimized resume
    const optimizedResume = await db.query.optimizedResumes.findFirst({
      where: (optimizedResumes, { eq, and }) => 
        and(
          eq(optimizedResumes.id, resumeId),
          eq(optimizedResumes.userId, userId)
        )
    });
    
    if (!optimizedResume) {
      return res.status(404).json({ error: 'Optimized resume not found' });
    }

    if (format === 'docx') {
      // Handle DOCX format
      // This is a simplified implementation - in a real app, you'd use a library like docx.js
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="resume.docx"`);
      
      // In a real implementation, you would generate a proper DOCX file
      // For now, we'll send the content as is (this won't be a valid DOCX but demonstrates the concept)
      res.send(optimizedResume.content);
    } else {
      // Default to PDF
      // Create a simple PDF with the resume content
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const { width, height } = page.getSize();
      const margin = 50;
      const fontSize = 12;
      
      // Split content into lines and write to PDF
      const content = optimizedResume.content;
      const lines = content.split('\n');
      
      let y = height - margin;
      for (const line of lines) {
        const textWidth = font.widthOfTextAtSize(line, fontSize);
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: width - 2 * margin,
        });
        y -= fontSize * 1.2;
        
        // Add a new page if needed
        if (y < margin) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - margin;
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="resume.pdf"`);
      res.send(Buffer.from(pdfBytes));
    }
  } catch (error) {
    console.error('Error generating resume download:', error);
    res.status(500).json({ error: 'Failed to generate resume download' });
  }
});

// Download cover letter
router.get('/optimized-resume/cover-letter/:id/download', ensureAuthenticated, async (req, res) => {
  try {
    const coverId = req.params.id;
    const userId = req.user!.id;
    const format = req.query.format as string || 'pdf';
    
    // Fetch the cover letter
    const coverLetter = await db.query.coverLetters.findFirst({
      where: (coverLetters, { eq, and }) => 
        and(
          eq(coverLetters.id, coverId),
          eq(coverLetters.userId, userId)
        )
    });
    
    if (!coverLetter) {
      return res.status(404).json({ error: 'Cover letter not found' });
    }

    if (format === 'docx') {
      // Handle DOCX format
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="cover_letter.docx"`);
      
      // In a real implementation, you would generate a proper DOCX file
      res.send(coverLetter.content);
    } else {
      // Default to PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const { width, height } = page.getSize();
      const margin = 50;
      const fontSize = 12;
      
      // Split content into lines and write to PDF
      const content = coverLetter.content;
      const lines = content.split('\n');
      
      let y = height - margin;
      for (const line of lines) {
        page.drawText(line, {
          x: margin,
          y,
          size: fontSize,
          font,
          color: rgb(0, 0, 0),
          maxWidth: width - 2 * margin,
        });
        y -= fontSize * 1.2;
        
        // Add a new page if needed
        if (y < margin) {
          const newPage = pdfDoc.addPage();
          y = newPage.getSize().height - margin;
        }
      }
      
      const pdfBytes = await pdfDoc.save();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="cover_letter.pdf"`);
      res.send(Buffer.from(pdfBytes));
    }
  } catch (error) {
    console.error('Error generating cover letter download:', error);
    res.status(500).json({ error: 'Failed to generate cover letter download' });
  }
});

// Add the router to the module exports
export default router;
