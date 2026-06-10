-- Drop task_id column and its index from task_drafts
-- Each draft is now identified solely by its primary key (id).

DROP INDEX IF EXISTS "task_drafts_task_id_idx";
ALTER TABLE "task_drafts" DROP COLUMN IF EXISTS "task_id";
