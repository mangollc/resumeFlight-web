import { pgTable, text, serial, integer, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const uploadedResumes = pgTable("uploaded_resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: text("created_at").notNull(),
});

export const optimizedResumes = pgTable("optimized_resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  uploadedResumeId: integer("uploaded_resume_id").notNull(),
  content: text("content").notNull(),
  jobDescription: text("job_description").notNull(),
  jobDetails: jsonb("job_details").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: text("created_at").notNull(),
});

// Add index to optimized_resume_id for better query performance
export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  optimizedResumeId: integer("optimized_resume_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => ({
  optimizedResumeIdIdx: index("cover_letter_optimized_resume_id_idx").on(table.optimizedResumeId),
}));

// Define relations
export const optimizedResumesRelations = relations(optimizedResumes, ({ one }) => ({
  coverLetter: one(coverLetters, {
    fields: [optimizedResumes.id],
    references: [coverLetters.optimizedResumeId],
  }),
  uploadedResume: one(uploadedResumes, {
    fields: [optimizedResumes.uploadedResumeId],
    references: [uploadedResumes.id],
  }),
}));

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  optimizedResume: one(optimizedResumes, {
    fields: [coverLetters.optimizedResumeId],
    references: [optimizedResumes.id],
  }),
}));

// Insert schemas remain the same
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertUploadedResumeSchema = createInsertSchema(uploadedResumes)
  .pick({
    content: true,
    metadata: true,
  });

export const insertOptimizedResumeSchema = createInsertSchema(optimizedResumes)
  .pick({
    content: true,
    jobDescription: true,
    jobDetails: true,
    metadata: true,
    uploadedResumeId: true,
  });

export const insertCoverLetterSchema = createInsertSchema(coverLetters)
  .pick({
    content: true,
    metadata: true,
    optimizedResumeId: true,
  });

// Types remain the same
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type UploadedResume = typeof uploadedResumes.$inferSelect & {
  metadata: {
    filename: string;
    fileType: string;
    uploadedAt: string;
  };
};
export type InsertUploadedResume = z.infer<typeof insertUploadedResumeSchema>;

export type OptimizedResume = typeof optimizedResumes.$inferSelect & {
  metadata: {
    filename: string;
    optimizedAt: string;
  };
  jobDetails: {
    title: string;
    company: string;
    location: string;
    salary?: string;
    positionLevel?: string;
    candidateProfile?: string;
  };
};
export type InsertOptimizedResume = z.infer<typeof insertOptimizedResumeSchema>;

export type CoverLetter = typeof coverLetters.$inferSelect & {
  metadata: {
    filename: string;
    generatedAt: string;
  };
};
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;