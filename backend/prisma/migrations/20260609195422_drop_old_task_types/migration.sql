-- Migration: Remove old 42 descriptive TaskType values, keep only 37 v3 types (TT_1_1–TT_8_4)
-- Postgres cannot drop individual enum values; pattern: cast to text → drop enum → purge old rows → recreate → cast back

-- Step 1: cast affected columns to text
ALTER TABLE "tasks"      ALTER COLUMN "task_type" TYPE text;
ALTER TABLE "task_drafts" ALTER COLUMN "task_type" TYPE text;

-- Step 2: drop the old enum
DROP TYPE "TaskType";

-- Step 3: delete any rows that used old type values (no v3 equivalent exists)
DELETE FROM "tasks" WHERE "task_type" NOT IN (
  'TT_1_1','TT_1_2','TT_1_3','TT_1_4','TT_1_5',
  'TT_2_1','TT_2_2','TT_2_3','TT_2_4','TT_2_5','TT_2_6',
  'TT_3_1','TT_3_2','TT_3_3','TT_3_4','TT_3_5',
  'TT_4_1','TT_4_2','TT_4_3','TT_4_4','TT_4_5',
  'TT_5_1','TT_5_2','TT_5_3','TT_5_4','TT_5_5','TT_5_6','TT_5_7',
  'TT_6_1','TT_6_2','TT_6_3','TT_6_4',
  'TT_7_1','TT_7_2','TT_7_3','TT_7_4','TT_7_5','TT_7_6','TT_7_7',
  'TT_8_1','TT_8_2','TT_8_3','TT_8_4'
);
DELETE FROM "task_drafts" WHERE "task_type" NOT IN (
  'TT_1_1','TT_1_2','TT_1_3','TT_1_4','TT_1_5',
  'TT_2_1','TT_2_2','TT_2_3','TT_2_4','TT_2_5','TT_2_6',
  'TT_3_1','TT_3_2','TT_3_3','TT_3_4','TT_3_5',
  'TT_4_1','TT_4_2','TT_4_3','TT_4_4','TT_4_5',
  'TT_5_1','TT_5_2','TT_5_3','TT_5_4','TT_5_5','TT_5_6','TT_5_7',
  'TT_6_1','TT_6_2','TT_6_3','TT_6_4',
  'TT_7_1','TT_7_2','TT_7_3','TT_7_4','TT_7_5','TT_7_6','TT_7_7',
  'TT_8_1','TT_8_2','TT_8_3','TT_8_4'
);

-- Step 4: recreate enum with only 37 v3 values
CREATE TYPE "TaskType" AS ENUM (
  'TT_1_1','TT_1_2','TT_1_3','TT_1_4','TT_1_5',
  'TT_2_1','TT_2_2','TT_2_3','TT_2_4','TT_2_5','TT_2_6',
  'TT_3_1','TT_3_2','TT_3_3','TT_3_4','TT_3_5',
  'TT_4_1','TT_4_2','TT_4_3','TT_4_4','TT_4_5',
  'TT_5_1','TT_5_2','TT_5_3','TT_5_4','TT_5_5','TT_5_6','TT_5_7',
  'TT_6_1','TT_6_2','TT_6_3','TT_6_4',
  'TT_7_1','TT_7_2','TT_7_3','TT_7_4','TT_7_5','TT_7_6','TT_7_7',
  'TT_8_1','TT_8_2','TT_8_3','TT_8_4'
);

-- Step 5: cast columns back to the new enum
ALTER TABLE "tasks"      ALTER COLUMN "task_type" TYPE "TaskType" USING "task_type"::"TaskType";
ALTER TABLE "task_drafts" ALTER COLUMN "task_type" TYPE "TaskType" USING "task_type"::"TaskType";
