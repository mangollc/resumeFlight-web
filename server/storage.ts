import { User, InsertUser, Resume, InsertResume, users, resumes } from "@shared/schema";
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
}

export const storage = new DatabaseStorage();