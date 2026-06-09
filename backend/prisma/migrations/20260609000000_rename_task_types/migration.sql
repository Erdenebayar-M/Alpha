-- Replace TaskType enum: swap old numeric codes (TT_1_1 … TT_8_4) for
-- the descriptive names used everywhere else in the codebase.
--
-- The tasks/task_drafts tables are cleared first because the old seed
-- content used Phase-1 numeric codes that have no 1:1 mapping to the
-- new descriptive names. Run `npm run seed` after migration to reload.

TRUNCATE TABLE "task_drafts" CASCADE;
TRUNCATE TABLE "tasks" CASCADE;

ALTER TYPE "TaskType" RENAME TO "TaskType_old";

CREATE TYPE "TaskType" AS ENUM (
  'TT_LISTEN_CHOOSE',
  'TT_LETTER_FILL',
  'TT_IMAGE_WORD_MATCH',
  'TT_COPY_WRITE',
  'TT_CHOOSE_CORRECT',
  'TT_FILL_WRITE',
  'TT_MISSING_LETTER',
  'TT_WORD_SET_DICTATION',
  'TT_CAPITAL_PUNCTUATION',
  'TT_SIMPLE_SUFFIX',
  'TT_FIND_ERROR',
  'TT_SELF_CHECK',
  'TT_TWO_WORD_DICTATION',
  'TT_WORD_ENDING',
  'TT_SENTENCE_FILL',
  'TT_MIXED_REVIEW',
  'TT_WORD_FORM_CHOOSE',
  'TT_LONG_VOWEL_FILL',
  'TT_REDUCED_VOWEL',
  'TT_SUFFIX_CHOOSE',
  'TT_SHORT_SENTENCE_DICTATION',
  'TT_FIX_ERROR',
  'TT_CONSONANT_CONFUSION',
  'TT_WORD_FORM_FIX',
  'TT_LONG_VOWEL_IN_SENTENCE',
  'TT_REDUCED_VOWEL_IN_SENTENCE',
  'TT_CASE_SUFFIX',
  'TT_BASIC_COMMA',
  'TT_TWO_SENTENCE_DICTATION',
  'TT_FIND_OMITTED_LETTER',
  'TT_MIXED_WORD_SET',
  'TT_SUFFIX_WRITE',
  'TT_SENTENCE_BOUNDARY',
  'TT_MINI_TEXT_DICTATION',
  'TT_OWN_WRITING_CORRECTION',
  'TT_LONG_VOWEL_CHALLENGE',
  'TT_COMPOUND_SUFFIX',
  'TT_MIXED_CHECKPOINT',
  'TT_EXPLAINED_CORRECTION',
  'TT_MATCH_PAIRS',
  'TT_ASSEMBLE_WORD',
  'TT_TAP_FIND_ERROR'
);

ALTER TABLE "tasks"
  ALTER COLUMN "task_type" TYPE "TaskType"
  USING "task_type"::text::"TaskType";

ALTER TABLE "task_drafts"
  ALTER COLUMN "task_type" TYPE "TaskType"
  USING "task_type"::text::"TaskType";

DROP TYPE "TaskType_old";
