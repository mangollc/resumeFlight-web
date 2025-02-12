import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const resumes = pgTable("resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  originalContent: text("original_content").notNull(),
  optimizedContent: text("optimized_content"),
  jobDescription: text("job_description"),
  metadata: jsonb("metadata").notNull(),
  createdAt: text("created_at").notNull(),
});

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  resumeId: integer("resume_id").notNull(),
  content: text("content").notNull(),
  jobDescription: text("job_description").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertResumeSchema = createInsertSchema(resumes)
  .pick({
    originalContent: true,
    metadata: true,
  })
  .extend({
    jobDescription: z.string().optional(),
  });

export const insertCoverLetterSchema = createInsertSchema(coverLetters)
  .pick({
    content: true,
    jobDescription: true,
    metadata: true,
  })
  .extend({
    resumeId: z.number(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect & {
  metadata: {
    filename: string;
    fileType: string;
    uploadedAt: string;
  };
};
export type InsertResume = z.infer<typeof insertResumeSchema>;
export type CoverLetter = typeof coverLetters.$inferSelect & {
  metadata: {
    filename: string;
    generatedAt: string;
  };
};
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;