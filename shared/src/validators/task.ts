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

export const GRADE_LEVEL_RE = /^G[1-4]:M[0-5]$/;
export const gradeLevelSchema = z.string().regex(GRADE_LEVEL_RE, 'Must match G[1-4]:M[0-5] pattern');

export const LESSON_SLOTS = ['WARM_UP', 'CORE', 'MIXED', 'END'] as const;

export const INTERACTION_FORMS = [
  'CHOOSE', 'MATCH', 'FILL', 'ASSEMBLE', 'TRANSCRIBE', 'CORRECT', 'TAP',
] as const;

/** Who produced the task. HUMAN = authored by hand / seed / scripts; AI = LLM generator. */
export const TASK_SOURCES = ['HUMAN', 'AI'] as const;

/** All task types — 37 v3 types from Дасгалын_төрлүүд_каталог_v3.xlsx */
export const TASK_TYPES = [
  'TT_1_1', 'TT_1_2', 'TT_1_3', 'TT_1_4', 'TT_1_5',
  'TT_2_1', 'TT_2_2', 'TT_2_3', 'TT_2_4', 'TT_2_5', 'TT_2_6',
  'TT_3_1', 'TT_3_2', 'TT_3_3', 'TT_3_4', 'TT_3_5',
  'TT_4_1', 'TT_4_2', 'TT_4_3', 'TT_4_4', 'TT_4_5',
  'TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_4', 'TT_5_5', 'TT_5_6', 'TT_5_7',
  'TT_6_1', 'TT_6_2', 'TT_6_3', 'TT_6_4',
  'TT_7_1', 'TT_7_2', 'TT_7_3', 'TT_7_4', 'TT_7_5', 'TT_7_6', 'TT_7_7',
  'TT_8_1', 'TT_8_2', 'TT_8_3', 'TT_8_4',
] as const;

export const skillCodeSchema = z.enum(SKILL_CODES);
export const gradeCodeSchema = z.enum(GRADE_CODES);
export type GradeLevelValue = `G${1|2|3|4}:M${0|1|2|3|4|5}`;
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
  // 37 v3 types
  TT_1_1: choiceOptions,       // Авиа сонсоод үсэг сонгох
  TT_1_2: choiceOptions,       // Зурагт юу зурсныг үсгээр таних
  TT_1_3: matchPairsOptions,   // Үсгүүдийг тохирох зургуудтай холбох
  TT_1_4: assembleWordOptions, // Үг угсрах
  TT_1_5: choiceOptions,       // Төсөөтэй үсгүүдийг ялгах
  TT_2_1: fillOptions,         // Зураг харж дутуу үсэг нөхөх
  TT_2_2: assembleWordOptions, // Үсэг угсарч үг болгох
  TT_2_3: choiceOptions,       // Зөв бичлэгийг сонгох
  TT_2_4: fillOptions,         // Сонсоод үгт дутуу байгаа үсгийг нөхөх
  TT_2_5: correctionOptions,   // Нийлмэл үг зөв бичих
  TT_2_6: correctionOptions,   // Үгийн хэлбэр/бүтэц засах
  TT_3_1: choiceOptions,       // Урт/богино эгшиг сонсоод сонгох
  TT_3_2: fillOptions,         // Балархай эгшиг нөхөх
  TT_3_3: matchPairsOptions,   // Зургуудийг тохирох үгтэй нь холбох
  TT_3_4: choiceOptions,       // Эгшгийн зохицол шалгах
  TT_3_5: correctionOptions,   // Илүү эгшиг олж засах
  TT_4_1: choiceOptions,       // Төстэй сонсогддог гийгүүлэгчүүдийг ялгах
  TT_4_2: choiceOptions,       // Үгийн төгсгөлийн гийгүүлэгч сонгох
  TT_4_3: fillOptions,         // Дараалж орох гийгүүлэгчийг нөхөх
  TT_4_4: fillOptions,         // Орхигдсон гийгүүлэгч нөхөх
  TT_4_5: correctionOptions,   // Илүү гийгүүлэгч олж засах
  TT_5_1: choiceOptions,       // Зөв нөхцлийг сонгох
  TT_5_2: sentenceFillOptions, // Чиглэлийн нөхцөл нөхөх
  TT_5_3: matchPairsOptions,   // Үгийн зөв залгаврыг холбох
  TT_5_4: choiceOptions,       // Үйл үгийн цаг сонгох
  TT_5_5: fillOptions,         // Тохирох залгаврыг нөхөх
  TT_5_6: choiceOptions,       // Олон тоо/харьяалал сонгох
  TT_5_7: choiceOptions,       // Залгаврын зөв бичлэг сонгох
  TT_6_1: choiceOptions,       // Өгүүлбэрийн эхэнд орох зөв хариулт сонгох
  TT_6_2: choiceOptions,       // Өгүүлбэрийн төгсгөлийн тэмдэг сонгох
  TT_6_3: correctionOptions,   // Өгүүлбэрийн төгсгөлийг олох
  TT_6_4: correctionOptions,   // Таслал нэмэх
  TT_7_1: copyOptions,         // Хуулж бичих
  TT_7_2: visualMemoryOptions, // Харж тогтоон бичих
  TT_7_3: dictationOptions,    // Сонсож бичих — үг
  TT_7_4: dictationOptions,    // Сонсож бичих — өгүүлбэр
  TT_7_5: sentenceFillOptions, // Нөхөж бичих цээж бичиг
  TT_7_6: miniTextOptions,     // Сонсож бичих — мини эх
  TT_7_7: choiceOptions,       // Сонсоод зөв хувилбар сонгох
  TT_8_1: tapFindErrorOptions, // Алдаа олж засах (олох)
  TT_8_2: correctionOptions,   // Алдаа олж засах (засах)
  TT_8_3: choiceOptions,       // Зөв/буруу өгүүлбэр сонгох
  TT_8_4: selfCheckOptions,    // Өөрийн хариуг дахин шалгах
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
  grade_levels: z.array(gradeLevelSchema).min(1), // ["G1:M2","G2:M1"] — one cell per grade×level
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

/**
 * Every grade in `gradeBand` must have a valid, matching `grade_levels` cell.
 * Returns [] when consistent, otherwise a list of human-readable error strings.
 * Shared by the Zod `refineGradeLevels` refinement (create/pipeline paths) and
 * the live-task PATCH route, which edits `grade_levels` outside the content schema.
 */
export function validateGradeLevels(gradeBand: string[], gradeLevels: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(gradeLevels) || gradeLevels.length === 0) {
    errors.push('grade_levels must be a non-empty array');
    return errors;
  }
  for (const cell of gradeLevels) {
    if (typeof cell !== 'string' || !GRADE_LEVEL_RE.test(cell)) {
      errors.push(`Invalid grade_levels cell: ${String(cell)} (must match G[1-4]:M[0-5])`);
    }
  }
  const gradePrefixes = new Set(
    gradeLevels.filter((c): c is string => typeof c === 'string').map((c) => c.split(':')[0]),
  );
  for (const g of gradeBand) {
    if (!gradePrefixes.has(g)) {
      errors.push(`Grade ${g} is in grade_band but has no entry in grade_levels`);
    }
  }
  return errors;
}

/** Every grade in grade_band must appear in at least one grade_levels cell. */
function refineGradeLevels(
  val: { grade_band: string[]; grade_levels: string[] },
  ctx: z.RefinementCtx,
): void {
  // The content schema already enforces per-cell format + non-empty via
  // gradeLevelSchema/.min(1); here we only surface the cross-field coverage gap
  // (a grade_band grade with no matching cell) to preserve the original messages.
  const gradePrefixes = new Set(val.grade_levels.map((c) => c.split(':')[0]));
  for (const g of val.grade_band) {
    if (!gradePrefixes.has(g)) {
      ctx.addIssue({
        code: 'custom',
        path: ['grade_levels'],
        message: `Grade ${g} is in grade_band but has no entry in grade_levels`,
      });
    }
  }
}

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

/** Full task-content schema (base fields + per-type options + grade×level consistency). */
export const taskContentSchema = taskFieldsSchema
  .superRefine(refineGradeLevels)
  .superRefine(refineOptionsByType);

/** Request body for the manual "create by hand" route. */
export const createTaskSchema = taskFieldsSchema
  .extend({
    source: taskSourceSchema.default('HUMAN'),
    initial_text: z.string().optional(),
  })
  .superRefine(refineGradeLevels)
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
