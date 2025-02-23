import { User, InsertUser, UploadedResume, InsertUploadedResume, OptimizedResume, InsertOptimizedResume, CoverLetter, InsertCoverLetter, users, uploadedResumes, optimizedResumes, coverLetters, OptimizationSession, InsertOptimizationSession, optimizationSessions, resumeMatchScores, InsertResumeMatchScore, ResumeMatchScore } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Constants for session configuration
const ONE_DAY = 86400; // 24 hours in seconds

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: { name: string }): Promise<User>;
  // Uploaded Resume operations
  getUploadedResume(id: number): Promise<UploadedResume | undefined>;
  createUploadedResume(resume: InsertUploadedResume & { userId: number }): Promise<UploadedResume>;
  getUploadedResumesByUser(userId: number): Promise<UploadedResume[]>;
  deleteUploadedResume(id: number): Promise<void>;
  // Optimized Resume operations
  getOptimizedResume(id: number): Promise<OptimizedResume | undefined>;
  createOptimizedResume(resume: InsertOptimizedResume & { userId: number }): Promise<OptimizedResume>;
  getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]>;
  deleteOptimizedResume(id: number): Promise<void>;
  getOptimizedResumesByJobDescription(jobDescription: string, uploadedResumeId: number): Promise<OptimizedResume[]>;
  // Cover letter operations
  getCoverLetter(id: number): Promise<CoverLetter | undefined>;
  createCoverLetter(coverLetter: InsertCoverLetter & { userId: number }): Promise<CoverLetter>;
  getCoverLettersByUser(userId: number): Promise<CoverLetter[]>;
  deleteCoverLetter(id: number): Promise<void>;
  getCoverLettersByOptimizedResumeId(optimizedResumeId: number): Promise<CoverLetter[]>;
  sessionStore: session.Store;
  // Optimization Session operations
  getOptimizationSession(sessionId: string): Promise<OptimizationSession | undefined>;
  createOptimizationSession(session: InsertOptimizationSession & { userId: number }): Promise<OptimizationSession>;
  updateOptimizationSession(sessionId: string, data: Partial<InsertOptimizationSession>): Promise<OptimizationSession>;
  getOptimizationSessionsByUser(userId: number): Promise<OptimizationSession[]>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      schemaName: 'public',
      createTableIfMissing: true,
      pruneSessionInterval: 60000, // 1 minute cleanup interval
      ttl: 86400, // 24 hours
      errorLog: (err: Error) => {
        console.error('Session store error:', err);
      },
      disableTouch: true, // Disable touch to prevent connection issues
      connectionConfig: {
        statement_timeout: 10000, // 10 second timeout for session operations
        idle_timeout: 30000, // 30 second idle timeout
      }
    });

    // Add error handler for session store
    this.sessionStore.on('error', (error: Error) => {
      console.error('Session store error:', error);
    });

    // Add connection event handler
    this.sessionStore.on('connect', () => {
      console.log('Session store connected successfully');
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
          createdAt: new Date().toISOString(),
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
    try {
      await db.delete(uploadedResumes).where(eq(uploadedResumes.id, id));
    } catch (error) {
      console.error('Error deleting uploaded resume:', error);
      throw new Error('Failed to delete uploaded resume');
    }
  }

  // Optimized Resume methods
  async getOptimizedResume(id: number): Promise<OptimizedResume | undefined> {
    try {
      const [result] = await db.select().from(optimizedResumes).where(eq(optimizedResumes.id, id));
      if (!result) return undefined;

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
        contactInfo
      };
    } catch (error) {
      console.error('Error getting optimized resume:', error);
      throw new Error('Failed to get optimized resume');
    }
  }

  async createOptimizedResume(resume: InsertOptimizedResume & { userId: number }): Promise<OptimizedResume> {
    try {
      // Get existing versions if this is a regeneration
      const existingVersions = await db
        .select()
        .from(optimizedResumes)
        .where(eq(optimizedResumes.uploadedResumeId, resume.uploadedResumeId));

      // Calculate next version number
      const currentVersion = existingVersions.length > 0
        ? Math.max(...existingVersions.map(r => parseFloat(r.version)))
        : 1.0;
      const nextVersion = (Math.floor((currentVersion + 0.1) * 10) / 10).toFixed(1);
      const timestamp = new Date().toISOString();

      const [result] = await db
        .insert(optimizedResumes)
        .values({
          ...resume,
          version: nextVersion,
          versionHistory: [{
            version: nextVersion,
            content: resume.content,
            timestamp: timestamp,
            changes: []
          }],
          versionMetrics: [{
            version: nextVersion,
            metrics: {
              before: {
                overall: 0,
                keywords: 0,
                skills: 0,
                experience: 0
              },
              after: {
                overall: 0,
                keywords: 0,
                skills: 0,
                experience: 0
              }
            },
            timestamp: new Date().toISOString()
          }],
          highlights: [],
          confidence: 0,
          contactInfo: {
            fullName: '',
            email: '',
            phone: '',
            address: ''
          },
          createdAt: new Date(),
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics'],
        contactInfo: (result.jobDetails as any)?.contactInfo || {
          fullName: '',
          email: '',
          phone: '',
        }
      };
    } catch (error) {
      console.error('Error creating optimized resume:', error);
      throw new Error('Failed to create optimized resume');
    }
  }

  async getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]> {
    try {
      const results = await db.select().from(optimizedResumes).where(eq(optimizedResumes.userId, userId));
      return results.map(result => ({
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics'],
        contactInfo: (result.jobDetails as any)?.contactInfo || {
          fullName: '',
          email: '',
          phone: '',
        }
      }));
    } catch (error) {
      console.error('Error getting optimized resumes by user:', error);
      throw new Error('Failed to get optimized resumes');
    }
  }

  async deleteOptimizedResume(id: number): Promise<void> {
    try {
      await db.delete(optimizedResumes).where(eq(optimizedResumes.id, id));
    } catch (error) {
      console.error('Error deleting optimized resume:', error);
      throw new Error('Failed to delete optimized resume');
    }
  }

  async getOptimizedResumesByJobDescription(jobDescription: string, uploadedResumeId: number): Promise<OptimizedResume[]> {
    try {
      const results = await db.select()
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
          contactInfo
        };
      });

      return transformedResults.sort((a, b) =>
        (b.metadata.version || 0) - (a.metadata.version || 0)
      );
    } catch (error) {
      console.error('Error getting optimized resumes by job description:', error);
      return [];
    }
  }

  // Cover Letter methods
  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    try {
      const [result] = await db.select().from(coverLetters).where(eq(coverLetters.id, id));
      if (!result) return undefined;

      return {
        ...result,
        metadata: result.metadata as CoverLetter['metadata']
      };
    } catch (error) {
      console.error('Error getting cover letter:', error);
      throw new Error('Failed to get cover letter');
    }
  }

  async createCoverLetter(coverLetter: InsertCoverLetter & { userId: number }): Promise<CoverLetter> {
    try {
      // Get existing cover letter if this is a regeneration
      let existingCoverLetter;
      if (coverLetter.optimizedResumeId) {
        [existingCoverLetter] = await db
          .select()
          .from(coverLetters)
          .where(eq(coverLetters.optimizedResumeId, coverLetter.optimizedResumeId));
      }

      if (existingCoverLetter) {
        // Update existing cover letter with new version
        const versionHistory = [...(existingCoverLetter.version || []), {
          content: coverLetter.content,
          version: coverLetter.metadata.version,
          generatedAt: new Date().toISOString()
        }];

        const [result] = await db
          .update(coverLetters)
          .set({
            content: coverLetter.content,
            metadata: coverLetter.metadata,
            version: versionHistory
          })
          .where(eq(coverLetters.id, existingCoverLetter.id))
          .returning();

        return {
          ...result,
          metadata: result.metadata as CoverLetter['metadata']
        };
      } else {
        // Create new cover letter
        const [result] = await db
          .insert(coverLetters)
          .values({
            ...coverLetter,
            version: [{
              content: coverLetter.content,
              version: coverLetter.metadata.version,
              generatedAt: new Date().toISOString()
            }],
            createdAt: new Date().toISOString(),
          })
          .returning();

        return {
          ...result,
          metadata: result.metadata as CoverLetter['metadata']
        };
      }
    } catch (error) {
      console.error('Error creating cover letter:', error);
      throw new Error('Failed to create cover letter');
    }
  }

  async getCoverLettersByUser(userId: number): Promise<CoverLetter[]> {
    try {
      const results = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
      return results.map(result => ({
        ...result,
        metadata: result.metadata as CoverLetter['metadata']
      }));
    } catch (error) {
      console.error('Error getting cover letters by user:', error);
      throw new Error('Failed to get cover letters');
    }
  }

  async deleteCoverLetter(id: number): Promise<void> {
    try {
      await db.delete(coverLetters).where(eq(coverLetters.id, id));
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      throw new Error('Failed to delete cover letter');
    }
  }

  async getCoverLettersByOptimizedResumeId(optimizedResumeId: number): Promise<CoverLetter[]> {
    try {
      const results = await db
        .select()
        .from(coverLetters)
        .where(eq(coverLetters.optimizedResumeId, optimizedResumeId));

      return results.map(result => ({
        ...result,
        metadata: result.metadata as CoverLetter['metadata']
      }));
    } catch (error) {
      console.error('Error getting cover letters by optimized resume ID:', error);
      throw new Error('Failed to get cover letters by optimized resume ID');
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

      return results.map(result => ({
        ...result,
        comparisons: result.comparisons as OptimizationSession['comparisons'],
        reviewState: result.reviewState as OptimizationSession['reviewState'],
      }));
    } catch (error) {
      console.error('Error getting optimization sessions by user:', error);
      throw new Error('Failed to get optimization sessions');
    }
  }

  async createResumeMatchScore(score: InsertResumeMatchScore & { userId: number }): Promise<ResumeMatchScore> {
    try {
      const [result] = await db
        .insert(resumeMatchScores)
        .values({
          ...score,
          createdAt: new Date().toISOString(),
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