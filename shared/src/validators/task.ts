import { z } from 'zod';

/**
 * Canonical task schema — single source of truth for every task-creation path:
 *   - backend `POST /api/admin/content/tasks` (create by hand)
 *   - backend `POST /api/admin/content/generate` (AI pipeline draft)
 *   - content-pipeline `ingest.ts` (xlsx → JSON)
 *   - content-pipeline `assemble.ts` (deterministic generator) via schemaValidator
 *
 * Field set and per-type `options` shapes mirror `backend/prisma/schema.prisma`
 * (models Task / TaskDraft) and `content-pipeline/schemas/task.schema.json`.
 */

// ── Constant enums (exported so callers can build coercion Sets) ─────────────

export const SKILL_CODES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;

export const GRADE_CODES = ['G1', 'G2', 'G3', 'G4'] as const;

export const LESSON_SLOTS = ['WARM_UP', 'CORE', 'MIXED', 'END'] as const;

export const INTERACTION_FORMS = [
  'CHOOSE', 'MATCH', 'FILL', 'ASSEMBLE', 'TRANSCRIBE', 'CORRECT', 'TAP',
] as const;

/** Who produced the task. HUMAN = authored by hand / seed / scripts; AI = LLM generator. */
export const TASK_SOURCES = ['HUMAN', 'AI'] as const;

/** All 42 task types — keep in lockstep with prisma `TaskType` and task-types.json. */
export const TASK_TYPES = [
  'TT_LISTEN_CHOOSE', 'TT_LETTER_FILL', 'TT_IMAGE_WORD_MATCH',
  'TT_COPY_WRITE', 'TT_CHOOSE_CORRECT', 'TT_FILL_WRITE',
  'TT_MISSING_LETTER', 'TT_WORD_SET_DICTATION', 'TT_CAPITAL_PUNCTUATION',
  'TT_SIMPLE_SUFFIX', 'TT_FIND_ERROR', 'TT_SELF_CHECK',
  'TT_TWO_WORD_DICTATION', 'TT_WORD_ENDING', 'TT_SENTENCE_FILL',
  'TT_MIXED_REVIEW', 'TT_WORD_FORM_CHOOSE', 'TT_LONG_VOWEL_FILL',
  'TT_REDUCED_VOWEL', 'TT_SUFFIX_CHOOSE', 'TT_SHORT_SENTENCE_DICTATION',
  'TT_FIX_ERROR', 'TT_CONSONANT_CONFUSION', 'TT_WORD_FORM_FIX',
  'TT_LONG_VOWEL_IN_SENTENCE', 'TT_REDUCED_VOWEL_IN_SENTENCE',
  'TT_CASE_SUFFIX', 'TT_BASIC_COMMA', 'TT_TWO_SENTENCE_DICTATION',
  'TT_FIND_OMITTED_LETTER', 'TT_MIXED_WORD_SET', 'TT_SUFFIX_WRITE',
  'TT_SENTENCE_BOUNDARY', 'TT_MINI_TEXT_DICTATION', 'TT_OWN_WRITING_CORRECTION',
  'TT_LONG_VOWEL_CHALLENGE', 'TT_COMPOUND_SUFFIX', 'TT_MIXED_CHECKPOINT',
  'TT_EXPLAINED_CORRECTION', 'TT_MATCH_PAIRS', 'TT_ASSEMBLE_WORD',
  'TT_TAP_FIND_ERROR',
] as const;

export const skillCodeSchema = z.enum(SKILL_CODES);
export const gradeCodeSchema = z.enum(GRADE_CODES);
export const lessonSlotSchema = z.enum(LESSON_SLOTS);
export const interactionFormSchema = z.enum(INTERACTION_FORMS);
export const taskSourceSchema = z.enum(TASK_SOURCES);
export const taskTypeSchema = z.enum(TASK_TYPES);

export type SkillCodeValue = (typeof SKILL_CODES)[number];
export type TaskTypeValue = (typeof TASK_TYPES)[number];
export type TaskSourceValue = (typeof TASK_SOURCES)[number];

// ── Per-type `options` shapes (1:1 with task.schema.json $defs) ──────────────

export const choiceOptions = z.object({
  choices: z.array(z.object({
    text: z.string(),
    is_correct: z.boolean(),
  })).min(2).max(4),
  audio_trigger: z.boolean(),
});

export const fillOptions = z.object({
  display_text: z.string(),
  blank_position: z.number().int().min(0),
  blank_answer: z.string(),
  context_word: z.string(),
});

export const sentenceFillOptions = z.object({
  sentence_template: z.string(),
  blank_answer: z.string(),
  context_sentence: z.string(),
  hint: z.string().optional(),
});

export const correctionOptions = z.object({
  incorrect_text: z.string(),
  correct_text: z.string(),
});

export const dictationOptions = z.object({
  audio_text: z.string(),
  word_count: z.number().int().min(1),
  expected_answers: z.array(z.string()).min(1),
  allow_partial: z.boolean(),
});

export const miniTextOptions = z.object({
  audio_text: z.string(),
  sentence_count: z.number().int().min(2).max(5),
  expected_answers: z.array(z.string()).min(1),
});

export const selfCheckOptions = z.object({
  original_attempt: z.string(),
  model_answer: z.string(),
  comparison_mode: z.enum(['side_by_side', 'highlight_diff']),
});

export const matchPairsOptions = z.object({
  pairs: z.array(z.object({
    left: z.string(),
    right: z.string(),
    left_image_url: z.string().optional(),
    right_image_url: z.string().optional(),
  })).min(2).max(6),
  image_side: z.enum(["left", "right", "none"]).default("none"),
});

export const assembleWordOptions = z.object({
  tiles: z.array(z.string()).min(2),
  correct_order: z.array(z.string()).min(2),
});

export const tapFindErrorOptions = z.object({
  sentence: z.string(),
  error_word_index: z.number().int().min(0),
  correct_text: z.string(),
});

export const copyOptions = z.object({
  text_to_copy: z.string(),
});

export const visualMemoryOptions = z.object({
  text_to_memorize: z.string(),
  display_seconds: z.number().int().min(2).max(10),
});

/** task_type → the option schema its `options` payload must satisfy. */
export const TASK_TYPE_OPTION_SHAPE: Record<TaskTypeValue, z.ZodType> = {
  // ChoiceOptions
  TT_LISTEN_CHOOSE:         choiceOptions,
  TT_IMAGE_WORD_MATCH:      choiceOptions,
  TT_CHOOSE_CORRECT:        choiceOptions,
  TT_SIMPLE_SUFFIX:         choiceOptions,
  TT_MIXED_REVIEW:          choiceOptions,
  TT_WORD_FORM_CHOOSE:      choiceOptions,
  TT_SUFFIX_CHOOSE:         choiceOptions,
  TT_CONSONANT_CONFUSION:   choiceOptions,
  TT_CASE_SUFFIX:           choiceOptions,
  TT_MIXED_WORD_SET:        choiceOptions,
  TT_LONG_VOWEL_CHALLENGE:  choiceOptions,
  TT_MIXED_CHECKPOINT:      choiceOptions,
  // FillOptions
  TT_LETTER_FILL:           fillOptions,
  TT_FILL_WRITE:            fillOptions,
  TT_MISSING_LETTER:        fillOptions,
  TT_WORD_ENDING:           fillOptions,
  TT_LONG_VOWEL_FILL:       fillOptions,
  TT_REDUCED_VOWEL:         fillOptions,
  TT_SUFFIX_WRITE:          fillOptions,
  TT_COMPOUND_SUFFIX:       fillOptions,
  // CorrectionOptions
  TT_COPY_WRITE:            correctionOptions,
  TT_CAPITAL_PUNCTUATION:   correctionOptions,
  TT_FIND_ERROR:            correctionOptions,
  TT_FIX_ERROR:             correctionOptions,
  TT_WORD_FORM_FIX:         correctionOptions,
  TT_BASIC_COMMA:           correctionOptions,
  TT_FIND_OMITTED_LETTER:   correctionOptions,
  TT_SENTENCE_BOUNDARY:     correctionOptions,
  TT_EXPLAINED_CORRECTION:  correctionOptions,
  // DictationOptions
  TT_WORD_SET_DICTATION:         dictationOptions,
  TT_TWO_WORD_DICTATION:         dictationOptions,
  TT_SHORT_SENTENCE_DICTATION:   dictationOptions,
  TT_TWO_SENTENCE_DICTATION:     dictationOptions,
  // SentenceFillOptions
  TT_SENTENCE_FILL:              sentenceFillOptions,
  TT_LONG_VOWEL_IN_SENTENCE:     sentenceFillOptions,
  TT_REDUCED_VOWEL_IN_SENTENCE:  sentenceFillOptions,
  // MiniTextOptions
  TT_MINI_TEXT_DICTATION:   miniTextOptions,
  // SelfCheckOptions
  TT_SELF_CHECK:            selfCheckOptions,
  TT_OWN_WRITING_CORRECTION: selfCheckOptions,
  // v3 interaction types
  TT_MATCH_PAIRS:           matchPairsOptions,
  TT_ASSEMBLE_WORD:         assembleWordOptions,
  TT_TAP_FIND_ERROR:        tapFindErrorOptions,
};

// ── Canonical field set (shared by Task + TaskDraft) ─────────────────────────

export const taskFieldsSchema = z.object({
  // `id` is set by the DB / route / assembler — optional & possibly empty here.
  id: z.string().optional(),
  task_type: taskTypeSchema,
  prompt_text: z.string().min(1).max(1000),
  correct_answer: z.string(),
  options: z.record(z.string(), z.unknown()).default({}),
  primary_skill: skillCodeSchema,
  secondary_skill: skillCodeSchema.nullable().default(null),
  level_target: z.string().min(1), // free string — matches Task.level_target column
  error_targets: z.array(z.string()).default([]),
  grade_band: z.array(gradeCodeSchema).min(1),
  difficulty: z.number().int().min(1).max(5),
  estimated_time_seconds: z.number().int().positive(),
  lesson_slot_fit: lessonSlotSchema,
  interaction_form: interactionFormSchema.nullable().optional(),
  feedback_text: z.string().default(''),
  feedback_correct: z.string().optional(),
  feedback_wrong: z.string().optional(),
  is_diagnostic: z.boolean().default(false),
  audio_url: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
});

/** Validate `options` against the shape required by `task_type`. */
function refineOptionsByType(
  val: { task_type: TaskTypeValue; options?: Record<string, unknown> },
  ctx: z.RefinementCtx,
): void {
  const shape = TASK_TYPE_OPTION_SHAPE[val.task_type];
  if (!shape) return;
  const opts = val.options ?? {};
  // An empty object is a valid placeholder for unfinished tasks.
  if (typeof opts === 'object' && Object.keys(opts).length === 0) return;
  const res = shape.safeParse(opts);
  if (!res.success) {
    for (const issue of res.error.issues) {
      ctx.addIssue({
        code: 'custom',
        path: ['options', ...issue.path],
        message: issue.message,
      });
    }
  }
}

/** Full task-content schema (base fields + per-type options). */
export const taskContentSchema = taskFieldsSchema.superRefine(refineOptionsByType);

/** Request body for the manual "create by hand" route. */
export const createTaskSchema = taskFieldsSchema
  .extend({
    source: taskSourceSchema.default('HUMAN'),
    initial_text: z.string().optional(),
  })
  .superRefine(refineOptionsByType);

export type TaskFields = z.infer<typeof taskFieldsSchema>;
export type TaskContent = z.infer<typeof taskContentSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/**
 * Validate a task object against the canonical content schema.
 * Returns the `{ ok, errors[] }` shape used by the content-pipeline validators.
 */
export function validateTaskContent(task: unknown): { ok: boolean; errors: string[] } {
  const res = taskContentSchema.safeParse(task);
  if (res.success) return { ok: true, errors: [] };
  return {
    ok: false,
    errors: res.error.issues.map(
      (i) => `${i.path.join('.') || '(root)'}: ${i.message}`,
    ),
  };
}
