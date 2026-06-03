-- Add TaskSource enum and source column to tasks + task_drafts.
-- Tracks whether a task was authored by hand (HUMAN) or produced by the
-- LLM generation pipeline (AI). All existing rows default to HUMAN.

DO $$ BEGIN
  CREATE TYPE "TaskSource" AS ENUM ('HUMAN', 'AI');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "tasks"       ADD COLUMN IF NOT EXISTS "source" "TaskSource" NOT NULL DEFAULT 'HUMAN';
ALTER TABLE "task_drafts" ADD COLUMN IF NOT EXISTS "source" "TaskSource" NOT NULL DEFAULT 'HUMAN';
