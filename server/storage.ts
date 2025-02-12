import { User, InsertUser, UploadedResume, InsertUploadedResume, OptimizedResume, InsertOptimizedResume, CoverLetter, InsertCoverLetter, users, uploadedResumes, optimizedResumes, coverLetters } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

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
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Uploaded Resume methods
  async getUploadedResume(id: number): Promise<UploadedResume | undefined> {
    const [result] = await db.select().from(uploadedResumes).where(eq(uploadedResumes.id, id));
    if (!result) return undefined;

    return {
      ...result,
      metadata: result.metadata as UploadedResume['metadata']
    };
  }

  async createUploadedResume(resume: InsertUploadedResume & { userId: number }): Promise<UploadedResume> {
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
  }

  async getUploadedResumesByUser(userId: number): Promise<UploadedResume[]> {
    const results = await db.select().from(uploadedResumes).where(eq(uploadedResumes.userId, userId));
    return results.map(result => ({
      ...result,
      metadata: result.metadata as UploadedResume['metadata']
    }));
  }

  async deleteUploadedResume(id: number): Promise<void> {
    await db.delete(uploadedResumes).where(eq(uploadedResumes.id, id));
  }

  // Optimized Resume methods
  async getOptimizedResume(id: number): Promise<OptimizedResume | undefined> {
    const [result] = await db.select().from(optimizedResumes).where(eq(optimizedResumes.id, id));
    if (!result) return undefined;

    return {
      ...result,
      metadata: result.metadata as OptimizedResume['metadata'],
      jobDetails: result.jobDetails as OptimizedResume['jobDetails']
    };
  }

  async createOptimizedResume(resume: InsertOptimizedResume & { userId: number }): Promise<OptimizedResume> {
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
      jobDetails: result.jobDetails as OptimizedResume['jobDetails']
    };
  }

  async getOptimizedResumesByUser(userId: number): Promise<OptimizedResume[]> {
    const results = await db.select().from(optimizedResumes).where(eq(optimizedResumes.userId, userId));
    return results.map(result => ({
      ...result,
      metadata: result.metadata as OptimizedResume['metadata'],
      jobDetails: result.jobDetails as OptimizedResume['jobDetails']
    }));
  }

  async deleteOptimizedResume(id: number): Promise<void> {
    await db.delete(optimizedResumes).where(eq(optimizedResumes.id, id));
  }

  // Cover Letter methods
  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    const [result] = await db.select().from(coverLetters).where(eq(coverLetters.id, id));
    if (!result) return undefined;

    return {
      ...result,
      metadata: result.metadata as CoverLetter['metadata']
    };
  }

  async createCoverLetter(coverLetter: InsertCoverLetter & { userId: number }): Promise<CoverLetter> {
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
  }

  async getCoverLettersByUser(userId: number): Promise<CoverLetter[]> {
    const results = await db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
    return results.map(result => ({
      ...result,
      metadata: result.metadata as CoverLetter['metadata']
    }));
  }

  async deleteCoverLetter(id: number): Promise<void> {
    await db.delete(coverLetters).where(eq(coverLetters.id, id));
  }

  async getCoverLettersByOptimizedResumeId(optimizedResumeId: number): Promise<CoverLetter[]> {
    const results = await db
      .select()
      .from(coverLetters)
      .where(eq(coverLetters.optimizedResumeId, optimizedResumeId));

    return results.map(result => ({
      ...result,
      metadata: result.metadata as CoverLetter['metadata']
    }));
  }
}

export const storage = new DatabaseStorage();