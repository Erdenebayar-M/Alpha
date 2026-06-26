-- Add is_active flag for soft-delete on the words table.
-- Existing rows default to true (no data migration needed).
ALTER TABLE "words" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
