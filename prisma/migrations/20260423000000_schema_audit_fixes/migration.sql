-- ─── Fix 17: Rename tables to snake_case ────────────────────────────────────
ALTER TABLE "Parent"           RENAME TO "parents";
ALTER TABLE "Learner"          RENAME TO "learners";
ALTER TABLE "LearnerSkillState" RENAME TO "learner_skill_states";
ALTER TABLE "Word"             RENAME TO "words";
ALTER TABLE "Task"             RENAME TO "tasks";
ALTER TABLE "DiagnosticSession" RENAME TO "diagnostic_sessions";
ALTER TABLE "Plan"             RENAME TO "plans";
ALTER TABLE "Lesson"           RENAME TO "lessons";
ALTER TABLE "Checkpoint"       RENAME TO "checkpoints";
ALTER TABLE "Attempt"          RENAME TO "attempts";
ALTER TABLE "ErrorLog"         RENAME TO "error_logs";

-- Rename indexes to match new table names
ALTER INDEX "Parent_email_key"                          RENAME TO "parents_email_key";
ALTER INDEX "LearnerSkillState_learner_id_key"          RENAME TO "learner_skill_states_learner_id_key";
ALTER INDEX "Word_grade_band_idx"                       RENAME TO "words_grade_band_idx";
ALTER INDEX "Word_skill_tags_idx"                       RENAME TO "words_skill_tags_idx";
ALTER INDEX "Task_primary_skill_level_target_idx"       RENAME TO "tasks_primary_skill_level_target_idx";
ALTER INDEX "Task_grade_band_idx"                       RENAME TO "tasks_grade_band_idx";
ALTER INDEX "DiagnosticSession_learner_id_status_idx"   RENAME TO "diagnostic_sessions_learner_id_status_idx";
ALTER INDEX "Plan_learner_id_status_idx"                RENAME TO "plans_learner_id_status_idx";
ALTER INDEX "Lesson_plan_id_day_number_idx"             RENAME TO "lessons_plan_id_day_number_idx";
ALTER INDEX "Lesson_learner_id_scheduled_date_idx"      RENAME TO "lessons_learner_id_scheduled_date_idx";
ALTER INDEX "Checkpoint_plan_id_status_idx"             RENAME TO "checkpoints_plan_id_status_idx";
ALTER INDEX "Attempt_learner_id_created_at_idx"         RENAME TO "attempts_learner_id_created_at_idx";
ALTER INDEX "Attempt_learner_id_task_id_idx"            RENAME TO "attempts_learner_id_task_id_idx";
ALTER INDEX "ErrorLog_attempt_id_idx"                   RENAME TO "error_logs_attempt_id_idx";
ALTER INDEX "ErrorLog_error_code_attempt_id_idx"        RENAME TO "error_logs_error_code_attempt_id_idx";

-- ─── Fix 18: Convert TIMESTAMP(3) → TIMESTAMPTZ(6) ──────────────────────────
ALTER TABLE "parents"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "learners"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "learner_skill_states"
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(6) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "diagnostic_sessions"
  ALTER COLUMN "started_at"    TYPE TIMESTAMPTZ(6) USING "started_at"    AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at"  TYPE TIMESTAMPTZ(6) USING "completed_at"  AT TIME ZONE 'UTC';

ALTER TABLE "plans"
  ALTER COLUMN "started_at"  TYPE TIMESTAMPTZ(6) USING "started_at"  AT TIME ZONE 'UTC',
  ALTER COLUMN "ended_at"    TYPE TIMESTAMPTZ(6) USING "ended_at"    AT TIME ZONE 'UTC';

ALTER TABLE "lessons"
  ALTER COLUMN "started_at"   TYPE TIMESTAMPTZ(6) USING "started_at"   AT TIME ZONE 'UTC',
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(6) USING "completed_at" AT TIME ZONE 'UTC';

ALTER TABLE "checkpoints"
  ALTER COLUMN "completed_at" TYPE TIMESTAMPTZ(6) USING "completed_at" AT TIME ZONE 'UTC';

ALTER TABLE "attempts"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(6) USING "created_at" AT TIME ZONE 'UTC';

-- ─── Fix 15: Add is_active column to plans ───────────────────────────────────
ALTER TABLE "plans" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

-- ─── Fix 3 & 16: Drop all RESTRICT FKs, re-add with CASCADE / SET NULL ───────

-- learners → parents (Fix 3)
ALTER TABLE "learners" DROP CONSTRAINT "Learner_parent_id_fkey";
ALTER TABLE "learners" ADD CONSTRAINT "learners_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- learner_skill_states → learners
ALTER TABLE "learner_skill_states" DROP CONSTRAINT "LearnerSkillState_learner_id_fkey";
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_learner_id_fkey"
  FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- diagnostic_sessions → learners
ALTER TABLE "diagnostic_sessions" DROP CONSTRAINT "DiagnosticSession_learner_id_fkey";
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_learner_id_fkey"
  FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- plans → learners
ALTER TABLE "plans" DROP CONSTRAINT "Plan_learner_id_fkey";
ALTER TABLE "plans" ADD CONSTRAINT "plans_learner_id_fkey"
  FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- lessons → learners
ALTER TABLE "lessons" DROP CONSTRAINT "Lesson_learner_id_fkey";
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_learner_id_fkey"
  FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- lessons → plans
ALTER TABLE "lessons" DROP CONSTRAINT "Lesson_plan_id_fkey";
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- checkpoints → plans
ALTER TABLE "checkpoints" DROP CONSTRAINT "Checkpoint_plan_id_fkey";
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- attempts → learners
ALTER TABLE "attempts" DROP CONSTRAINT "Attempt_learner_id_fkey";
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_learner_id_fkey"
  FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- attempts → tasks (keep RESTRICT — tasks are standalone content)
ALTER TABLE "attempts" DROP CONSTRAINT "Attempt_task_id_fkey";
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_task_id_fkey"
  FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- attempts → lessons (SET NULL — already correct, rename only)
ALTER TABLE "attempts" DROP CONSTRAINT "Attempt_lesson_id_fkey";
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_lesson_id_fkey"
  FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- attempts → diagnostic_sessions (SET NULL — already correct, rename only)
ALTER TABLE "attempts" DROP CONSTRAINT "Attempt_diagnostic_session_id_fkey";
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_diagnostic_session_id_fkey"
  FOREIGN KEY ("diagnostic_session_id") REFERENCES "diagnostic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- attempts → checkpoints (SET NULL — already correct, rename only)
ALTER TABLE "attempts" DROP CONSTRAINT "Attempt_checkpoint_id_fkey";
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_checkpoint_id_fkey"
  FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- error_logs → attempts
ALTER TABLE "error_logs" DROP CONSTRAINT "ErrorLog_attempt_id_fkey";
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Fix 15: Unique constraint — one active plan per learner ─────────────────
CREATE UNIQUE INDEX "plans_learner_id_is_active_key" ON "plans"("learner_id", "is_active");

-- ─── Fix 4: Grade 1–4 check constraint ───────────────────────────────────────
ALTER TABLE "learners" ADD CONSTRAINT "learner_grade_range" CHECK (grade >= 1 AND grade <= 4);
