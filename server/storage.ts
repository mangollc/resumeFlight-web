import { User, InsertUser, UploadedResume, InsertUploadedResume, OptimizedResume, InsertOptimizedResume, users, uploadedResumes, optimizedResumes, OptimizationSession, InsertOptimizationSession, optimizationSessions, resumeMatchScores, InsertResumeMatchScore, ResumeMatchScore, CoverLetter, InsertCoverLetter, coverLetters } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and } from "drizzle-orm";
import { db, getCurrentESTTimestamp } from "./db";
import { neon } from '@neondatabase/serverless';

const PostgresSessionStore = connectPg(session);

// Constants for session configuration
const ONE_DAY = 86400; // 24 hours in seconds

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    // Create a new neon client for the session store
    const sessionSql = neon(process.env.DATABASE_URL!);

    this.sessionStore = new PostgresSessionStore({
      conObject: sessionSql,
      tableName: 'session',
      schemaName: 'public',
      createTableIfMissing: true,
      pruneSessionInterval: 60000,
      ttl: 86400,
      errorLog: (err: Error) => {
        console.error('Session store error:', err);
      }
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw new Error('Failed to get user');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()));
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error('Failed to get user by email');
    }
  }

  async createUser(userData: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          email: userData.email.toLowerCase(),
          password: userData.password,
          name: userData.name || '',
        })
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: number, data: { name: string }): Promise<User> {
    try {
      const [user] = await db
        .update(users)
        .set(data)
        .where(eq(users.id, id))
        .returning();
      return user;
    } catch (error) {
      console.error('Error updating user:', error);
      throw new Error('Failed to update user');
    }
  }

  // Resume methods
  async getUploadedResume(id: number): Promise<UploadedResume | undefined> {
    try {
      const [result] = await db.select().from(uploadedResumes).where(eq(uploadedResumes.id, id));
      if (!result) return undefined;

      return {
        ...result,
        metadata: result.metadata as UploadedResume['metadata']
      };
    } catch (error) {
      console.error('Error getting uploaded resume:', error);
      throw new Error('Failed to get uploaded resume');
    }
  }

  async createUploadedResume(resume: InsertUploadedResume & { userId: number }): Promise<UploadedResume> {
    try {
      const [result] = await db
        .insert(uploadedResumes)
        .values({
          ...resume,
          userId: resume.userId,
          content: resume.content,
          metadata: resume.metadata,
          createdAt: await getCurrentESTTimestamp(),
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as UploadedResume['metadata']
      };
    } catch (error) {
      console.error('Error creating uploaded resume:', error);
      throw new Error('Failed to create uploaded resume');
    }
  }

  async getUploadedResumesByUser(userId: number): Promise<UploadedResume[]> {
    try {
      const results = await db.select().from(uploadedResumes).where(eq(uploadedResumes.userId, userId));
      return results.map(result => ({
        ...result,
        metadata: result.metadata as UploadedResume['metadata']
      }));
    } catch (error) {
      console.error('Error getting uploaded resumes by user:', error);
      throw new Error('Failed to get uploaded resumes');
    }
  }

  async deleteUploadedResume(id: number): Promise<void> {
    console.log(`Storage: Starting to delete uploaded resume with ID ${id}`);

    try {
      // First verify the resume exists
      const checkResult = await db.select().from(uploadedResumes).where(eq(uploadedResumes.id, id));

      if (!checkResult || checkResult.length === 0) {
        console.error(`Storage: Resume with ID ${id} not found`);
        throw new Error(`Resume with ID ${id} not found`);
      }

      // Use drizzle-orm for deletion
      await db.delete(uploadedResumes).where(eq(uploadedResumes.id, id));

      console.log(`Storage: Successfully deleted resume with ID ${id}`);
    } catch (error) {
      console.error('Error deleting uploaded resume from database:', error);
      throw new Error(`Failed to delete uploaded resume: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Optimized Resume methods
  async getOptimizedResume(id: number): Promise<OptimizedResume | undefined> {
    try {
      const [result] = await db.select().from(optimizedResumes).where(eq(optimizedResumes.id, id));
      if (!result) return undefined;

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics'],
        contactInfo: result.contactInfo as OptimizedResume['contactInfo'],
        analysis: result.analysis as OptimizedResume['analysis']
      };
    } catch (error) {
      console.error('Error getting optimized resume:', error);
      throw new Error('Failed to get optimized resume');
    }
  }

  async createOptimizedResume(resume: InsertOptimizedResume & { userId: number }): Promise<OptimizedResume> {
    try {
      // Enhanced contact information extraction for structured format
      const contactInfo = {
        fullName: '',
        email: '',
        phone: '',
        address: '',
        linkedin: ''
      };

      // Improved regex patterns for contact info extraction
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const phoneRegex = /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([0-9]{ 3 })\s*\)|([0-9]{ 3 }))\s*(?:[.-]\s*)?)?([0-9]{ 3 })\s*(?:[.-]\s*)?([0-9]{ 4 })/g;
      const addressRegex = /(\d{1,}) [a-zA-Z0-9\s]+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)[,\s]+[a-zA-Z]+[,\s]+[A-Z]{2}[,\s]+\d{5}/gi;

      // Ensure content is a string before splitting
      const contentStr = resume.content || resume.optimisedResume || resume.originalContent || '';
      const lines = contentStr.split('\n');
      let headerSection = lines.slice(0, Math.min(15, lines.length)).join('\n');

      // Extract email
      const emailMatches = headerSection.match(emailRegex);
      if (emailMatches && emailMatches.length > 0) {
        contactInfo.email = emailMatches[0].toLowerCase();
      }

      // Extract phone
      const phoneMatches = headerSection.match(phoneRegex);
      if (phoneMatches && phoneMatches.length > 0) {
        contactInfo.phone = phoneMatches[0].replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
      }

      // Extract address
      const addressMatches = headerSection.match(addressRegex);
      if (addressMatches && addressMatches.length > 0) {
        contactInfo.address = addressMatches[0].trim();
      }

      // Extract LinkedIn profile
      const linkedinRegex = /linkedin\.com\/in\/[a-zA-Z0-9-]+/gi;
      const linkedinMatches = headerSection.match(linkedinRegex);
      if (linkedinMatches && linkedinMatches.length > 0) {
        contactInfo.linkedin = linkedinMatches[0].trim();
      }

      // Extract full name (usually the first non-empty line that's not email/phone/address)
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine &&
            !trimmedLine.match(emailRegex) &&
            !trimmedLine.match(phoneRegex) &&
            !trimmedLine.match(addressRegex) &&
            trimmedLine.length > 1 &&
            trimmedLine.split(' ').length <= 4) {
          contactInfo.fullName = trimmedLine;
          break;
        }
      }

      // If name wasn't found in the simple search, try to find it in the first 3 lines
      if (!contactInfo.fullName) {
        const firstThreeLines = lines.slice(0, 3);
        for (const line of firstThreeLines) {
          const trimmedLine = line.trim();
          if (trimmedLine && trimmedLine.length > 1 && trimmedLine.split(' ').length <= 4) {
            contactInfo.fullName = trimmedLine;
            break;
          }
        }
      }

      // Ensure proper structure for metrics
      const metrics = {
        before: {
          overall: 0,
          keywords: 0,
          skills: 0,
          experience: 0,
          education: 0,
          personalization: 0,
          aiReadiness: 0,
          confidence: 0,
          ...resume.metrics?.before
        },
        after: {
          overall: 0,
          keywords: 0,
          skills: 0,
          experience: 0,
          education: 0,
          personalization: 0,
          aiReadiness: 0,
          confidence: 0,
          ...resume.metrics?.after
        }
      };

      // Determine version number - find the latest version for this resume/job combination
      let versionNumber = '1.0';

      try {
        // Check for existing optimizations for this resume and job description
        const existingOptimizations = await db
          .select()
          .from(optimizedResumes)
          .where(and(
            eq(optimizedResumes.uploadedResumeId, resume.uploadedResumeId),
            eq(optimizedResumes.jobDescription, resume.jobDescription)
          ));

        if (existingOptimizations.length > 0) {
          // Find the highest version number
          const versions = existingOptimizations.map(opt =>
            parseFloat(opt.version || '1.0')
          );
          const highestVersion = Math.max(...versions);
          // Increment by 0.1
          versionNumber = (highestVersion + 0.1).toFixed(1);
        }
      } catch (versionError) {
        console.error('Error determining version number:', versionError);
        // Default to 1.0 if there's an error
      }

      console.log(`Creating optimized resume version ${versionNumber}`);

      // Insert the new optimized resume with proper version
      const [result] = await db
        .insert(optimizedResumes)
        .values({
          userId: resume.userId,
          sessionId: resume.sessionId,
          uploadedResumeId: resume.uploadedResumeId,
          optimisedResume: resume.optimisedResume || resume.content,
          originalContent: resume.originalContent,
          jobDescription: resume.jobDescription,
          jobUrl: resume.jobUrl || null,
          jobDetails: resume.jobDetails || {},
          metadata: {
            filename: resume.metadata?.filename || '',
            optimizedAt: new Date().toISOString(),
            version: versionNumber
          },
          metrics,
          analysis: {
            strengths: resume.analysis?.strengths || [],
            improvements: resume.analysis?.improvements || [],
            gaps: resume.analysis?.gaps || [],
            suggestions: resume.analysis?.suggestions || []
          },
          version: versionNumber,
          createdAt: await getCurrentESTTimestamp(),
          contactInfo
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics'],
        contactInfo: result.contactInfo as OptimizedResume['contactInfo'],
        analysis: result.analysis as OptimizedResume['analysis']
      };
    } catch (error) {
      console.error('Error creating optimized resume:', error);
      throw new Error('Failed to create optimized resume');
    }
  }

  async updateOptimizedResume(id: number, data: Partial<OptimizedResume>): Promise<OptimizedResume> {
    try {
      const [resume] = await db
        .update(optimizedResumes)
        .set(data)
        .where(eq(optimizedResumes.id, id))
        .returning();

      return {
        ...resume,
        metadata: resume.metadata as OptimizedResume['metadata'],
        jobDetails: resume.jobDetails as OptimizedResume['jobDetails'],
        metrics: resume.metrics as OptimizedResume['metrics'],
        contactInfo: resume.contactInfo as OptimizedResume['contactInfo'],
        resumeMatchScores: {
          keywords: 0,
          skills: 0,
          experience: 0,
          education: 0,
          personalization: 0,
          aiReadiness: 0,
          overall: 0
        }
      };
    } catch (error) {
      console.error('Error updating optimized resume:', error);
      throw new Error('Failed to update optimized resume');
    }
  }

  async getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]> {
    try {
      // Use explicit column selection to avoid schema mismatches
      const results = await db.select({
        id: optimizedResumes.id,
        userId: optimizedResumes.userId,
        sessionId: optimizedResumes.sessionId,
        uploadedResumeId: optimizedResumes.uploadedResumeId,
        optimisedResume: optimizedResumes.optimisedResume,
        originalContent: optimizedResumes.originalContent,
        jobDescription: optimizedResumes.jobDescription,
        jobUrl: optimizedResumes.jobUrl,
        jobDetails: optimizedResumes.jobDetails,
        metadata: optimizedResumes.metadata,
        metrics: optimizedResumes.metrics,
        analysis: optimizedResumes.analysis,
        version: optimizedResumes.version,
        createdAt: optimizedResumes.createdAt,
        contactInfo: optimizedResumes.contactInfo
      })
        .from(optimizedResumes)
        .where(eq(optimizedResumes.userId, userId));

      return results.map(result => {
        return {
          ...result,
          metadata: result.metadata as OptimizedResume['metadata'],
          jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
          metrics: result.metrics as OptimizedResume['metrics'],
          contactInfo: result.contactInfo as OptimizedResume['contactInfo'],
          analysis: result.analysis as OptimizedResume['analysis']
        };
      });
    } catch (error) {
      console.error('Error getting optimized resumes by user:', error);
      throw new Error('Failed to get optimized resumes');
    }
  }

  async deleteOptimizedResume(id: number): Promise<void> {
    console.log(`[Storage] Starting deletion of optimized resume with ID: ${id}`);

    try {
      // First verify the resume exists
      const [existingResume] = await db
        .select()
        .from(optimizedResumes)
        .where(eq(optimizedResumes.id, id));

      if (!existingResume) {
        console.log(`[Storage] Resume with ID ${id} not found`);
        throw new Error(`Resume with ID ${id} not found`);
      }

      console.log(`[Storage] Found resume to delete:`, existingResume);

      // Perform the deletion
      const result = await db
        .delete(optimizedResumes)
        .where(eq(optimizedResumes.id, id))
        .returning();

      console.log(`[Storage] Delete query result:`, result);

      if (result.length === 0) {
        console.error(`[Storage] Delete operation returned no results for ID ${id}`);
        throw new Error(`Failed to delete resume with ID ${id}`);
      }

      console.log(`[Storage] Successfully deleted resume with ID ${id}`);
    } catch (error) {
      console.error('[Storage] Error in deleteOptimizedResume:', error);
      throw error;
    }
  }

  async getOptimizedResumesByJobDescription(jobDescription: string, uploadedResumeId: number): Promise<OptimizedResume[]> {
    try {
      const results = await db.select({
        id: optimizedResumes.id,
        sessionId: optimizedResumes.sessionId,
        userId: optimizedResumes.userId,
        uploadedResumeId: optimizedResumes.uploadedResumeId,
        optimisedResume: optimizedResumes.optimisedResume,
        originalContent: optimizedResumes.originalContent,
        jobDescription: optimizedResumes.jobDescription,
        jobUrl: optimizedResumes.jobUrl,
        jobDetails: optimizedResumes.jobDetails,
        metadata: optimizedResumes.metadata,
        version: optimizedResumes.version,
        metrics: optimizedResumes.metrics,
        analysis: optimizedResumes.analysis,
        createdAt: optimizedResumes.createdAt,
        contactInfo: optimizedResumes.contactInfo
      })
        .from(optimizedResumes)
        .where(and(
          eq(optimizedResumes.jobDescription, jobDescription),
          eq(optimizedResumes.uploadedResumeId, uploadedResumeId)
        ));

      const transformedResults = results.map(result => {
        const jobDetails = result.jobDetails as any;
        const contactInfo = jobDetails?.contactInfo || {
          fullName: '',
          email: '',
          phone: '',
        };

        return {
          ...result,
          metadata: result.metadata as OptimizedResume['metadata'],
          jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
          metrics: result.metrics as OptimizedResume['metrics'],
          contactInfo,
          resumeMatchScores: {
            keywords: 0,
            skills: 0,
            experience: 0,
            education: 0,
            personalization: 0,
            aiReadiness: 0,
            overall: 0
          }
        };
      });

      return transformedResults;
    } catch (error) {
      console.error('Error getting optimized resumes by job description:', error);
      return [];
    }
  }

  // Optimization Session methods
  async getOptimizationSession(sessionId: string): Promise<OptimizationSession | undefined> {
    try {
      const [result] = await db
        .select()
        .from(optimizationSessions)
        .where(eq(optimizationSessions.sessionId, sessionId));

      if (!result) return undefined;

      return {
        ...result,
        comparisons: result.comparisons as OptimizationSession['comparisons'],
        reviewState: result.reviewState as OptimizationSession['reviewState'],
      };
    } catch (error) {
      console.error('Error getting optimization session:', error);
      throw new Error('Failed to get optimization session');
    }
  }

  async createOptimizationSession(session: InsertOptimizationSession & { userId: number }): Promise<OptimizationSession> {
    try {
      const now = new Date().toISOString();
      const [result] = await db
        .insert(optimizationSessions)
        .values({
          ...session,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      return {
        ...result,
        comparisons: result.comparisons as OptimizationSession['comparisons'],
        reviewState: result.reviewState as OptimizationSession['reviewState'],
      };
    } catch (error) {
      console.error('Error creating optimization session:', error);
      throw new Error('Failed to create optimization session');
    }
  }

  async updateOptimizationSession(
    sessionId: string,
    data: Partial<InsertOptimizationSession>,
  ): Promise<OptimizationSession> {
    try {
      const [result] = await db
        .update(optimizationSessions)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(optimizationSessions.sessionId, sessionId))
        .returning();

      return {
        ...result,
        comparisons: result.comparisons as OptimizationSession['comparisons'],
        reviewState: result.reviewState as OptimizationSession['reviewState'],
      };
    } catch (error) {
      console.error('Error updating optimization session:', error);
      throw new Error('Failed to update optimization session');
    }
  }

  async getOptimizationSessionsByUser(userId: number): Promise<OptimizationSession[]> {
    try {
      const results = await db
        .select()
        .from(optimizationSessions)
        .where(eq(optimizationSessions.userId, userId));

      return results;
    } catch (error) {
      console.error('Error getting optimization sessions by user:', error);
      throw new Error('Failed to get optimization sessions');
    }
  }

  async createCoverLetter(coverLetter: InsertCoverLetter & {
    userId: number;
    highlights?: string[];
    confidence?: number;
    version?: string;
    versionHistory?: {
      content: string;
      version: string;
      generatedAt: string;
    }[];
  }): Promise<CoverLetter> {
    try {
      const [result] = await db
        .insert(coverLetters)
        .values({
          userId: coverLetter.userId,
          optimizedResumeId: coverLetter.optimizedResumeId,
          content: coverLetter.content,
          metadata: coverLetter.metadata || {
            filename: `Cover_Letter_${Date.now()}`,
            generatedAt: new Date().toISOString(),
            version: coverLetter.version || '1.0'
          },
          highlights: coverLetter.highlights || [],
          confidence: coverLetter.confidence || 0,
          version: coverLetter.version || '1.0',
          versionHistory: coverLetter.versionHistory || [{
            content: coverLetter.content,
            version: coverLetter.version || '1.0',
            generatedAt: new Date().toISOString()
          }],
          createdAt: await getCurrentESTTimestamp()
        })
        .returning();

      return result;
    } catch (error) {
      console.error('Error creating cover letter:', error);
      throw new Error('Failed to create cover letter');
    }
  }

  async getCoverLetterByResumeId(resumeId: number): Promise<CoverLetter | undefined> {
    try {
      const [result] = await db
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.optimizedResumeId, resumeId));

      if (!result) return undefined;

      return {
        ...result,
        metadata: result.metadata as CoverLetter['metadata']
      };
    } catch (error) {
      console.error('Error getting cover letter by resume ID:', error);
      throw new Error('Failed to get cover letter');
    }
  }

  async getResumeMatchScore(optimizedResumeId: number): Promise<ResumeMatchScore | undefined> {
    try {
      const [result] = await db
        .select()
        .from(resumeMatchScores)
        .where(eq(resumeMatchScores.optimizedResumeId, optimizedResumeId));

      return result;
    } catch (error) {
      console.error('Error getting resume match score:', error);
      return undefined;
    }
  }

  async createResumeMatchScore(score: InsertResumeMatchScore & { userId: number }): Promise<ResumeMatchScore> {
    try {
      const [result] = await db
        .insert(resumeMatchScores)
        .values({
          userId: score.userId,
          optimizedResumeId: score.optimizedResumeId,
          originalScores: score.originalScores,
          optimizedScores: score.optimizedScores,
          analysis: score.analysis,
          createdAt: await getCurrentESTTimestamp()
        })
        .returning();

      return result;
    } catch (error) {
      console.error('Error creating resume match score:', error);
      throw new Error('Failed to create resume match score');
    }
  }
}

export const storage = new DatabaseStorage();