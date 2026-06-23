-- Add grade_levels column to tasks and task_drafts
ALTER TABLE "tasks" ADD COLUMN "grade_levels" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "task_drafts" ADD COLUMN "grade_levels" TEXT[] NOT NULL DEFAULT '{}';

-- Helper function to parse level ranges like "M1-M2" into individual codes
CREATE OR REPLACE FUNCTION _parse_level_codes(level_target TEXT) RETURNS TEXT[] AS $$
DECLARE
  parts TEXT[];
  result TEXT[] := '{}';
  start_idx INTEGER;
  end_idx INTEGER;
  all_levels TEXT[] := ARRAY['M0','M1','M2','M3','M4','M5'];
  i INTEGER;
BEGIN
  IF level_target ~ '^M[0-5]-M[0-5]$' THEN
    parts := string_to_array(level_target, '-');
    start_idx := array_position(all_levels, parts[1]);
    end_idx   := array_position(all_levels, parts[2]);
    IF start_idx IS NOT NULL AND end_idx IS NOT NULL THEN
      FOR i IN start_idx..end_idx LOOP
        result := result || all_levels[i];
      END LOOP;
    END IF;
  ELSIF level_target ~ '^M[0-5]$' THEN
    result := ARRAY[level_target];
  ELSE
    result := ARRAY['M0'];
  END IF;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Backfill tasks: cross-product of grade_band × parsed level codes
UPDATE "tasks"
SET "grade_levels" = COALESCE(
  (SELECT ARRAY_AGG(g || ':' || l)
   FROM unnest("grade_band") AS g,
        unnest(_parse_level_codes("level_target")) AS l),
  '{}'
);

-- Backfill task_drafts
UPDATE "task_drafts"
SET "grade_levels" = COALESCE(
  (SELECT ARRAY_AGG(g || ':' || l)
   FROM unnest("grade_band") AS g,
        unnest(_parse_level_codes("level_target")) AS l),
  '{}'
);

-- Drop helper function
DROP FUNCTION _parse_level_codes(TEXT);

-- GIN indexes for array containment queries
CREATE INDEX "tasks_grade_levels_idx" ON "tasks" USING GIN ("grade_levels");
CREATE INDEX "task_drafts_grade_levels_idx" ON "task_drafts" USING GIN ("grade_levels");
