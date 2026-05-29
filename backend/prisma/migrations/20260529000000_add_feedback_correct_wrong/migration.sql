-- Add feedback_correct and feedback_wrong to tasks and task_drafts.
-- These store response-specific feedback shown to the learner,
-- complementing the existing feedback_text (rule explanation shown regardless of outcome).

ALTER TABLE "tasks"      ADD COLUMN IF NOT EXISTS "feedback_correct" TEXT;
ALTER TABLE "tasks"      ADD COLUMN IF NOT EXISTS "feedback_wrong"   TEXT;
ALTER TABLE "task_drafts" ADD COLUMN IF NOT EXISTS "feedback_correct" TEXT;
ALTER TABLE "task_drafts" ADD COLUMN IF NOT EXISTS "feedback_wrong"   TEXT;
