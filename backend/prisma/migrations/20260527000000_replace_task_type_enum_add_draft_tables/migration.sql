-- Replace TaskType enum (TT1-TT6 → 39 blueprint task types with TT_ prefix)
-- Add task_drafts and task_draft_audit_logs tables
-- NOTE: Applied manually via fix_task_type_enum.sql on 2026-05-27

-- This migration is a no-op record: changes were applied directly to the DB.
-- The schema state it records:
--   1. TaskType enum replaced with 39 new values
--   2. task_drafts table (already present via db push)
--   3. task_draft_audit_logs table (already present via db push)
--   4. DraftStage enum (already present via db push)

SELECT 1; -- intentional no-op; schema already matches
