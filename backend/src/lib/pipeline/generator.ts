/**
 * LLM task generator — callable from the backend API.
 * Extracted from content-pipeline/scripts/llmGenerate.ts without readline/file I/O.
 *
 * Supports all 39 TT_ task types by mapping them to the original builder functions.
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { TaskType, SkillCode, LessonSlot } from '../../../generated/prisma';

// ─── Paths ────────────────────────────────────────────────────────────────────

const PROJECT_ROOT  = path.resolve(__dirname, '../../../..');
const PROMPTS_DIR   = path.join(PROJECT_ROOT, 'content-pipeline/scripts/prompts');
const SEED_WORDS_PATH = path.join(PROJECT_ROOT, 'content-pipeline/generated/seed-words.json');

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL        = 'google/gemini-2.5-flash';
const MAX_TOKENS   = 4000;
const TEMPERATURE  = 0.4;
const RETRY_LIMIT  = 2;
const RATE_LIMIT_MS = 1000;

const COST_PER_M_IN  = 0.15;
const COST_PER_M_OUT = 0.6;

// ─── Builder type mapping (new TT_ names → original builder category) ─────────

const BUILDER_TYPE: Record<string, string> = {
  // Choice builders
  TT_LISTEN_CHOOSE:     'TT1_CHOICE',
  TT_IMAGE_WORD_MATCH:  'TT1_CHOICE',
  TT_CHOOSE_CORRECT:    'TT1_CHOICE',
  TT_SIMPLE_SUFFIX:     'TT1_CHOICE',
  TT_WORD_FORM_CHOOSE:  'TT1_CHOICE',
  TT_SUFFIX_CHOOSE:     'TT1_CHOICE',
  TT_CONSONANT_CONFUSION: 'TT1_CHOICE',
  TT_LONG_VOWEL_CHALLENGE: 'TT1_CHOICE',
  TT_CASE_SUFFIX:       'TT1_CHOICE',
  TT_MIXED_REVIEW:      'TT1_CHOICE',
  TT_MIXED_WORD_SET:    'TT1_CHOICE',
  TT_MIXED_CHECKPOINT:  'TT1_CHOICE',
  // Fill builders
  TT_LETTER_FILL:       'TT2_FILL',
  TT_FILL_WRITE:        'TT2_FILL',
  TT_MISSING_LETTER:    'TT2_FILL',
  TT_WORD_ENDING:       'TT2_FILL',
  TT_LONG_VOWEL_FILL:   'TT2_FILL',
  TT_REDUCED_VOWEL:     'TT2_FILL',
  TT_SUFFIX_WRITE:      'TT2_FILL',
  TT_COMPOUND_SUFFIX:   'TT2_FILL',
  // Sentence fill builders (same shape as TT2 but sentence-scoped)
  TT_SENTENCE_FILL:             'TT2_FILL',
  TT_LONG_VOWEL_IN_SENTENCE:    'TT2_FILL',
  TT_REDUCED_VOWEL_IN_SENTENCE: 'TT2_FILL',
  // Correction builders
  TT_COPY_WRITE:            'TT3_CORRECTION',
  TT_CAPITAL_PUNCTUATION:   'TT3_CORRECTION',
  TT_FIND_ERROR:            'TT3_CORRECTION',
  TT_FIX_ERROR:             'TT3_CORRECTION',
  TT_WORD_FORM_FIX:         'TT3_CORRECTION',
  TT_FIND_OMITTED_LETTER:   'TT3_CORRECTION',
  TT_SENTENCE_BOUNDARY:     'TT3_CORRECTION',
  TT_BASIC_COMMA:           'TT3_CORRECTION',
  TT_EXPLAINED_CORRECTION:  'TT3_CORRECTION',
  // Dictation builders
  TT_WORD_SET_DICTATION:        'TT4_DICTATION',
  TT_TWO_WORD_DICTATION:        'TT4_DICTATION',
  TT_SHORT_SENTENCE_DICTATION:  'TT4_DICTATION',
  TT_TWO_SENTENCE_DICTATION:    'TT4_DICTATION',
  // Mini-text
  TT_MINI_TEXT_DICTATION: 'TT5_MINI_TEXT',
  // Self-check
  TT_SELF_CHECK:           'TT6_SELF_CHECK',
  TT_OWN_WRITING_CORRECTION: 'TT6_SELF_CHECK',
};

// ─── Task spec catalogue ──────────────────────────────────────────────────────

export interface TaskSpec {
  id: string;
  task_type: string;
  primary_skill: string;
  secondary_skill: string | null;
  level_target: string;
  error_targets: string[];
  grade_band: string[];
  difficulty: number;
  estimated_time_seconds: number;
  review_after_days: number[];
  lesson_slot_fit: 'WARM_UP' | 'CORE' | 'MIXED' | 'END';
  self_check?: boolean;
  self_check_source?: string;
}

export const TASK_SPECS: TaskSpec[] = [
  // G12
  { id: 'G12-008', task_type: 'TT_WORD_SET_DICTATION',  primary_skill: 'S7', secondary_skill: null, level_target: 'M1', error_targets: ['H1','B1'], grade_band: ['G1','G2'], difficulty: 2, estimated_time_seconds: 45, review_after_days: [1,3,7], lesson_slot_fit: 'END' },
  { id: 'G12-009', task_type: 'TT_CAPITAL_PUNCTUATION', primary_skill: 'S6', secondary_skill: null, level_target: 'M1', error_targets: ['G1','G2'], grade_band: ['G1','G2'], difficulty: 2, estimated_time_seconds: 30, review_after_days: [1,3,7], lesson_slot_fit: 'MIXED' },
  { id: 'G12-010', task_type: 'TT_SIMPLE_SUFFIX',       primary_skill: 'S5', secondary_skill: null, level_target: 'M1', error_targets: ['E1','E2'], grade_band: ['G1','G2'], difficulty: 2, estimated_time_seconds: 20, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G12-012', task_type: 'TT_SELF_CHECK',          primary_skill: 'S8', secondary_skill: null, level_target: 'M1', error_targets: ['H4'],     grade_band: ['G1','G2'], difficulty: 2, estimated_time_seconds: 40, review_after_days: [1,3,7], lesson_slot_fit: 'END', self_check: true, self_check_source: 'G12-011' },
  { id: 'G12-015', task_type: 'TT_FILL_WRITE',          primary_skill: 'S2', secondary_skill: null, level_target: 'M1', error_targets: ['B1'],     grade_band: ['G1','G2'], difficulty: 2, estimated_time_seconds: 25, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  // G24
  { id: 'G24-004', task_type: 'TT_SUFFIX_CHOOSE',              primary_skill: 'S5', secondary_skill: null, level_target: 'M2',   error_targets: ['E2'],      grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 20, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G24-010', task_type: 'TT_LONG_VOWEL_IN_SENTENCE',     primary_skill: 'S3', secondary_skill: null, level_target: 'M2',   error_targets: ['C1','C2'], grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 25, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G24-011', task_type: 'TT_REDUCED_VOWEL',              primary_skill: 'S4', secondary_skill: null, level_target: 'M2',   error_targets: ['C4'],      grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 25, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G24-012', task_type: 'TT_SUFFIX_CHOOSE',              primary_skill: 'S5', secondary_skill: 'S6', level_target: 'M2',   error_targets: ['E2'],      grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 20, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G24-013', task_type: 'TT_CAPITAL_PUNCTUATION',        primary_skill: 'S6', secondary_skill: null, level_target: 'M2',   error_targets: ['G2'],      grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1,3,7], lesson_slot_fit: 'MIXED' },
  { id: 'G24-014', task_type: 'TT_TWO_SENTENCE_DICTATION',     primary_skill: 'S7', secondary_skill: null, level_target: 'M2',   error_targets: ['H1','C1'], grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 60, review_after_days: [1,3,7], lesson_slot_fit: 'END' },
  { id: 'G24-017', task_type: 'TT_SUFFIX_WRITE',               primary_skill: 'S5', secondary_skill: null, level_target: 'M2-M3',error_targets: ['E2','E7'], grade_band: ['G3','G4'], difficulty: 3, estimated_time_seconds: 25, review_after_days: [1,3,7], lesson_slot_fit: 'CORE' },
  { id: 'G24-018', task_type: 'TT_SENTENCE_BOUNDARY',          primary_skill: 'S6', secondary_skill: null, level_target: 'M2',   error_targets: ['G1','G2'], grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 30, review_after_days: [1,3,7], lesson_slot_fit: 'MIXED' },
  { id: 'G24-019', task_type: 'TT_MINI_TEXT_DICTATION',        primary_skill: 'S7', secondary_skill: null, level_target: 'M3',   error_targets: ['C1','C4','E1'], grade_band: ['G3','G4'], difficulty: 4, estimated_time_seconds: 90, review_after_days: [1,3,7], lesson_slot_fit: 'END' },
  { id: 'G24-020', task_type: 'TT_OWN_WRITING_CORRECTION',     primary_skill: 'S8', secondary_skill: null, level_target: 'M2',   error_targets: ['H4'],      grade_band: ['G2','G3'], difficulty: 3, estimated_time_seconds: 40, review_after_days: [1,3,7], lesson_slot_fit: 'END', self_check: true, self_check_source: 'G24-022' },
  { id: 'G24-022', task_type: 'TT_FIX_ERROR',                  primary_skill: 'S5', secondary_skill: null, level_target: 'M3',   error_targets: ['E2','E7'], grade_band: ['G3','G4'], difficulty: 4, estimated_time_seconds: 30, review_after_days: [1,3,7], lesson_slot_fit: 'MIXED' },
  { id: 'G24-024', task_type: 'TT_EXPLAINED_CORRECTION',       primary_skill: 'S8', secondary_skill: null, level_target: 'M3',   error_targets: ['E1','E2','C1'], grade_band: ['G3','G4'], difficulty: 4, estimated_time_seconds: 45, review_after_days: [1,3,7], lesson_slot_fit: 'MIXED' },
];

/** Task IDs that have a prompt template file */
export const AVAILABLE_TASK_IDS: string[] = TASK_SPECS
  .filter((s) => !s.self_check && fs.existsSync(path.join(PROMPTS_DIR, `${s.id}.md`)))
  .map((s) => s.id);

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskRecord = Record<string, unknown>;

export interface GenerateResult {
  passed: TaskRecord[];
  rejected: TaskRecord[];
  cost: number;
}

interface SeedWord {
  id: string;
  word: string;
  grade_band: string;
  skills: string[];
  errors: string[];
  sentence: string;
  distractors: string[];
}

// ─── Seed words ───────────────────────────────────────────────────────────────

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
  const filtered = allWords.filter((w) => {
    const wb = w.grade_band.replace(/G/g, '');
    return gradePrefixes.some((p) => wb.includes(p));
  });
  const pool = filtered.length >= count ? filtered : allWords;
  const arr = [...pool];
  let seed = spec.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
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

// ─── OpenRouter call ──────────────────────────────────────────────────────────

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
  const tokensIn  = usage?.['prompt_tokens']     ?? usage?.['input_tokens']      ?? 0;
  const tokensOut = usage?.['completion_tokens']  ?? usage?.['output_tokens']     ?? 0;
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

function buildBase(
  spec: TaskSpec,
  title: string,
  promptText: string,
  feedbackText: string,
  correctAnswer: string,
): TaskRecord {
  return {
    id: randomUUID(),
    task_type: spec.task_type,
    title,
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
    review_after_days: spec.review_after_days,
    lesson_slot_fit: spec.lesson_slot_fit,
    feedback_text: feedbackText,
  };
}

function buildTT1(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const choices = v['choices'] as Array<{ text: string; is_correct: boolean }>;
  const correctChoice = choices?.find((c) => c.is_correct);
  const correctAnswer = (v['correct_answer'] as string) ?? correctChoice?.text ?? '';
  const sentenceWithBlank = (v['prompt_text'] as string) ?? (v['sentence_with_blank'] as string) ?? '';
  return {
    ...buildBase(spec, 'Зөвийг сонгоно уу', sentenceWithBlank || 'Зөв хэлбэрийг сонгоно уу.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { choices, audio_trigger: false },
  };
}

function buildTT2(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const displayText  = (v['display_text'] as string) ?? '';
  const blankAnswer  = (v['blank_answer'] as string) ?? '';
  const blankPos     = displayText.indexOf('_');
  const blankPosition = blankPos >= 0 ? blankPos : 0;
  const contextWord  = (v['context_word'] as string) ?? (v['context_sentence'] as string) ?? blankAnswer;
  const promptText   = (v['prompt_text'] as string) ?? `Хоосон зайг нөхөөрэй:\n${displayText}`;
  return {
    ...buildBase(spec, 'Дутуу хэсгийг нөхөөрэй', promptText, (v['feedback_text'] as string) ?? '', blankAnswer),
    options: { display_text: displayText, blank_position: blankPosition, blank_answer: blankAnswer, context_word: contextWord },
  };
}

function buildTT3(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const incorrectText = (v['incorrect_text'] as string) ?? '';
  const correctText   = (v['correct_text'] as string) ?? '';
  const explanation   = (v['explanation'] as string) ?? '';
  const feedbackText  = (v['feedback_text'] as string) ?? (explanation ? `${explanation} Зөв хариу: ${correctText}` : `Зөв хариу: ${correctText}`);
  return {
    ...buildBase(spec, 'Алдааг засаарай', (v['prompt_text'] as string) ?? 'Дараах өгүүлбэрт алдаа байна. Зөв засаарай.', feedbackText, correctText),
    initial_text: incorrectText,
    options: { incorrect_text: incorrectText, correct_text: correctText, error_type: (v['error_type'] as string) ?? spec.error_targets[0] ?? '', hint: (v['hint'] as string) ?? feedbackText },
  };
}

function buildTT4(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const words           = v['words'] as string[] | undefined;
  const sentences       = v['sentences'] as string[] | undefined;
  const expectedAnswers = (v['expected_answers'] as string[] | undefined) ?? words ?? sentences ?? [];
  const audioText       = (v['audio_text'] as string) || (sentences?.join(' ') ?? '') || (words?.join(', ') ?? '') || expectedAnswers.join('; ');
  const correctAnswer   = (v['correct_answer'] as string) ?? expectedAnswers.join(';');
  return {
    ...buildBase(spec, 'Сонсоод бичээрэй', (v['prompt_text'] as string) ?? 'Сонссон үгс болон өгүүлбэрийг бичээрэй.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { audio_text: audioText, word_count: expectedAnswers.length, expected_answers: expectedAnswers, allow_partial: true },
  };
}

function buildTT5(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const expectedAnswers = (v['expected_answers'] as string[]) ?? [];
  const audioText       = (v['audio_text'] as string) || expectedAnswers.join(' ');
  const correctAnswer   = (v['correct_answer'] as string) ?? expectedAnswers.join(';');
  return {
    ...buildBase(spec, 'Жижиг эх сонсоод бичээрэй', (v['prompt_text'] as string) ?? 'Сонссон өгүүлбэрүүдийг дарааллаар бичээрэй.', (v['feedback_text'] as string) ?? '', correctAnswer),
    options: { audio_text: audioText, sentence_count: (v['sentence_count'] as number) ?? expectedAnswers.length, expected_answers: expectedAnswers },
  };
}

function buildTT6FromSource(spec: TaskSpec, sourceItems: TaskRecord[]): TaskRecord[] {
  return sourceItems.slice(0, 3).map((item, idx) => {
    const opts = item['options'] as Record<string, unknown> | undefined;
    const incorrectText = (opts?.['incorrect_text'] as string) ?? '';
    const correctText   = (opts?.['correct_text'] as string) ?? (item['correct_answer'] as string) ?? '';
    return {
      ...buildBase(spec, 'Өөрийгөө шалгаарай', 'Өмнөх даалгаврын хариугаа загвартай харьцуул.', (item['feedback_text'] as string) ?? `Зөв хариу: ${correctText}`, correctText),
      options: { original_attempt: incorrectText, model_answer: correctText, comparison_mode: 'side_by_side' },
    };
  });
}

function buildVariant(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const builderType = BUILDER_TYPE[spec.task_type] ?? spec.task_type;
  switch (builderType) {
    case 'TT1_CHOICE':    return buildTT1(spec, v, idx);
    case 'TT2_FILL':      return buildTT2(spec, v, idx);
    case 'TT3_CORRECTION':return buildTT3(spec, v, idx);
    case 'TT4_DICTATION': return buildTT4(spec, v, idx);
    case 'TT5_MINI_TEXT': return buildTT5(spec, v, idx);
    default: throw new Error(`No builder for task_type: ${spec.task_type}`);
  }
}

// ─── Validation ───────────────────────────────────────────────────────────────

const REQUIRED_FIELDS = ['id', 'task_type', 'title', 'prompt_text', 'correct_answer', 'options', 'primary_skill', 'level_target', 'grade_band', 'difficulty', 'estimated_time_seconds', 'lesson_slot_fit', 'feedback_text'];
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

// ─── Self-check builder ───────────────────────────────────────────────────────

function buildSelfCheck(spec: TaskSpec, stage1Dir: string): TaskRecord[] | null {
  const srcId   = spec.self_check_source ?? '';
  const srcPath = path.join(stage1Dir, `${srcId}.json`);
  if (!fs.existsSync(srcPath)) return null;
  const parsed = JSON.parse(fs.readFileSync(srcPath, 'utf8')) as TaskRecord[] | { variants: TaskRecord[] };
  const items  = Array.isArray(parsed) ? parsed : parsed.variants;
  if (!items?.length) return null;
  return buildTT6FromSource(spec, items);
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

  // Self-check tasks: build from existing stage1 output
  if (spec.self_check) {
    const stage1Dir = path.join(PROJECT_ROOT, 'content-pipeline/stage1');
    const built = buildSelfCheck(spec, stage1Dir);
    if (!built || built.length === 0) {
      return { passed: [], rejected: [{ _skip: true, reason: `source "${spec.self_check_source}" not found in stage1/` }], cost: 0 };
    }
    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];
    for (const task of built) {
      const { ok, reasons } = validateVariant(task);
      if (ok) passed.push(task);
      else rejected.push({ ...task, _rejection_reasons: reasons });
    }
    return { passed, rejected, cost: 0 };
  }

  // LLM tasks
  const promptPath = path.join(PROMPTS_DIR, `${spec.id}.md`);
  if (!fs.existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${spec.id}.md`);
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3001',
      'X-Title': 'Mongolian Writing App - Content Generation',
    },
  });

  const allWords  = loadSeedWords();
  const seedWords = sampleSeedWords(allWords, spec, 12);
  const seedList  = formatSeedList(seedWords);
  const userPrompt = fs.readFileSync(promptPath, 'utf8').replace('{seed_list}', seedList);

  let parsed: unknown = null;
  let totalTokensIn = 0;
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
      task = buildVariant(spec, rawVariants[i] as Record<string, unknown>, i);
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
