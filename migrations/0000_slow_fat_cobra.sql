CREATE TABLE "cover_letters" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"optimized_resume_id" integer NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"version_history" jsonb DEFAULT '[{"content":"","version":"1.0","generatedAt":""}]'::jsonb NOT NULL,
	"highlights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "optimization_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"optimized_resume_id" integer NOT NULL,
	"cover_letter_id" integer,
	"comparisons" jsonb NOT NULL,
	"review_state" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "optimization_sessions_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "optimized_resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"user_id" integer NOT NULL,
	"uploaded_resume_id" integer NOT NULL,
	"optimised_resume" text NOT NULL,
	"original_content" text NOT NULL,
	"job_description" text NOT NULL,
	"job_url" text,
	"job_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"metrics" jsonb DEFAULT '{"before":{"overall":0,"keywords":0,"skills":0,"experience":0,"education":0,"personalization":0,"aiReadiness":0,"confidence":0},"after":{"overall":0,"keywords":0,"skills":0,"experience":0,"education":0,"personalization":0,"aiReadiness":0,"confidence":0}}'::jsonb NOT NULL,
	"analysis" jsonb DEFAULT '{"strengths":[],"improvements":[],"gaps":[],"suggestions":[]}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"contact_info" jsonb DEFAULT '{"fullName":"","email":"","phone":"","address":"","linkedin":""}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_match_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"optimized_resume_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"original_scores" jsonb DEFAULT '{"overall":0,"keywords":0,"skills":0,"experience":0,"education":0,"personalization":0,"aiReadiness":0}'::jsonb NOT NULL,
	"optimized_scores" jsonb DEFAULT '{"overall":0,"keywords":0,"skills":0,"experience":0,"education":0,"personalization":0,"aiReadiness":0}'::jsonb NOT NULL,
	"analysis" jsonb DEFAULT '{"strengths":[],"gaps":[],"suggestions":[]}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resume_version_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"optimized_resume_id" integer NOT NULL,
	"version" integer NOT NULL,
	"user_id" integer NOT NULL,
	"match_score" jsonb DEFAULT '{"overall":0,"keywords":0,"skills":0,"experience":0}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_resumes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text DEFAULT '',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "cover_letter_optimized_resume_id_idx" ON "cover_letters" USING btree ("optimized_resume_id");--> statement-breakpoint
CREATE INDEX "cover_letter_user_id_idx" ON "cover_letters" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "optimization_session_id_idx" ON "optimization_sessions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "optimization_session_resume_id_idx" ON "optimization_sessions" USING btree ("optimized_resume_id");--> statement-breakpoint
CREATE INDEX "optimization_session_user_id_idx" ON "optimization_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_match_scores_resume_id_idx" ON "resume_match_scores" USING btree ("optimized_resume_id");--> statement-breakpoint
CREATE INDEX "resume_match_scores_user_id_idx" ON "resume_match_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "resume_version_scores_idx" ON "resume_version_scores" USING btree ("optimized_resume_id","version");--> statement-breakpoint
CREATE INDEX "resume_version_scores_user_id_idx" ON "resume_version_scores" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploaded_resumes_user_id_idx" ON "uploaded_resumes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "uploaded_resumes_created_at_idx" ON "uploaded_resumes" USING btree ("created_at");