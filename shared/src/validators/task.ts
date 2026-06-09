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

/** All 43 v3 task types — keep in lockstep with prisma `TaskType`. */
export const TASK_TYPES = [
  // S1 — Үсэг-авиаг зөв таних
  'TT_1_1', 'TT_1_2', 'TT_1_3', 'TT_1_4', 'TT_1_5',
  // S2 — Үгийг зөв бичих
  'TT_2_1', 'TT_2_2', 'TT_2_3', 'TT_2_4', 'TT_2_5', 'TT_2_6',
  // S3 — Урт/богино, балархай эгшиг
  'TT_3_1', 'TT_3_2', 'TT_3_3', 'TT_3_4', 'TT_3_5',
  // S4 — Гийгүүлэгчийг зөв ялгах
  'TT_4_1', 'TT_4_2', 'TT_4_3', 'TT_4_4', 'TT_4_5',
  // S5 — Залгаварыг зөв залгах
  'TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_4', 'TT_5_5', 'TT_5_6', 'TT_5_7',
  // S6 — Өгүүлбэрийн тэмдэглэгээ
  'TT_6_1', 'TT_6_2', 'TT_6_3', 'TT_6_4',
  // S7 — Цээж бичиг
  'TT_7_1', 'TT_7_2', 'TT_7_3', 'TT_7_4', 'TT_7_5', 'TT_7_6', 'TT_7_7',
  // S8 — Алдаагаа зөв таних / засах
  'TT_8_1', 'TT_8_2', 'TT_8_3', 'TT_8_4',
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
  // S1 — choice
  TT_1_1: choiceOptions, TT_1_2: choiceOptions, TT_1_5: choiceOptions,
  // S1 — match_pairs / assemble_word
  TT_1_3: matchPairsOptions, TT_1_4: assembleWordOptions,
  // S2 — choice
  TT_2_3: choiceOptions,
  // S2 — fill
  TT_2_1: fillOptions, TT_2_4: fillOptions,
  // S2 — assemble_word
  TT_2_2: assembleWordOptions,
  // S2 — correction
  TT_2_5: correctionOptions, TT_2_6: correctionOptions,
  // S3 — choice
  TT_3_1: choiceOptions, TT_3_4: choiceOptions,
  // S3 — fill
  TT_3_2: fillOptions,
  // S3 — match_pairs
  TT_3_3: matchPairsOptions,
  // S3 — correction
  TT_3_5: correctionOptions,
  // S4 — choice
  TT_4_1: choiceOptions, TT_4_2: choiceOptions,
  // S4 — fill
  TT_4_3: fillOptions, TT_4_4: fillOptions,
  // S4 — correction
  TT_4_5: correctionOptions,
  // S5 — choice
  TT_5_1: choiceOptions, TT_5_4: choiceOptions, TT_5_6: choiceOptions, TT_5_7: choiceOptions,
  // S5 — sentence_fill
  TT_5_2: sentenceFillOptions,
  // S5 — match_pairs
  TT_5_3: matchPairsOptions,
  // S5 — fill
  TT_5_5: fillOptions,
  // S6 — choice
  TT_6_1: choiceOptions, TT_6_2: choiceOptions,
  // S6 — correction
  TT_6_3: correctionOptions, TT_6_4: correctionOptions,
  // S7 — copy / visual_memory
  TT_7_1: copyOptions, TT_7_2: visualMemoryOptions,
  // S7 — dictation
  TT_7_3: dictationOptions, TT_7_4: dictationOptions,
  // S7 — sentence_fill (cloze dictation)
  TT_7_5: sentenceFillOptions,
  // S7 — mini_text
  TT_7_6: miniTextOptions,
  // S7 — choice
  TT_7_7: choiceOptions,
  // S8 — tap_find_error / correction / choice / self_check
  TT_8_1: tapFindErrorOptions, TT_8_2: correctionOptions,
  TT_8_3: choiceOptions, TT_8_4: selfCheckOptions,
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
