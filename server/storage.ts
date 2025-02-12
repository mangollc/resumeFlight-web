import { User, InsertUser, Resume, InsertResume, CoverLetter, InsertCoverLetter, users, resumes, coverLetters } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Resume operations
  getResume(id: number): Promise<Resume | undefined>;
  createResume(resume: InsertResume & { userId: number, jobDescription: string | null }): Promise<Resume>;
  updateResume(id: number, updates: Partial<Resume>): Promise<Resume>;
  getResumesByUser(userId: number): Promise<Resume[]>;
  deleteUploadedResume(id: number): Promise<void>; 

  // Cover letter operations
  getCoverLetter(id: number): Promise<CoverLetter | undefined>;
  createCoverLetter(coverLetter: InsertCoverLetter & { userId: number }): Promise<CoverLetter>;
  getCoverLettersByUser(userId: number): Promise<CoverLetter[]>;

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

  async getResume(id: number): Promise<Resume | undefined> {
    const [result] = await db.select().from(resumes).where(eq(resumes.id, id));
    if (!result) return undefined;

    return {
      ...result,
      metadata: result.metadata as Resume['metadata']
    };
  }

  async createResume(resume: InsertResume & { userId: number, jobDescription: string | null }): Promise<Resume> {
    const [result] = await db
      .insert(resumes)
      .values({
        ...resume,
        createdAt: new Date().toISOString(),
        optimizedContent: null,
      })
      .returning();

    return {
      ...result,
      metadata: result.metadata as Resume['metadata']
    };
  }

  async updateResume(id: number, updates: Partial<Resume>): Promise<Resume> {
    const [result] = await db
      .update(resumes)
      .set(updates)
      .where(eq(resumes.id, id))
      .returning();

    return {
      ...result,
      metadata: result.metadata as Resume['metadata']
    };
  }

  async getResumesByUser(userId: number): Promise<Resume[]> {
    const results = await db.select().from(resumes).where(eq(resumes.userId, userId));
    return results.map(result => ({
      ...result,
      metadata: result.metadata as Resume['metadata']
    }));
  }

  async deleteUploadedResume(id: number): Promise<void> { 
    await db.delete(resumes).where(eq(resumes.id, id));
  }

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
}

export const storage = new DatabaseStorage();