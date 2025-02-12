import { User, InsertUser, Resume, InsertResume } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Resume operations
  getResume(id: number): Promise<Resume | undefined>;
  createResume(resume: InsertResume & { userId: number }): Promise<Resume>;
  getResumesByUser(userId: number): Promise<Resume[]>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private resumes: Map<number, Resume>;
  private currentUserId: number;
  private currentResumeId: number;
  readonly sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.resumes = new Map();
    this.currentUserId = 1;
    this.currentResumeId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getResume(id: number): Promise<Resume | undefined> {
    return this.resumes.get(id);
  }

  async createResume(resume: InsertResume & { userId: number }): Promise<Resume> {
    const id = this.currentResumeId++;
    const newResume: Resume = {
      ...resume,
      id,
      createdAt: new Date().toISOString(),
      optimizedContent: null,
    };
    this.resumes.set(id, newResume);
    return newResume;
  }

  async getResumesByUser(userId: number): Promise<Resume[]> {
    return Array.from(this.resumes.values()).filter(
      (resume) => resume.userId === userId,
    );
  }
}

export const storage = new MemStorage();
