-- Add is_active flag for soft-delete on the tasks table.
-- Existing rows default to true (no data migration needed).
ALTER TABLE "tasks" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
