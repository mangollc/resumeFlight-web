import { User, InsertUser, UploadedResume, InsertUploadedResume, OptimizedResume, InsertOptimizedResume, CoverLetter, InsertCoverLetter, users, uploadedResumes, optimizedResumes, coverLetters } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq, and } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

// Constants for session configuration
const ONE_DAY = 86400; // 24 hours in seconds
const ONE_HOUR = 3600; // 1 hour in seconds

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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
}

export class DatabaseStorage implements IStorage {
  readonly sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true,
      tableName: 'session',
      pruneSessionInterval: ONE_HOUR * 1000,
      ttl: ONE_DAY
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

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error getting user by username:', error);
      throw new Error('Failed to get user by username');
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(insertUser)
        .returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
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

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics']
      };
    } catch (error) {
      console.error('Error getting optimized resume:', error);
      throw new Error('Failed to get optimized resume');
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

      const transformedResults = results.map(result => ({
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics']
      }));

      // Sort by version number in descending order
      return transformedResults.sort((a, b) => 
        (b.metadata.version || 0) - (a.metadata.version || 0)
      );
    } catch (error) {
      console.error('Error getting optimized resumes by job description:', error);
      return []; 
    }
  }

  async createOptimizedResume(resume: InsertOptimizedResume & { userId: number }): Promise<OptimizedResume> {
    try {
      const [result] = await db
        .insert(optimizedResumes)
        .values({
          ...resume,
          createdAt: new Date().toISOString(),
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as OptimizedResume['metadata'],
        jobDetails: result.jobDetails as OptimizedResume['jobDetails'],
        metrics: result.metrics as OptimizedResume['metrics']
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
        metrics: result.metrics as OptimizedResume['metrics']
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
      const [result] = await db
        .insert(coverLetters)
        .values({
          ...coverLetter,
          createdAt: new Date().toISOString(),
        })
        .returning();

      return {
        ...result,
        metadata: result.metadata as CoverLetter['metadata']
      };
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
}

export const storage = new DatabaseStorage();