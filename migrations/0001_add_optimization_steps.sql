
-- Create the optimization_steps table
CREATE TABLE IF NOT EXISTS "optimization_steps" (
  "id" SERIAL PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "created_at" TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "optimization_steps_session_step_idx" ON "optimization_steps" ("session_id", "step");
CREATE INDEX IF NOT EXISTS "optimization_steps_session_id_idx" ON "optimization_steps" ("session_id");

-- Update metadata schema for optimized_resumes to include optimization log
ALTER TABLE "optimized_resumes" 
ADD COLUMN IF NOT EXISTS "optimization_log" JSONB DEFAULT '{}';
