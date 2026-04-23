-- AlterTable
ALTER TABLE "attempts" RENAME CONSTRAINT "Attempt_pkey" TO "attempts_pkey";

-- AlterTable
ALTER TABLE "checkpoints" RENAME CONSTRAINT "Checkpoint_pkey" TO "checkpoints_pkey";

-- AlterTable
ALTER TABLE "diagnostic_sessions" RENAME CONSTRAINT "DiagnosticSession_pkey" TO "diagnostic_sessions_pkey";

-- AlterTable
ALTER TABLE "error_logs" RENAME CONSTRAINT "ErrorLog_pkey" TO "error_logs_pkey";

-- AlterTable
ALTER TABLE "learner_skill_states" RENAME CONSTRAINT "LearnerSkillState_pkey" TO "learner_skill_states_pkey";

-- AlterTable
ALTER TABLE "learners" RENAME CONSTRAINT "Learner_pkey" TO "learners_pkey";

-- AlterTable
ALTER TABLE "lessons" RENAME CONSTRAINT "Lesson_pkey" TO "lessons_pkey";

-- AlterTable
ALTER TABLE "parents" RENAME CONSTRAINT "Parent_pkey" TO "parents_pkey";

-- AlterTable
ALTER TABLE "plans" RENAME CONSTRAINT "Plan_pkey" TO "plans_pkey";

-- AlterTable
ALTER TABLE "tasks" RENAME CONSTRAINT "Task_pkey" TO "tasks_pkey";
ALTER TABLE "tasks" ADD COLUMN "is_diagnostic" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "words" RENAME CONSTRAINT "Word_pkey" TO "words_pkey";
