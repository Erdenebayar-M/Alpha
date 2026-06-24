-- Derived word-capability columns (from word-bank/derive-capability.ts).
-- Schema only — NO data write. A separate populate script backfills values.
-- Distinct from the legacy skill_tags/error_tags columns, which are untouched.
--
-- Arrays are NOT NULL DEFAULT '{}' (Prisma lists can't be nullable); existing
-- rows therefore get an empty array, not a derived value — this is not a backfill.
ALTER TABLE "words" ADD COLUMN "skills_possible"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "words" ADD COLUMN "errors_possible"     TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "words" ADD COLUMN "task_types_possible" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "words" ADD COLUMN "primary_feature"     TEXT;
ALTER TABLE "words" ADD COLUMN "primary_skill"       TEXT;
ALTER TABLE "words" ADD COLUMN "balarhai_unknown"    BOOLEAN;
