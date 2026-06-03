-- v3 alignment: expand ErrorCode enum, add new TaskType values, add InteractionForm enum

-- ── New ErrorCode values ──────────────────────────────────────────────────────
-- A-group (were missing from enum)
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'A1';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'A2';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'A3';
-- B-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'B2';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'B4';
-- C-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'C3';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'C5';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'C6';
-- D-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'D1';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'D2';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'D4';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'D5';
-- E-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'E3';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'E4';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'E5';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'E6';
-- F-group (new)
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'F1';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'F2';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'F3';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'F4';
-- G-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'G3';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'G4';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'G5';
-- H-group additions
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'H1';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'H2';
ALTER TYPE "ErrorCode" ADD VALUE IF NOT EXISTS 'H3';

-- ── New TaskType values ───────────────────────────────────────────────────────
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'TT_MATCH_PAIRS';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'TT_ASSEMBLE_WORD';
ALTER TYPE "TaskType" ADD VALUE IF NOT EXISTS 'TT_TAP_FIND_ERROR';

-- ── InteractionForm enum ──────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "InteractionForm" AS ENUM (
    'CHOOSE',
    'MATCH',
    'FILL',
    'ASSEMBLE',
    'TRANSCRIBE',
    'CORRECT',
    'TAP'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── interaction_form column on tasks and task_drafts ──────────────────────────
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "interaction_form" "InteractionForm";
ALTER TABLE "task_drafts" ADD COLUMN IF NOT EXISTS "interaction_form" "InteractionForm";
