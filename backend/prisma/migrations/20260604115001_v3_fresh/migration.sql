-- CreateEnum
CREATE TYPE "Variant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "LevelCode" AS ENUM ('M0', 'M1', 'M2', 'M3', 'M4', 'M5');

-- CreateEnum
CREATE TYPE "SkillCode" AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8');

-- CreateEnum
CREATE TYPE "ErrorCode" AS ENUM ('A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D1', 'D2', 'D3', 'D4', 'D5', 'E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'F1', 'F2', 'F3', 'F4', 'G1', 'G2', 'G3', 'G4', 'G5', 'H1', 'H2', 'H3', 'H4');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TT_1_1', 'TT_1_2', 'TT_1_3', 'TT_1_4', 'TT_1_5', 'TT_2_1', 'TT_2_2', 'TT_2_3', 'TT_2_4', 'TT_2_5', 'TT_2_6', 'TT_3_1', 'TT_3_2', 'TT_3_3', 'TT_3_4', 'TT_3_5', 'TT_4_1', 'TT_4_2', 'TT_4_3', 'TT_4_4', 'TT_4_5', 'TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_4', 'TT_5_5', 'TT_5_6', 'TT_5_7', 'TT_6_1', 'TT_6_2', 'TT_6_3', 'TT_6_4', 'TT_7_1', 'TT_7_2', 'TT_7_3', 'TT_7_4', 'TT_7_5', 'TT_7_6', 'TT_7_7', 'TT_8_1', 'TT_8_2', 'TT_8_3', 'TT_8_4');

-- CreateEnum
CREATE TYPE "InteractionForm" AS ENUM ('CHOOSE', 'MATCH', 'FILL', 'ASSEMBLE', 'TRANSCRIBE', 'CORRECT', 'TAP');

-- CreateEnum
CREATE TYPE "LessonSlot" AS ENUM ('WARM_UP', 'CORE', 'MIXED', 'END');

-- CreateEnum
CREATE TYPE "Confidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DiagnosticPhase" AS ENUM ('PHASE_A', 'PHASE_B', 'PHASE_C');

-- CreateEnum
CREATE TYPE "DiagnosticStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PlanTemplate" AS ENUM ('BALANCED', 'INTENSIVE', 'STABILIZATION');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'REPLACED');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('DIAGNOSTIC', 'CHECKPOINT', 'MANUAL');

-- CreateEnum
CREATE TYPE "TaskSource" AS ENUM ('HUMAN', 'AI');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CheckpointDecision" AS ENUM ('CONTINUE_PLAN', 'NEW_PLAN', 'LEVEL_UP');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptContext" AS ENUM ('DIAGNOSTIC', 'LESSON', 'CHECKPOINT');

-- CreateEnum
CREATE TYPE "DraftStage" AS ENUM ('STAGE1', 'STAGE2', 'FLAGGED', 'NEEDS_REVISION', 'REJECTED');

-- CreateTable
CREATE TABLE "parents" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learners" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "daily_minutes" INTEGER NOT NULL DEFAULT 10,
    "variant" "Variant" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learner_skill_states" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "general_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s1_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s2_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s3_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s4_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s5_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s6_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s7_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s8_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "s1_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s2_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s3_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s4_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s5_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s6_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s7_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s8_level" "LevelCode" NOT NULL DEFAULT 'M0',
    "s1_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s2_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s3_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s4_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s5_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s6_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s7_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "s8_confidence" "Confidence" NOT NULL DEFAULT 'LOW',
    "top_error_codes" TEXT[],
    "weak_skills" TEXT[],
    "recent_error_codes" TEXT[],
    "recent_task_ids" TEXT[],
    "preferred_session_length" INTEGER NOT NULL DEFAULT 10,
    "current_streak" INTEGER NOT NULL DEFAULT 0,
    "longest_streak" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "learner_skill_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_drafts" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "stage" "DraftStage" NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "audio_url" TEXT,
    "prompt_audio_url" TEXT,
    "image_url" TEXT,
    "primary_skill" "SkillCode" NOT NULL,
    "secondary_skill" "SkillCode",
    "level_target" TEXT NOT NULL,
    "error_targets" TEXT[],
    "grade_band" TEXT[],
    "difficulty" INTEGER NOT NULL,
    "estimated_time_seconds" INTEGER NOT NULL,
    "lesson_slot_fit" "LessonSlot" NOT NULL,
    "interaction_form" "InteractionForm",
    "feedback_text" TEXT NOT NULL,
    "feedback_correct" TEXT,
    "feedback_wrong" TEXT,
    "is_diagnostic" BOOLEAN NOT NULL DEFAULT false,
    "source" "TaskSource" NOT NULL DEFAULT 'HUMAN',
    "ai_review_severity" TEXT,
    "ai_review_issues" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_fix_suggestion" TEXT,
    "ai_reviewed_at" TIMESTAMPTZ(6),
    "reviewer_notes" TEXT,
    "flag_reason" TEXT,
    "revision_reason" TEXT,
    "rejection_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "task_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_draft_audit_logs" (
    "id" TEXT NOT NULL,
    "draft_id" TEXT,
    "task_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "from_stage" "DraftStage" NOT NULL,
    "to_stage" "DraftStage",
    "reason" TEXT,
    "notes" TEXT,
    "snapshot" JSONB NOT NULL,
    "performed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_draft_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "words" (
    "id" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "grade_band" TEXT[],
    "char_count" INTEGER NOT NULL,
    "syllable_count" INTEGER NOT NULL,
    "skill_tags" TEXT[],
    "error_tags" TEXT[],
    "image_ok" BOOLEAN NOT NULL,
    "audio_ok" BOOLEAN NOT NULL,
    "image_prompt" TEXT,
    "audio_text" TEXT,
    "sample_sentence" TEXT,
    "distractors" TEXT[],
    "blank_hint" TEXT,

    CONSTRAINT "words_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "task_type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "prompt_text" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "audio_url" TEXT,
    "image_url" TEXT,
    "primary_skill" "SkillCode" NOT NULL,
    "secondary_skill" "SkillCode",
    "level_target" TEXT NOT NULL,
    "error_targets" TEXT[],
    "grade_band" TEXT[],
    "difficulty" INTEGER NOT NULL,
    "estimated_time_seconds" INTEGER NOT NULL,
    "lesson_slot_fit" "LessonSlot" NOT NULL,
    "interaction_form" "InteractionForm",
    "feedback_text" TEXT NOT NULL,
    "feedback_correct" TEXT,
    "feedback_wrong" TEXT,
    "is_diagnostic" BOOLEAN NOT NULL DEFAULT false,
    "source" "TaskSource" NOT NULL DEFAULT 'HUMAN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_sessions" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_phase" "DiagnosticPhase" NOT NULL DEFAULT 'PHASE_A',
    "phase_a_completed" BOOLEAN NOT NULL DEFAULT false,
    "phase_b_completed" BOOLEAN NOT NULL DEFAULT false,
    "weak_skills_detected" TEXT[],
    "result" JSONB,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "diagnostic_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "template" "PlanTemplate" NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority_skills" TEXT[],
    "target_errors" TEXT[],
    "daily_minutes" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "source" "PlanSource" NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "day_number" INTEGER NOT NULL,
    "primary_skill" "SkillCode" NOT NULL,
    "secondary_skill" "SkillCode",
    "session_length" INTEGER NOT NULL,
    "lesson_goal" TEXT,
    "task_ids" TEXT[],
    "estimated_duration_seconds" INTEGER NOT NULL,
    "status" "LessonStatus" NOT NULL DEFAULT 'PENDING',
    "completed_tasks" INTEGER NOT NULL DEFAULT 0,
    "total_tasks" INTEGER NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "scheduled_date" DATE NOT NULL,
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkpoints" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "task_ids" TEXT[],
    "result" JSONB,
    "decision" "CheckpointDecision",
    "status" "CheckpointStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" DATE NOT NULL,
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "diagnostic_session_id" TEXT,
    "checkpoint_id" TEXT,
    "input_text" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "time_seconds" INTEGER NOT NULL,
    "self_corrected" BOOLEAN NOT NULL DEFAULT false,
    "error_codes" TEXT[],
    "context" "AttemptContext" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_logs" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "error_code" "ErrorCode" NOT NULL,
    "severity" INTEGER NOT NULL,
    "position_in_word" INTEGER,
    "expected_char" TEXT,
    "actual_char" TEXT,
    "context_word" TEXT,

    CONSTRAINT "error_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "parents_email_key" ON "parents"("email");

-- CreateIndex
CREATE UNIQUE INDEX "learner_skill_states_learner_id_key" ON "learner_skill_states"("learner_id");

-- CreateIndex
CREATE INDEX "task_drafts_task_id_idx" ON "task_drafts"("task_id");

-- CreateIndex
CREATE INDEX "task_drafts_stage_idx" ON "task_drafts"("stage");

-- CreateIndex
CREATE INDEX "task_drafts_stage_primary_skill_idx" ON "task_drafts"("stage", "primary_skill");

-- CreateIndex
CREATE INDEX "task_drafts_grade_band_idx" ON "task_drafts" USING GIN ("grade_band");

-- CreateIndex
CREATE INDEX "task_draft_audit_logs_draft_id_idx" ON "task_draft_audit_logs"("draft_id");

-- CreateIndex
CREATE INDEX "task_draft_audit_logs_task_id_idx" ON "task_draft_audit_logs"("task_id");

-- CreateIndex
CREATE INDEX "words_grade_band_idx" ON "words" USING GIN ("grade_band");

-- CreateIndex
CREATE INDEX "words_skill_tags_idx" ON "words" USING GIN ("skill_tags");

-- CreateIndex
CREATE INDEX "tasks_primary_skill_level_target_idx" ON "tasks"("primary_skill", "level_target");

-- CreateIndex
CREATE INDEX "tasks_grade_band_idx" ON "tasks" USING GIN ("grade_band");

-- CreateIndex
CREATE INDEX "diagnostic_sessions_learner_id_status_idx" ON "diagnostic_sessions"("learner_id", "status");

-- CreateIndex
CREATE INDEX "plans_learner_id_status_idx" ON "plans"("learner_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "plans_learner_id_is_active_key" ON "plans"("learner_id", "is_active");

-- CreateIndex
CREATE INDEX "lessons_plan_id_day_number_idx" ON "lessons"("plan_id", "day_number");

-- CreateIndex
CREATE INDEX "lessons_learner_id_scheduled_date_idx" ON "lessons"("learner_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "checkpoints_plan_id_status_idx" ON "checkpoints"("plan_id", "status");

-- CreateIndex
CREATE INDEX "attempts_learner_id_created_at_idx" ON "attempts"("learner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "attempts_learner_id_task_id_idx" ON "attempts"("learner_id", "task_id");

-- CreateIndex
CREATE INDEX "error_logs_attempt_id_idx" ON "error_logs"("attempt_id");

-- CreateIndex
CREATE INDEX "error_logs_error_code_attempt_id_idx" ON "error_logs"("error_code", "attempt_id");

-- AddForeignKey
ALTER TABLE "learners" ADD CONSTRAINT "learners_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "learner_skill_states" ADD CONSTRAINT "learner_skill_states_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_draft_audit_logs" ADD CONSTRAINT "task_draft_audit_logs_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "task_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_sessions" ADD CONSTRAINT "diagnostic_sessions_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkpoints" ADD CONSTRAINT "checkpoints_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "learners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_diagnostic_session_id_fkey" FOREIGN KEY ("diagnostic_session_id") REFERENCES "diagnostic_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "checkpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
