-- Word-bank classification metadata (from grade/MVP word spreadsheets).
-- All columns nullable so existing seed rows remain valid.
ALTER TABLE "words" ADD COLUMN "grade"               INTEGER;
ALTER TABLE "words" ADD COLUMN "app_level"           TEXT;
ALTER TABLE "words" ADD COLUMN "meaning_complexity"  INTEGER;
ALTER TABLE "words" ADD COLUMN "spelling_complexity" INTEGER;
ALTER TABLE "words" ADD COLUMN "morph_complexity"    INTEGER;
ALTER TABLE "words" ADD COLUMN "suggested_exercises" TEXT;
ALTER TABLE "words" ADD COLUMN "spelling_tag"        TEXT;
ALTER TABLE "words" ADD COLUMN "part_of_speech"      TEXT;
ALTER TABLE "words" ADD COLUMN "meaning_type"        TEXT;

-- Grade-scoped lookups
CREATE INDEX "words_grade_idx" ON "words" ("grade");
