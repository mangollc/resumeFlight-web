import { pgTable, text, serial, integer, jsonb, index, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").default(''),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const uploadedResumes = pgTable("uploaded_resumes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("uploaded_resumes_user_id_idx").on(table.userId),
  createdAtIdx: index("uploaded_resumes_created_at_idx").on(table.createdAt),
}));

export const optimizedResumes = pgTable("optimized_resumes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id").notNull(),
  uploadedResumeId: integer("uploaded_resume_id").notNull(),
  optimisedResume: text("optimised_resume").notNull(),
  originalContent: text("original_content").notNull(),
  jobDescription: text("job_description").notNull(),
  jobUrl: text("job_url"),
  jobDetails: jsonb("job_details").notNull().default({}),
  metadata: jsonb("metadata").notNull().default({}),
  version: text("version").notNull().default('1.0'),
  metrics: jsonb("metrics").notNull().default({
    before: {
      overall: 0,
      keywords: 0,
      skills: 0,
      experience: 0,
      education: 0,
      personalization: 0,
      aiReadiness: 0,
      confidence: 0,
    },
    after: {
      overall: 0,
      keywords: 0,
      skills: 0,
      experience: 0,
      education: 0,
      personalization: 0,
      aiReadiness: 0,
      confidence: 0,
    }
  }),
  analysis: jsonb("analysis").notNull().default({
    strengths: [],
    improvements: [],
    gaps: [],
    suggestions: []
  }),
  professionalSummary: text("professional_summary").notNull().default(''),
  skills: jsonb("skills").notNull().default({
    technical: [],
    soft: [],
  }),
  experience: jsonb("experience").notNull().default([]),
  education: jsonb("education").notNull().default([]),
  certifications: jsonb("certifications").notNull().default([]),
  optionalSections: jsonb("optional_sections").notNull().default({
    projects: [],
    languages: [],
    publications: [],
    volunteerWork: [],
    awardsAndAchievements: []
  }),
  contactInfo: jsonb("contact_info").notNull().default({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    linkedin: ''
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resumeVersionScores = pgTable("resume_version_scores", {
  id: serial("id").primaryKey(),
  optimizedResumeId: integer("optimized_resume_id").notNull(),
  version: integer("version").notNull(),
  userId: integer("user_id").notNull(),
  matchScore: jsonb("match_score").notNull().default({
    overall: 0,
    keywords: 0,
    skills: 0,
    experience: 0
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  optimizedResumeVersionIdx: index("resume_version_scores_idx").on(table.optimizedResumeId, table.version),
  userIdIdx: index("resume_version_scores_user_id_idx").on(table.userId),
}));

export const optimizationSessions = pgTable("optimization_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  userId: integer("user_id").notNull(),
  optimizedResumeId: integer("optimized_resume_id").notNull(),
  coverLetterId: integer("cover_letter_id"),
  comparisons: jsonb("comparisons").notNull(),
  reviewState: jsonb("review_state").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  sessionIdIdx: index("optimization_session_id_idx").on(table.sessionId),
  optimizedResumeIdIdx: index("optimization_session_resume_id_idx").on(table.optimizedResumeId),
  userIdIdx: index("optimization_session_user_id_idx").on(table.userId),
}));

export const coverLetters = pgTable("cover_letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  optimizedResumeId: integer("optimized_resume_id").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  version: text("version").notNull().default('1.0'),
  versionHistory: jsonb("version_history").notNull().default([{
    content: '',
    version: '1.0',
    generatedAt: ''
  }]),
  highlights: jsonb("highlights").notNull().default([]),
  confidence: integer("confidence").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  optimizedResumeIdIdx: index("cover_letter_optimized_resume_id_idx").on(table.optimizedResumeId),
  userIdIdx: index("cover_letter_user_id_idx").on(table.userId),
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
  optimizationSession: one(optimizationSessions, {
    fields: [optimizedResumes.sessionId],
    references: [optimizationSessions.sessionId],
  }),
}));

export const coverLettersRelations = relations(coverLetters, ({ one }) => ({
  optimizedResume: one(optimizedResumes, {
    fields: [coverLetters.optimizedResumeId],
    references: [optimizedResumes.id],
  }),
}));

export const optimizationSessionsRelations = relations(optimizationSessions, ({ one }) => ({
  optimizedResume: one(optimizedResumes, {
    fields: [optimizationSessions.optimizedResumeId],
    references: [optimizedResumes.id],
  }),
  coverLetter: one(coverLetters, {
    fields: [optimizationSessions.coverLetterId],
    references: [coverLetters.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    password: true,
    name: true,
  })
  .transform((data) => ({
    ...data,
    email: data.email.toLowerCase(),
  }));

export const insertUploadedResumeSchema = createInsertSchema(uploadedResumes)
  .pick({
    content: true,
    metadata: true,
  });

export const insertOptimizedResumeSchema = createInsertSchema(optimizedResumes)
  .pick({
    sessionId: true,
    optimisedResume: true,
    originalContent: true,
    jobDescription: true,
    jobUrl: true,
    jobDetails: true,
    metadata: true,
    metrics: true,
    analysis: true,
    professionalSummary: true,
    skills: true,
    experience: true,
    education: true,
    certifications: true,
    optionalSections: true,
    contactInfo: true,
    uploadedResumeId: true,
  });

export const insertOptimizationSessionSchema = createInsertSchema(optimizationSessions)
  .pick({
    sessionId: true,
    optimizedResumeId: true,
    coverLetterId: true,
    comparisons: true,
    reviewState: true,
  });

export const insertCoverLetterSchema = createInsertSchema(coverLetters)
  .pick({
    content: true,
    metadata: true,
    optimizedResumeId: true,
  });

// Types
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
    version: string;
  };
  jobDetails: {
    title: string;
    company: string;
    location: string;
    description: string;
    requirements: string[];
  };
  metrics: {
    before: {
      overall: number;
      keywords: number;
      skills: number;
      experience: number;
      education: number;
      personalization: number;
      aiReadiness: number;
      confidence: number;
    };
    after: {
      overall: number;
      keywords: number;
      skills: number;
      experience: number;
      education: number;
      personalization: number;
      aiReadiness: number;
      confidence: number;
    };
  };
  analysis: {
    strengths: string[];
    improvements: string[];
    gaps: string[];
    suggestions: string[];
    keywordMatches: string[];
    skillGaps: string[];
    experienceAlignment: string[];
    impactMetrics: string[];
  };
  resumeContent: {
    professionalSummary: string;
    skills: {
      technical: string[];
      soft: string[];
      certifications: string[];
    };
    experience: Array<{
      title: string;
      company: string;
      location: string;
      startDate: string;
      endDate: string;
      achievements: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      location: string;
      graduationDate: string;
      gpa?: string;
      honors?: string[];
    }>;
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
      url?: string;
    }>;
    awards?: Array<{
      title: string;
      issuer: string;
      date: string;
      description: string;
    }>;
    volunteerWork?: Array<{
      organization: string;
      role: string;
      duration: string;
      description: string;
    }>;
    languages?: Array<{
      language: string;
      proficiency: string;
    }>;
    publications?: Array<{
      title: string;
      publisher: string;
      date: string;
      url?: string;
    }>;
  };
  contactInfo: {
    fullName: string;
    email: string;
    phone: string;
    address: string;
    linkedin: string;
    portfolio?: string;
    github?: string;
  };
};
export type InsertOptimizedResume = z.infer<typeof insertOptimizedResumeSchema>;

export type OptimizationSession = typeof optimizationSessions.$inferSelect & {
  comparisons: ResumeDifferences;
  reviewState: {
    currentStep: number;
    isComplete: boolean;
    hasGeneratedCoverLetter: boolean;
    downloadedFiles: string[];
  };
};
export type InsertOptimizationSession = z.infer<typeof insertOptimizationSessionSchema>;

export type CoverLetter = typeof coverLetters.$inferSelect & {
  metadata: {
    filename: string;
    generatedAt: string;
    version: number;
  };
};
export type InsertCoverLetter = z.infer<typeof insertCoverLetterSchema>;

// API Types
export type ResumeDifferences = {
  changes: Array<{
    original: string;
    optimized: string;
    type: string;
    reason: string;
  }>;
};

export const resumeMatchScores = pgTable("resume_match_scores", {
  id: serial("id").primaryKey(),
  optimizedResumeId: integer("optimized_resume_id").notNull(),
  userId: integer("user_id").notNull(),
  originalScores: jsonb("original_scores").notNull().default({
    overall: 0,
    keywords: 0,
    skills: 0,
    experience: 0,
    education: 0,
    personalization: 0,
    aiReadiness: 0
  }),
  optimizedScores: jsonb("optimized_scores").notNull().default({
    overall: 0,
    keywords: 0,
    skills: 0,
    experience: 0,
    education: 0,
    personalization: 0,
    aiReadiness: 0
  }),
  analysis: jsonb("analysis").notNull().default({
    strengths: [],
    gaps: [],
    suggestions: []
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  optimizedResumeIdIdx: index("resume_match_scores_resume_id_idx").on(table.optimizedResumeId),
  userIdIdx: index("resume_match_scores_user_id_idx").on(table.userId),
}));

// Add a table to store intermediate optimization steps
export const optimizationSteps = pgTable("optimization_steps", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  step: text("step").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => ({
  sessionStepIdx: index("optimization_steps_session_step_idx").on(table.sessionId, table.step),
  sessionIdIdx: index("optimization_steps_session_id_idx").on(table.sessionId),
}));

// Add relations for match scores
export const resumeMatchScoresRelations = relations(resumeMatchScores, ({ one }) => ({
  optimizedResume: one(optimizedResumes, {
    fields: [resumeMatchScores.optimizedResumeId],
    references: [optimizedResumes.id],
  }),
}));

// Add schema for match scores
export const insertResumeMatchScoreSchema = createInsertSchema(resumeMatchScores)
  .pick({
    optimizedResumeId: true,
    originalScores: true,
    optimizedScores: true,
    analysis: true,
  });

// Add types for match scores
export type InsertResumeMatchScore = z.infer<typeof insertResumeMatchScoreSchema>;
export type ResumeMatchScore = typeof resumeMatchScores.$inferSelect;