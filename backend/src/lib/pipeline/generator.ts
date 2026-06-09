/**
 * LLM task generator — shape-driven, callable from the backend API.
 *
 * Loads all 39 task type definitions from content-pipeline/schemas/task-types.json
 * and builds prompts from generic per-shape templates in
 * content-pipeline/scripts/prompts/shapes/ (7 templates, one per options shape).
 *
 * spec.id == spec.task_type (e.g. "TT_1_1") — used as the task_id key
 * throughout the admin pipeline.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { TaskType, SkillCode, LessonSlot } from '../../../generated/prisma';

// ─── Paths ────────────────────────────────────────────────────────────────────

const PROJECT_ROOT     = path.resolve(__dirname, '../../../..');
const TASK_TYPES_PATH  = path.join(PROJECT_ROOT, 'content-pipeline/schemas/task-types.json');
const SHAPES_DIR       = path.join(PROJECT_ROOT, 'content-pipeline/scripts/prompts/shapes');
const VALIDATED_DIR    = path.join(PROJECT_ROOT, 'content-pipeline/validated');
const STAGE2_DIR       = path.join(PROJECT_ROOT, 'content-pipeline/stage2');
const STAGE1_DIR       = path.join(PROJECT_ROOT, 'content-pipeline/stage1');
const SEED_WORDS_PATH  = path.join(PROJECT_ROOT, 'content-pipeline/generated/seed-words.json');

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL         = 'google/gemini-2.5-flash';
const MAX_TOKENS    = 4000;
const TEMPERATURE   = 0.4;
const RETRY_LIMIT   = 2;
const RATE_LIMIT_MS = 1000;

const COST_PER_M_IN  = 0.15;
const COST_PER_M_OUT = 0.6;

// ─── Shape → template file mapping ───────────────────────────────────────────

const SHAPE_TO_TEMPLATE: Record<string, string> = {
  ChoiceOptions:        'choice.md',
  FillOptions:          'fill.md',
  SentenceFillOptions:  'sentence-fill.md',
  CorrectionOptions:    'correction.md',
  DictationOptions:     'dictation.md',
  MiniTextOptions:      'mini-text.md',
  SelfCheckOptions:     'self-check.md',
  MatchPairsOptions:    'match-pairs.md',
  AssembleWordOptions:  'assemble-word.md',
  TapFindErrorOptions:  'tap-find-error.md',
  CopyOptions:          'copy.md',
  VisualMemoryOptions:  'visual-memory.md',
};

// ─── Task type catalogue ──────────────────────────────────────────────────────

interface TaskTypeDef {
  task_type: string;
  mongolian_name: string;
  grade_band: string[];
  options_shape: string;
  audio_trigger?: boolean;
  default_primary_skill: string;
  default_error_targets: string[];
  default_level: string;
  default_difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: 'WARM_UP' | 'CORE' | 'MIXED' | 'END';
  self_check?: boolean;
  self_check_source_shape?: string;
  generation_hints: string;
}

function loadCatalogue(): TaskTypeDef[] {
  if (!fs.existsSync(TASK_TYPES_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(TASK_TYPES_PATH, 'utf8'));
  return (raw.task_types ?? []) as TaskTypeDef[];
}

// ─── TaskSpec (public API — id == task_type for admin pipeline) ───────────────

export interface TaskSpec {
  id: string;               // == task_type, e.g. "TT_LETTER_FILL"
  task_type: string;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  lesson_slot_fit: 'WARM_UP' | 'CORE' | 'MIXED' | 'END';
  options_shape: string;
  audio_trigger?: boolean;
  self_check?: boolean;
  self_check_source_shape?: string;
  mongolian_name: string;
  generation_hints: string;
}

function defToSpec(def: TaskTypeDef): TaskSpec {
  return {
    id:                      def.task_type,
    task_type:               def.task_type,
    primary_skill:           def.default_primary_skill,
    secondary_skill:         null,
    level_target:            def.default_level,
    error_targets:           def.default_error_targets,
    grade_band:              def.grade_band,
    difficulty:              def.default_difficulty,
    estimated_time_seconds:  def.estimated_time_seconds,
    lesson_slot_fit:         def.lesson_slot_fit,
    options_shape:           def.options_shape,
    audio_trigger:           def.audio_trigger,
    self_check:              def.self_check,
    self_check_source_shape: def.self_check_source_shape,
    mongolian_name:          def.mongolian_name,
    generation_hints:        def.generation_hints,
  };
}

/** All 39 task type specs derived from task-types.json */
export const TASK_SPECS: TaskSpec[] = loadCatalogue().map(defToSpec);

/** Task types available for LLM generation (non-self-check, shape template exists) */
export const AVAILABLE_TASK_IDS: string[] = TASK_SPECS
  .filter((s) => {
    if (s.self_check) return false;
    const tmplFile = SHAPE_TO_TEMPLATE[s.options_shape];
    if (!tmplFile) return false;
    return fs.existsSync(path.join(SHAPES_DIR, tmplFile));
  })
  .map((s) => s.id);

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskRecord = Record<string, unknown>;

export interface GenerateResult {
  passed: TaskRecord[];
  rejected: TaskRecord[];
  cost: number;
}

// ─── Seed words ───────────────────────────────────────────────────────────────

interface SeedWord {
  id: string;
  word: string;
  grade_band: string;
  skills: string[];
  errors: string[];
  sentence: string;
  distractors: string[];
}

let _cachedSeedWords: SeedWord[] | null = null;

function loadSeedWords(): SeedWord[] {
  if (_cachedSeedWords) return _cachedSeedWords;
  if (!fs.existsSync(SEED_WORDS_PATH)) return [];
  const raw = JSON.parse(fs.readFileSync(SEED_WORDS_PATH, 'utf8'));
  _cachedSeedWords = raw.words as SeedWord[];
  return _cachedSeedWords;
}

function sampleSeedWords(allWords: SeedWord[], spec: TaskSpec, count = 12): SeedWord[] {
  const gradePrefixes = spec.grade_band.map((g) => g.replace('G', ''));
  let pool = allWords.filter((w) => {
    const wb = w.grade_band.replace(/G/g, '');
    return gradePrefixes.some((p) => wb.includes(p));
  });
  const skillFiltered = pool.filter((w) => w.skills.includes(spec.primary_skill));
  if (skillFiltered.length >= count) pool = skillFiltered;
  if (pool.length < count) pool = allWords;

  const arr = [...pool];
  let seed = spec.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(seed) / 0x7fffffff;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function formatSeedList(words: SeedWord[]): string {
  return words.map((w) => `- ${w.word} [${w.skills.join(',')}] — «${w.sentence}»`).join('\n');
}

// ─── Few-shot from validated/ ─────────────────────────────────────────────────

function loadFewShotExamples(taskType: string, max = 2): TaskRecord[] {
  const examples: TaskRecord[] = [];
  for (const dir of [VALIDATED_DIR, STAGE2_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        const items: TaskRecord[] = Array.isArray(parsed) ? parsed : ((parsed as { variants?: TaskRecord[] }).variants ?? []);
        for (const item of items) {
          if (item['task_type'] === taskType) {
            examples.push(item);
            if (examples.length >= max) return examples;
          }
        }
      } catch { /* skip malformed */ }
    }
    if (examples.length >= max) break;
  }
  return examples;
}

function formatFewShotBlock(examples: TaskRecord[]): string {
  if (examples.length === 0) return '';
  const snippets = examples.map((ex, i) => {
    const opts = ex['options'];
    return `Жишээ ${i + 1}:\n${JSON.stringify({ ...(opts as object), correct_answer: ex['correct_answer'], feedback_text: ex['feedback_text'] }, null, 2)}`;
  });
  return `Validated жишээнүүд (хэв маягийг дагана уу, агуулгыг хуулахгүй):\n${snippets.join('\n\n')}\n`;
}

// ─── Prompt assembly ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'Чи монгол кирилл үсгээр бичих зөв бичгийн дасгал үүсгэгч.\n\n' +
  'Монгол хэлний зөв бичгийн үндсэн дүрмүүд:\n' +
  '• Эгшгийн зохицол: эрэгтэй (а, о, у) ба эмэгтэй (э, ө, ү) эгшиг нэг үгэнд хольж бичихгүй.\n' +
  '• Урт эгшиг: аа, ии, уу, үү, ее, өө — бичихдээ хосоор бичнэ.\n' +
  '• Балархай эгшиг: э/е зөв ялгаж бичнэ (гэр, дэвтэр, өдөр).\n' +
  '• Залгавар: тийн ялгалын нөхцөлийг эгшгийн зохицолд нийцүүлэн залгана.\n' +
  '• Бага ангийн үг: 1–2р ангид 2–6 үсэгтэй энгийн, өдөр тутмын үгс.\n' +
  '• 3–4р ангид нийлмэл үг, өгүүлбэрийн бүтцийг ашиглаж болно.\n\n' +
  'Гаралтын дүрэм:\n' +
  '• Зөвхөн цэвэр JSON буцаа — markdown fence, тайлбар, мэдэгдэл огт бичихгүй.\n' +
  '• Хариуг { эсвэл [ тэмдэгтээр шууд эхлүүлэх.\n' +
  '• Монгол текст бүхэн зөв кирилл үсгээр бичигдсэн байх.';

function gradeLabel(grade_band: string[]): string {
  return grade_band.some((g) => g === 'G3' || g === 'G4') ? '2-4' : '1-2';
}

function buildUserPrompt(spec: TaskSpec, seedList: string, fewShotBlock: string, count: number): string {
  const tmplFile = SHAPE_TO_TEMPLATE[spec.options_shape];
  if (!tmplFile) throw new Error(`No shape template for ${spec.options_shape}`);
  const tmplPath = path.join(SHAPES_DIR, tmplFile);
  if (!fs.existsSync(tmplPath)) throw new Error(`Shape template not found: ${tmplPath}`);
  const tmpl = fs.readFileSync(tmplPath, 'utf8');

  const subs: Record<string, string> = {
    '{task_type}':        spec.task_type,
    '{mongolian_name}':   spec.mongolian_name,
    '{skill}':            spec.primary_skill,
    '{level}':            spec.level_target,
    '{error_targets}':    spec.error_targets.join(', '),
    '{grade_band}':       spec.grade_band.join(','),
    '{grade_label}':      gradeLabel(spec.grade_band),
    '{generation_hints}': spec.generation_hints,
    '{count}':            String(count),
    '{seed_list}':        seedList,
    '{few_shot_block}':   fewShotBlock,
  };

  let out = tmpl;
  for (const [k, v] of Object.entries(subs)) out = out.split(k).join(v);
  return out;
}

// ─── OpenRouter call ──────────────────────────────────────────────────────────

async function callOpenRouter(
  client: OpenAI,
  userPrompt: string,
  attempt: number,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const retryNote = attempt > 0 ? '\n\nЧУХАЛ: Зөвхөн JSON гарга. { дээр эхэл.' : '';
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt + retryNote },
    ],
  });
  const text = response.choices[0]?.message?.content ?? '';
  const usage = response.usage as Record<string, number> | undefined;
  const tokensIn  = usage?.['prompt_tokens']    ?? usage?.['input_tokens']     ?? 0;
  const tokensOut = usage?.['completion_tokens'] ?? usage?.['output_tokens']    ?? 0;
  return { content: text, tokensIn, tokensOut };
}

function extractJson(raw: string): unknown {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const startBrace   = stripped.indexOf('{');
  const startBracket = stripped.indexOf('[');
  const start = Math.min(
    startBrace   === -1 ? Infinity : startBrace,
    startBracket === -1 ? Infinity : startBracket,
  );
  if (start === Infinity) throw new Error('No JSON object found in response');
  return JSON.parse(stripped.slice(start));
}

// ─── Task builders ────────────────────────────────────────────────────────────

function buildBase(spec: TaskSpec, promptText: string, feedbackText: string, correctAnswer: string): TaskRecord {
  return {
    id: randomUUID(),
    task_type: spec.task_type,
    prompt_text: promptText,
    correct_answer: correctAnswer,
    audio_url: null,
    image_url: null,
    primary_skill: spec.primary_skill,
    secondary_skill: spec.secondary_skill ?? null,
    level_target: spec.level_target,
    error_targets: spec.error_targets,
    grade_band: spec.grade_band,
    difficulty: spec.difficulty,
    estimated_time_seconds: spec.estimated_time_seconds,
    lesson_slot_fit: spec.lesson_slot_fit,
    feedback_text: feedbackText,
  };
}

function buildChoice(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const choices = v['choices'] as Array<{ text: string; is_correct: boolean }>;
  const correctChoice = choices?.find((c) => c.is_correct);
  const correctAnswer = (v['correct_answer'] as string) ?? correctChoice?.text ?? '';
  const promptText = (v['prompt_text'] as string) ?? (v['sentence_with_blank'] as string) ?? 'Зөв хэлбэрийг сонгоно уу.';
  return {
    ...buildBase(spec, promptText, (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { choices, audio_trigger: spec.audio_trigger ?? false },
  };
}

function buildFill(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const displayText  = (v['display_text'] as string) ?? '';
  const blankAnswer  = (v['blank_answer'] as string) ?? '';
  const blankPos     = displayText.indexOf('_');
  const blankPosition = blankPos >= 0 ? blankPos : 0;
  const contextWord  = (v['context_word'] as string) ?? (v['context_sentence'] as string) ?? blankAnswer;
  return {
    ...buildBase(spec, displayText, (v['feedback_text'] as string) ?? '', blankAnswer),
    options: { display_text: displayText, blank_position: blankPosition, blank_answer: blankAnswer, context_word: contextWord },
  };
}

function buildSentenceFill(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const sentenceTemplate = (v['sentence_template'] as string) ?? (v['display_text'] as string) ?? '';
  const blankAnswer      = (v['blank_answer'] as string) ?? '';
  const contextSentence  = (v['context_sentence'] as string) ?? sentenceTemplate.replace('___', blankAnswer);
  return {
    ...buildBase(
      spec,
      sentenceTemplate,
      (v['feedback_text'] as string) ?? '',
      blankAnswer,
    ),
    options: { sentence_template: sentenceTemplate, blank_answer: blankAnswer, context_sentence: contextSentence, hint: (v['hint'] as string) ?? '' },
  };
}

function buildCorrection(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const incorrectText = (v['incorrect_text'] as string) ?? '';
  const correctText   = (v['correct_text'] as string) ?? '';
  const explanation   = (v['explanation'] as string) ?? '';
  const feedbackText  = (v['feedback_text'] as string) ?? (explanation ? `${explanation} Зөв хариу: ${correctText}` : `Зөв хариу: ${correctText}`);
  const opts: Record<string, unknown> = {
    incorrect_text: incorrectText,
    correct_text:   correctText,
  };
  return {
    ...buildBase(spec, (v['prompt_text'] as string) ?? 'Дараах өгүүлбэрт алдаа байна. Зөв засаарай.', feedbackText, correctText),
    initial_text: incorrectText,
    options: opts,
  };
}

function buildDictation(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const words           = v['words'] as string[] | undefined;
  const sentences       = v['sentences'] as string[] | undefined;
  const expectedAnswers = (v['expected_answers'] as string[] | undefined) ?? words ?? sentences ?? [];
  const audioText       = (v['audio_text'] as string) || (sentences?.join(' ') ?? '') || (words?.join(', ') ?? '') || expectedAnswers.join('; ');
  const correctAnswer   = (v['correct_answer'] as string) ?? expectedAnswers.join(';');
  return {
    ...buildBase(spec, (v['prompt_text'] as string) ?? 'Сонссон үгс болон өгүүлбэрийг бичээрэй.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { audio_text: audioText, word_count: expectedAnswers.length, expected_answers: expectedAnswers, allow_partial: true },
  };
}

function buildMiniText(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const expectedAnswers = (v['expected_answers'] as string[]) ?? [];
  const audioText       = (v['audio_text'] as string) || expectedAnswers.join(' ');
  const correctAnswer   = (v['correct_answer'] as string) ?? expectedAnswers.join(';');
  return {
    ...buildBase(spec, (v['prompt_text'] as string) ?? 'Сонссон өгүүлбэрүүдийг дарааллаар бичээрэй.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { audio_text: audioText, sentence_count: (v['sentence_count'] as number) ?? expectedAnswers.length, expected_answers: expectedAnswers },
  };
}

function buildSelfCheckFromSource(spec: TaskSpec, sourceItems: TaskRecord[], max: number): TaskRecord[] {
  return sourceItems.slice(0, max).map((item) => {
    const opts = item['options'] as Record<string, unknown> | undefined;
    const incorrectText = (opts?.['incorrect_text'] as string) ?? '';
    const correctText   = (opts?.['correct_text'] as string) ?? (item['correct_answer'] as string) ?? '';
    return {
      ...buildBase(spec, 'Өмнөх даалгаврын хариугаа загвартай харьцуул.', (item['feedback_text'] as string) ?? `Зөв хариу: ${correctText}`, correctText),
      options: { original_attempt: incorrectText, model_answer: correctText, comparison_mode: 'side_by_side' },
    };
  });
}

function buildMatchPairs(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const pairs = (v['pairs'] as Array<{ left: string; right: string }>) ?? [];
  const correctAnswer = (v['correct_answer'] as string) ?? pairs.map((p) => p.left).join(';');
  return {
    ...buildBase(spec, (v['prompt_text'] as string) ?? 'Тохирох хосуудыг холбоно уу.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { pairs, image_side: (v['image_side'] as string) ?? 'none' },
  };
}

function buildAssembleWord(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const tiles        = (v['tiles'] as string[]) ?? [];
  const correctOrder = (v['correct_order'] as string[]) ?? tiles;
  const correctAnswer = (v['correct_answer'] as string) ?? correctOrder.join('');
  return {
    ...buildBase(spec, (v['prompt_text'] as string) ?? 'Үсгүүдийг зөв дараалалд угсраарай.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { tiles, correct_order: correctOrder },
  };
}

function buildTapFindError(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const sentence       = (v['sentence'] as string) ?? '';
  const errorWordIndex = (v['error_word_index'] as number) ?? 0;
  const correctText    = (v['correct_text'] as string) ?? '';
  return {
    ...buildBase(spec, sentence, (v['feedback_text'] as string) ?? '', correctText),
    options: { sentence, error_word_index: errorWordIndex, correct_text: correctText },
  };
}

function buildCopy(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const textToCopy = (v['text_to_copy'] as string) ?? '';
  return {
    ...buildBase(spec, textToCopy, (v['feedback_text'] as string) ?? '', textToCopy),
    options: { text_to_copy: textToCopy },
  };
}

function buildVisualMemory(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  const textToMemorize = (v['text_to_memorize'] as string) ?? '';
  const displaySeconds = (v['display_seconds'] as number) ?? 4;
  return {
    ...buildBase(spec, textToMemorize, (v['feedback_text'] as string) ?? '', textToMemorize),
    options: { text_to_memorize: textToMemorize, display_seconds: displaySeconds },
  };
}

function buildVariant(spec: TaskSpec, v: Record<string, unknown>): TaskRecord {
  switch (spec.options_shape) {
    case 'ChoiceOptions':       return buildChoice(spec, v);
    case 'FillOptions':         return buildFill(spec, v);
    case 'SentenceFillOptions': return buildSentenceFill(spec, v);
    case 'CorrectionOptions':   return buildCorrection(spec, v);
    case 'DictationOptions':    return buildDictation(spec, v);
    case 'MiniTextOptions':     return buildMiniText(spec, v);
    case 'MatchPairsOptions':   return buildMatchPairs(spec, v);
    case 'AssembleWordOptions':  return buildAssembleWord(spec, v);
    case 'TapFindErrorOptions': return buildTapFindError(spec, v);
    case 'CopyOptions':         return buildCopy(spec, v);
    case 'VisualMemoryOptions':  return buildVisualMemory(spec, v);
    default: throw new Error(`No builder for options_shape: ${spec.options_shape}`);
  }
}

// ─── Self-check source loader ─────────────────────────────────────────────────

const CORRECTION_TYPES = new Set([
  'TT_2_5','TT_2_6','TT_3_5','TT_4_5','TT_6_3','TT_6_4','TT_8_2',
]);

function loadSelfCheckSource(sourceShape: string): TaskRecord[] {
  for (const dir of [VALIDATED_DIR, STAGE2_DIR, STAGE1_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.json') || name.startsWith('_')) continue;
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
        const items: TaskRecord[] = Array.isArray(parsed) ? parsed : ((parsed as { variants?: TaskRecord[] }).variants ?? []);
        const matching = sourceShape === 'CorrectionOptions'
          ? items.filter((it) => CORRECTION_TYPES.has(it['task_type'] as string))
          : items;
        if (matching.length > 0) return matching;
      } catch { /* skip */ }
    }
  }
  return [];
}

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = [
  'id', 'task_type', 'prompt_text', 'correct_answer', 'options',
  'primary_skill', 'level_target', 'grade_band', 'difficulty',
  'estimated_time_seconds', 'lesson_slot_fit', 'feedback_text',
];
const VALID_TASK_TYPES = new Set(Object.values(TaskType));
const VALID_SKILLS     = new Set(Object.values(SkillCode));
const VALID_SLOTS      = new Set(Object.values(LessonSlot));

function validateVariant(task: TaskRecord): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  for (const f of REQUIRED_FIELDS) {
    if (task[f] === undefined || task[f] === null || task[f] === '') {
      reasons.push(`missing required field: ${f}`);
    }
  }
  if (task['task_type'] && !VALID_TASK_TYPES.has(task['task_type'] as TaskType)) {
    reasons.push(`invalid task_type: ${task['task_type']}`);
  }
  if (task['primary_skill'] && !VALID_SKILLS.has(task['primary_skill'] as SkillCode)) {
    reasons.push(`invalid primary_skill: ${task['primary_skill']}`);
  }
  if (task['lesson_slot_fit'] && !VALID_SLOTS.has(task['lesson_slot_fit'] as LessonSlot)) {
    reasons.push(`invalid lesson_slot_fit: ${task['lesson_slot_fit']}`);
  }
  if (typeof task['difficulty'] === 'number' && (task['difficulty'] < 1 || task['difficulty'] > 5)) {
    reasons.push(`difficulty out of range: ${task['difficulty']}`);
  }
  return { ok: reasons.length === 0, reasons };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * COST_PER_M_IN + (tokensOut / 1_000_000) * COST_PER_M_OUT;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── Main exported function ───────────────────────────────────────────────────

export interface GenerateOptions {
  apiKey: string;
  maxItems?: number;
  maxCost?: number;
  runningCost?: { value: number };
}

export async function generateForSpec(spec: TaskSpec, opts: GenerateOptions): Promise<GenerateResult> {
  const { apiKey, maxItems = 3, maxCost = 10 } = opts;
  const runningCost = opts.runningCost ?? { value: 0 };

  // Self-check tasks: build from existing correction tasks, no LLM call
  if (spec.self_check) {
    const sourceItems = loadSelfCheckSource(spec.self_check_source_shape ?? 'CorrectionOptions');
    if (sourceItems.length === 0) {
      return { passed: [], rejected: [{ _skip: true, reason: 'no CorrectionOptions source tasks found in stage1/stage2/validated' }], cost: 0 };
    }
    const built = buildSelfCheckFromSource(spec, sourceItems, maxItems);
    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];
    for (const task of built) {
      const { ok, reasons } = validateVariant(task);
      if (ok) passed.push(task);
      else rejected.push({ ...task, _rejection_reasons: reasons });
    }
    return { passed, rejected, cost: 0 };
  }

  // LLM tasks: build prompt from shape template
  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Mongolian Writing App - Content Generation',
    },
  });

  const allWords    = loadSeedWords();
  const seedWords   = sampleSeedWords(allWords, spec, 12);
  const seedList    = formatSeedList(seedWords);
  const fewShot     = loadFewShotExamples(spec.task_type);
  const fewShotBlock = formatFewShotBlock(fewShot);
  const userPrompt  = buildUserPrompt(spec, seedList, fewShotBlock, maxItems);

  let parsed: unknown = null;
  let totalTokensIn  = 0;
  let totalTokensOut = 0;

  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
    if (attempt > 0) await sleep(RATE_LIMIT_MS);
    try {
      const result = await callOpenRouter(client, userPrompt, attempt);
      totalTokensIn  += result.tokensIn;
      totalTokensOut += result.tokensOut;

      const callCost = computeCost(result.tokensIn, result.tokensOut);
      runningCost.value += callCost;
      if (runningCost.value >= maxCost) {
        throw new Error(`Cost cap reached: $${runningCost.value.toFixed(4)} >= $${maxCost}`);
      }
      parsed = extractJson(result.content);
      break;
    } catch (err) {
      if (attempt === RETRY_LIMIT || (err as Error).message.includes('Cost cap')) throw err;
    }
  }

  await sleep(RATE_LIMIT_MS);
  if (!parsed) return { passed: [], rejected: [], cost: computeCost(totalTokensIn, totalTokensOut) };

  let rawVariants: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawVariants = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const p = parsed as Record<string, unknown>;
    const key = Object.keys(p).find((k) => Array.isArray(p[k]));
    if (key) rawVariants = p[key] as unknown[];
  }
  if (rawVariants.length > maxItems) rawVariants = rawVariants.slice(0, maxItems);

  const passed: TaskRecord[] = [];
  const rejected: TaskRecord[] = [];

  for (let i = 0; i < rawVariants.length; i++) {
    let task: TaskRecord;
    try {
      task = buildVariant(spec, rawVariants[i] as Record<string, unknown>);
    } catch (err) {
      rejected.push({ _raw: rawVariants[i], _error: (err as Error).message } as TaskRecord);
      continue;
    }
    const { ok, reasons } = validateVariant(task);
    if (ok) passed.push(task);
    else rejected.push({ ...task, _rejection_reasons: reasons });
  }

  return { passed, rejected, cost: computeCost(totalTokensIn, totalTokensOut) };
}
