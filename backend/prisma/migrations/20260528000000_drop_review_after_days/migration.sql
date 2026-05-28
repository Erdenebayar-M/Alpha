-- Drop review_after_days column from tasks and task_drafts.
-- Field was never consumed by plan/lesson/diagnostic logic; spaced repetition
-- will be handled by the plan generator (or a future scheduling table), not
-- as a static per-task property.
ALTER TABLE "tasks" DROP COLUMN "review_after_days";
ALTER TABLE "task_drafts" DROP COLUMN "review_after_days";
