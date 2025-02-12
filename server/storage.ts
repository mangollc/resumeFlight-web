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
    const [resume] = await db.select().from(resumes).where(eq(resumes.id, id));
    return resume;
  }

  async createResume(resume: InsertResume & { userId: number, jobDescription: string | null }): Promise<Resume> {
    const [newResume] = await db
      .insert(resumes)
      .values({
        ...resume,
        createdAt: new Date().toISOString(),
        optimizedContent: null,
      })
      .returning();
    return newResume;
  }

  async updateResume(id: number, updates: Partial<Resume>): Promise<Resume> {
    const [updated] = await db
      .update(resumes)
      .set(updates)
      .where(eq(resumes.id, id))
      .returning();
    return updated;
  }

  async getResumesByUser(userId: number): Promise<Resume[]> {
    return db.select().from(resumes).where(eq(resumes.userId, userId));
  }

  async getCoverLetter(id: number): Promise<CoverLetter | undefined> {
    const [coverLetter] = await db.select().from(coverLetters).where(eq(coverLetters.id, id));
    return coverLetter;
  }

  async createCoverLetter(coverLetter: InsertCoverLetter & { userId: number }): Promise<CoverLetter> {
    const [newCoverLetter] = await db
      .insert(coverLetters)
      .values({
        ...coverLetter,
        createdAt: new Date().toISOString(),
      })
      .returning();
    return newCoverLetter;
  }

  async getCoverLettersByUser(userId: number): Promise<CoverLetter[]> {
    return db.select().from(coverLetters).where(eq(coverLetters.userId, userId));
  }
}

export const storage = new DatabaseStorage();