-- CreateEnum
CREATE TYPE "Variant" AS ENUM ('A', 'B');

-- CreateEnum
CREATE TYPE "LevelCode" AS ENUM ('M0', 'M1', 'M2', 'M3', 'M4', 'M5');

-- CreateEnum
CREATE TYPE "SkillCode" AS ENUM ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8');

-- CreateEnum
CREATE TYPE "ErrorCode" AS ENUM ('A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'D3', 'D5', 'E1', 'E2', 'E7', 'G1', 'G2', 'H1', 'H4');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('TT1_CHOICE', 'TT2_FILL', 'TT3_CORRECTION', 'TT4_DICTATION', 'TT5_MINI_TEXT', 'TT6_SELF_CHECK');

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
CREATE TYPE "LessonStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "CheckpointDecision" AS ENUM ('CONTINUE_PLAN', 'NEW_PLAN', 'LEVEL_UP');

-- CreateEnum
CREATE TYPE "CheckpointStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "AttemptContext" AS ENUM ('DIAGNOSTIC', 'LESSON', 'CHECKPOINT');

-- CreateTable
CREATE TABLE "Parent" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Learner" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "daily_minutes" INTEGER NOT NULL DEFAULT 10,
    "variant" "Variant" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerSkillState" (
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerSkillState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
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

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
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
    "review_after_days" INTEGER[],
    "lesson_slot_fit" "LessonSlot" NOT NULL,
    "feedback_text" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiagnosticSession" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "status" "DiagnosticStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "current_phase" "DiagnosticPhase" NOT NULL DEFAULT 'PHASE_A',
    "phase_a_completed" BOOLEAN NOT NULL DEFAULT false,
    "phase_b_completed" BOOLEAN NOT NULL DEFAULT false,
    "weak_skills_detected" TEXT[],
    "result" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "DiagnosticSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "template" "PlanTemplate" NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "priority_skills" TEXT[],
    "target_errors" TEXT[],
    "daily_minutes" INTEGER NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "source" "PlanSource" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
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
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" TEXT NOT NULL,
    "learner_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "task_ids" TEXT[],
    "result" JSONB,
    "decision" "CheckpointDecision",
    "status" "CheckpointStatus" NOT NULL DEFAULT 'PENDING',
    "scheduled_date" DATE NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "error_code" "ErrorCode" NOT NULL,
    "severity" INTEGER NOT NULL,
    "position_in_word" INTEGER,
    "expected_char" TEXT,
    "actual_char" TEXT,
    "context_word" TEXT,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Parent_email_key" ON "Parent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerSkillState_learner_id_key" ON "LearnerSkillState"("learner_id");

-- CreateIndex
CREATE INDEX "Word_grade_band_idx" ON "Word" USING GIN ("grade_band");

-- CreateIndex
CREATE INDEX "Word_skill_tags_idx" ON "Word" USING GIN ("skill_tags");

-- CreateIndex
CREATE INDEX "Task_primary_skill_level_target_idx" ON "Task"("primary_skill", "level_target");

-- CreateIndex
CREATE INDEX "Task_grade_band_idx" ON "Task" USING GIN ("grade_band");

-- CreateIndex
CREATE INDEX "DiagnosticSession_learner_id_status_idx" ON "DiagnosticSession"("learner_id", "status");

-- CreateIndex
CREATE INDEX "Plan_learner_id_status_idx" ON "Plan"("learner_id", "status");

-- CreateIndex
CREATE INDEX "Lesson_plan_id_day_number_idx" ON "Lesson"("plan_id", "day_number");

-- CreateIndex
CREATE INDEX "Lesson_learner_id_scheduled_date_idx" ON "Lesson"("learner_id", "scheduled_date");

-- CreateIndex
CREATE INDEX "Checkpoint_plan_id_status_idx" ON "Checkpoint"("plan_id", "status");

-- CreateIndex
CREATE INDEX "Attempt_learner_id_created_at_idx" ON "Attempt"("learner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Attempt_learner_id_task_id_idx" ON "Attempt"("learner_id", "task_id");

-- CreateIndex
CREATE INDEX "ErrorLog_attempt_id_idx" ON "ErrorLog"("attempt_id");

-- CreateIndex
CREATE INDEX "ErrorLog_error_code_attempt_id_idx" ON "ErrorLog"("error_code", "attempt_id");

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Parent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSkillState" ADD CONSTRAINT "LearnerSkillState_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiagnosticSession" ADD CONSTRAINT "DiagnosticSession_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_learner_id_fkey" FOREIGN KEY ("learner_id") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "Task"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_diagnostic_session_id_fkey" FOREIGN KEY ("diagnostic_session_id") REFERENCES "DiagnosticSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_checkpoint_id_fkey" FOREIGN KEY ("checkpoint_id") REFERENCES "Checkpoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
