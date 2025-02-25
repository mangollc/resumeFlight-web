import { User, InsertUser, UploadedResume, InsertUploadedResume, OptimizedResume, InsertOptimizedResume, users, uploadedResumes, optimizedResumes, OptimizationSession, InsertOptimizationSession, optimizationSessions, resumeMatchScores, InsertResumeMatchScore, ResumeMatchScore } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Constants for session configuration
const ONE_HOUR = 3600000; // 1 hour in milliseconds
const TWELVE_HOURS = ONE_HOUR * 12;

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
  updateOptimizedResume(id: number, data: Partial<OptimizedResume>): Promise<OptimizedResume>;
  getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]>;
  deleteOptimizedResume(id: number): Promise<void>;
  getOptimizedResumesByJobDescription(jobDescription: string, uploadedResumeId: number): Promise<OptimizedResume[]>;
  // Other operations
  sessionStore: session.Store;
  getOptimizationSession(sessionId: string): Promise<OptimizationSession | undefined>;
  createOptimizationSession(session: InsertOptimizationSession & { userId: number }): Promise<OptimizationSession>;
  updateOptimizationSession(sessionId: string, data: Partial<InsertOptimizationSession>): Promise<OptimizationSession>;
  getOptimizationSessionsByUser(userId: number): Promise<OptimizationSession[]>;
  getResumeMatchScore(optimizedResumeId: number): Promise<ResumeMatchScore | undefined>;
  createResumeMatchScore(score: InsertResumeMatchScore & { userId: number }): Promise<ResumeMatchScore>;
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      tableName: 'session',
      schemaName: 'public',
      createTableIfMissing: true,
      // Enhanced security settings
      pruneSessionInterval: ONE_HOUR / 2, // Cleanup every 30 minutes
      ttl: TWELVE_HOURS / 1000, // Convert to seconds
      // Randomize session cleanup to prevent timing attacks
      pruneSessionRandomizedInterval: true,
      // Enable session touching to keep active sessions alive
      disableTouch: false,
      // Error handling
      errorLog: (err: Error) => {
        console.error('Session store error:', err);
      }
    });

    this.sessionStore.on('error', (error: Error) => {
      console.error('Session store error:', error);
    });

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

      // Get the analysis data from metrics.after
      const metrics = result.metrics as OptimizedResume['metrics'];
      const analysis = {
        matches: metrics.after.strengths || [],
        improvements: metrics.after.improvements || [],
        gaps: metrics.after.gaps || [],
        suggestions: metrics.after.suggestions || []
      };

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: metrics,
        contactInfo: result.contactInfo as OptimizedResume['contactInfo'],
        analysis
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
      let nextVersion = '1.0';
      if (existingVersions.length > 0) {
        const versions = existingVersions.map(r => r.version);
        const maxVersion = versions.reduce((max, current) => {
          const [currentMajor, currentMinor] = current.split('.').map(Number);
          const [maxMajor, maxMinor] = max.split('.').map(Number);
          if (currentMajor > maxMajor || (currentMajor === maxMajor && currentMinor > maxMinor)) {
            return current;
          }
          return max;
        }, '1.0');

        const [major, minor] = maxVersion.split('.').map(Number);
        nextVersion = minor === 9 ? `${major + 1}.0` : `${major}.${minor + 1}`;
      }

      const timestamp = (await getCurrentESTTimestamp()).toISOString();
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
              before: { overall: 0, keywords: 0, skills: 0, experience: 0 },
              after: { overall: 0, keywords: 0, skills: 0, experience: 0 }
            },
            timestamp: timestamp
          }],
          highlights: [],
          confidence: 0,
          contactInfo: {
            fullName: '',
            email: '',
            phone: '',
            address: ''
          },
          createdAt: await getCurrentESTTimestamp(),
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics'],
        contactInfo: result.contactInfo as OptimizedResume['contactInfo']
      };
    } catch (error) {
      console.error('Error creating optimized resume:', error);
      throw new Error('Failed to create optimized resume');
    }
  }

  async getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]> {
    try {
      const results = await db.select().from(optimizedResumes).where(eq(optimizedResumes.userId, userId));
      return results.map(result => {
        const metrics = result.metrics as OptimizedResume['metrics'];
        const analysis = {
          matches: metrics.after.strengths || [],
          improvements: metrics.after.improvements || [],
          gaps: metrics.after.gaps || [],
          suggestions: metrics.after.suggestions || []
        };

        return {
          ...result,
          metadata: result.metadata as OptimizedResume['metadata'],
          jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
          metrics: metrics,
          contactInfo: result.contactInfo as OptimizedResume['contactInfo'],
          analysis
        };
      });
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
        .where(eq(optimizedResumes.jobDescription, jobDescription)
          .and(eq(optimizedResumes.uploadedResumeId, uploadedResumeId)));

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

  // Optimized Resume methods with update functionality
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