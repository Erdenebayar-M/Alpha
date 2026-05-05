/**
 * LLM task generator — calls Claude via OpenRouter to produce TT1–TT6 task
 * variants, validates them, and writes to stage2/ (pass) or rejected/stage2/ (fail).
 *
 * Run:
 *   npx tsx content-pipeline/scripts/llmGenerate.ts [flags]
 *
 * Flags:
 *   --dry-run            Print plan and exit — no API calls
 *   --only <task_id>     Process only one task ID
 *   --max-items <n>      Keep only first N variants per task (default: 3)
 *   --max-cost <usd>     Hard cost cap in USD (default: 10)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

import { validateTask } from './validators/schemaValidator';
import { validateDistractors } from './validators/distractor';
import { findDuplicates } from './validators/uniqueness';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

// ─── CLI flags ────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const IS_DRY_RUN = argv.includes('--dry-run');
const ONLY_ID: string | null = (() => { const i = argv.indexOf('--only'); return i !== -1 ? argv[i + 1] ?? null : null; })();
const MAX_ITEMS: number = (() => { const i = argv.indexOf('--max-items'); return i !== -1 ? parseInt(argv[i + 1] ?? '3', 10) : 3; })();
const MAX_COST_ARG: number = (() => { const i = argv.indexOf('--max-cost'); return i !== -1 ? parseFloat(argv[i + 1] ?? '10') : 10; })();

// ─── Constants ────────────────────────────────────────────────────────────────

const MODEL = 'google/gemini-2.5-flash';
const MAX_TOKENS = 4000;
const TEMPERATURE = 0.4;
const RETRY_LIMIT = 2;
const RATE_LIMIT_MS = 1000;

// OpenRouter pricing for google/gemini-2.5-flash (per million tokens)
// Verify current rates at https://openrouter.ai/google/gemini-2.5-flash
const COST_PER_M_IN = 0.15;
const COST_PER_M_OUT = 0.60;

const BASE = path.resolve(__dirname, '../..');
const PROMPTS_DIR = path.join(BASE, 'content-pipeline/scripts/prompts');
const STAGE1_DIR = path.join(BASE, 'content-pipeline/stage1');
const STAGE2_DIR = path.join(BASE, 'content-pipeline/stage2');
const REJECTED_DIR = path.join(BASE, 'content-pipeline/rejected/stage2');
const SEED_WORDS_PATH = path.join(BASE, 'content-pipeline/generated/seed-words.json');
const USAGE_PATH = path.join(BASE, 'content-pipeline/stage2/_usage.json');

// ─── Task catalogue ───────────────────────────────────────────────────────────

interface TaskSpec {
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

const TASK_SPECS: TaskSpec[] = [
  // G12 tasks
  {
    id: 'G12-008', task_type: 'TT4_DICTATION',
    primary_skill: 'S7', secondary_skill: null, level_target: 'M1',
    error_targets: ['H1', 'B1'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
  },
  {
    id: 'G12-009', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M1',
    error_targets: ['G1', 'G2'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'MIXED',
  },
  {
    id: 'G12-010', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M1',
    error_targets: ['E1', 'E2'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 20, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G12-012', task_type: 'TT6_SELF_CHECK',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M1',
    error_targets: ['H4'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 40, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
    self_check: true, self_check_source: 'G12-011',
  },
  {
    id: 'G12-015', task_type: 'TT2_FILL',
    primary_skill: 'S2', secondary_skill: null, level_target: 'M1',
    error_targets: ['B1'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 25, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  // G24 tasks
  {
    id: 'G24-004', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M2',
    error_targets: ['E2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 20, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-010', task_type: 'TT2_FILL',
    primary_skill: 'S3', secondary_skill: null, level_target: 'M2',
    error_targets: ['C1', 'C2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 25, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-011', task_type: 'TT2_FILL',
    primary_skill: 'S4', secondary_skill: null, level_target: 'M2',
    error_targets: ['C4'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 25, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-012', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: 'S6', level_target: 'M2',
    error_targets: ['E2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 20, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-013', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M2',
    error_targets: ['G2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'MIXED',
  },
  {
    id: 'G24-014', task_type: 'TT4_DICTATION',
    primary_skill: 'S7', secondary_skill: null, level_target: 'M2',
    error_targets: ['H1', 'C1'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 60, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
  },
  {
    id: 'G24-017', task_type: 'TT2_FILL',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M2-M3',
    error_targets: ['E2', 'E7'], grade_band: ['G3', 'G4'],
    difficulty: 3, estimated_time_seconds: 25, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-018', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M2',
    error_targets: ['G1', 'G2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'MIXED',
  },
  {
    id: 'G24-019', task_type: 'TT5_MINI_TEXT',
    primary_skill: 'S7', secondary_skill: null, level_target: 'M3',
    error_targets: ['C1', 'C4', 'E1'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 90, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
  },
  {
    id: 'G24-020', task_type: 'TT6_SELF_CHECK',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M2',
    error_targets: ['H4'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 40, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
    self_check: true, self_check_source: 'G24-022',
  },
  {
    id: 'G24-022', task_type: 'TT3_CORRECTION',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M3',
    error_targets: ['E2', 'E7'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'MIXED',
  },
  {
    id: 'G24-024', task_type: 'TT3_CORRECTION',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M3',
    error_targets: ['E1', 'E2', 'C1'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'MIXED',
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedWord {
  id: string; word: string; grade_band: string; skills: string[]; errors: string[];
  sentence: string; distractors: string[]; correct_spelling: string;
}

interface UsageRecord {
  task_id: string; calls: number; variants_generated: number;
  passed: number; rejected: number; tokens_in: number; tokens_out: number;
  cost_usd: number;
}

type TaskRecord = Record<string, unknown>;

// ─── Seed word loader ─────────────────────────────────────────────────────────

function loadSeedWords(): SeedWord[] {
  const raw = JSON.parse(fs.readFileSync(SEED_WORDS_PATH, 'utf8'));
  return raw.words as SeedWord[];
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
  return words
    .map((w) => `- ${w.word} [${w.skills.join(',')}] — «${w.sentence}»`)
    .join('\n');
}

// ─── Prompt loader ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT =
  'Чи монгол кирилл үсгээр бичих зөв бичгийн дасгал үүсгэгч.\n' +
  '\n' +
  'Монгол хэлний зөв бичгийн үндсэн дүрмүүд:\n' +
  '• Эгшгийн зохицол: эрэгтэй (а, о, у) ба эмэгтэй (э, ө, ү) эгшиг нэг үгэнд хольж бичихгүй.\n' +
  '• Урт эгшиг: аа, ии, уу, үү, ее, өө — бичихдээ хосоор бичнэ.\n' +
  '• Балархай эгшиг: э/е зөв ялгаж бичнэ (гэр, дэвтэр, өдөр).\n' +
  '• Залгавар: тийн ялгалын нөхцөлийг эгшгийн зохицолд нийцүүлэн залгана.\n' +
  '• Бага ангийн үг: 1–2р ангид 2–6 үсэгтэй энгийн, өдөр тутмын үгс.\n' +
  '• 3–4р ангид нийлмэл үг, өгүүлбэрийн бүтцийг ашиглаж болно.\n' +
  '\n' +
  'Гаралтын дүрэм:\n' +
  '• Зөвхөн цэвэр JSON буцаа — markdown fence, тайлбар, мэдэгдэл огт бичихгүй.\n' +
  '• Хариуг { эсвэл [ тэмдэгтээр шууд эхлүүлэх.\n' +
  '• Монгол текст бүхэн зөв кирилл үсгээр бичигдсэн байх (Traditional Mongolian script бүү ашигла).';

function loadUserPrompt(taskId: string, seedList: string): string {
  const p = path.join(PROMPTS_DIR, `${taskId}.md`);
  if (!fs.existsSync(p)) throw new Error(`Prompt template not found: ${p}`);
  return fs.readFileSync(p, 'utf8').replace('{seed_list}', seedList);
}

// ─── OpenRouter API call ──────────────────────────────────────────────────────

async function callOpenRouter(
  client: OpenAI,
  userPrompt: string,
  attempt: number,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const retryNote =
    attempt > 0
      ? '\n\nЧУХАЛ: Зөвхөн JSON гарга. Бусад текст огт бичихгүй. { дээр эхэл.'
      : '';

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
  // OpenRouter may use prompt_tokens/completion_tokens or input_tokens/output_tokens
  const tokensIn = usage?.['prompt_tokens'] ?? usage?.['input_tokens'] ?? 0;
  const tokensOut = usage?.['completion_tokens'] ?? usage?.['output_tokens'] ?? 0;

  return { content: text, tokensIn, tokensOut };
}

// ─── JSON extractor ───────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
  const startBrace = stripped.indexOf('{');
  const startBracket = stripped.indexOf('[');
  const start = Math.min(
    startBrace === -1 ? Infinity : startBrace,
    startBracket === -1 ? Infinity : startBracket,
  );
  if (start === Infinity) throw new Error('No JSON object found in response');
  return JSON.parse(stripped.slice(start));
}

// ─── Task builders ────────────────────────────────────────────────────────────

function buildBase(
  spec: TaskSpec,
  versionSuffix: string,
  title: string,
  promptText: string,
  feedbackText: string,
  correctAnswer: string,
): TaskRecord {
  return {
    id: `${spec.id}-${versionSuffix}`,
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
  // LLM returns prompt_text containing the sentence with blank
  const sentenceWithBlank = (v['prompt_text'] as string) ?? (v['sentence_with_blank'] as string) ?? '';

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Зөвийг сонгоно уу',
      sentenceWithBlank || 'Зөв хэлбэрийг сонгоно уу.',
      (v['feedback_text'] as string) ?? '',
      correctAnswer,
    ),
    options: { choices, audio_trigger: false },
  };
}

function buildTT2(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const displayText = (v['display_text'] as string) ?? '';
  const blankAnswer = (v['blank_answer'] as string) ?? '';
  // Derive blank_position from the first '_' in display_text
  const blankPos = displayText.indexOf('_');
  const blankPosition = blankPos >= 0 ? blankPos : 0;
  // context_word: LLM may return context_sentence or context_word
  const contextWord =
    (v['context_word'] as string) ??
    (v['context_sentence'] as string) ??
    blankAnswer;

  const promptText = (v['prompt_text'] as string) ?? `Хоосон зайг нөхөөрэй:\n${displayText}`;

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Дутуу хэсгийг нөхөөрэй',
      promptText,
      (v['feedback_text'] as string) ?? '',
      blankAnswer,
    ),
    options: {
      display_text: displayText,
      blank_position: blankPosition,
      blank_answer: blankAnswer,
      context_word: contextWord,
    },
  };
}

function buildTT3(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const incorrectText = (v['incorrect_text'] as string) ?? '';
  const correctText = (v['correct_text'] as string) ?? '';
  const explanation = (v['explanation'] as string) ?? '';
  const feedbackText =
    (v['feedback_text'] as string) ??
    (explanation ? `${explanation} Зөв хариу: ${correctText}` : `Зөв хариу: ${correctText}`);

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Алдааг засаарай',
      (v['prompt_text'] as string) ?? 'Дараах өгүүлбэрт алдаа байна. Зөв засаарай.',
      feedbackText,
      correctText,
    ),
    initial_text: incorrectText,
    options: {
      incorrect_text: incorrectText,
      correct_text: correctText,
      error_type: (v['error_type'] as string) ?? spec.error_targets[0] ?? '',
      hint: (v['hint'] as string) ?? feedbackText,
    },
  };
}

function buildTT4(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const words = v['words'] as string[] | undefined;
  const sentences = v['sentences'] as string[] | undefined;
  const expectedAnswers =
    (v['expected_answers'] as string[] | undefined) ??
    words ??
    sentences ??
    [];
  const audioText =
    (v['audio_text'] as string) ||
    (sentences?.join(' ') ?? '') ||
    (words?.join(', ') ?? '') ||
    expectedAnswers.join('; ');
  const correctAnswer =
    (v['correct_answer'] as string) ?? expectedAnswers.join(';');

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Сонсоод бичээрэй',
      (v['prompt_text'] as string) ?? 'Сонссон үгс болон өгүүлбэрийг бичээрэй.',
      (v['feedback_text'] as string) ?? '',
      correctAnswer,
    ),
    options: {
      audio_text: audioText,
      word_count: expectedAnswers.length,
      expected_answers: expectedAnswers,
      allow_partial: true,
    },
  };
}

function buildTT5(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const expectedAnswers = (v['expected_answers'] as string[]) ?? [];
  const audioText = (v['audio_text'] as string) || expectedAnswers.join(' ');
  const correctAnswer = (v['correct_answer'] as string) ?? expectedAnswers.join(';');

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Жижиг эх сонсоод бичээрэй',
      (v['prompt_text'] as string) ?? 'Сонссон өгүүлбэрүүдийг дарааллаар бичээрэй.',
      (v['feedback_text'] as string) ?? '',
      correctAnswer,
    ),
    options: {
      audio_text: audioText,
      sentence_count: (v['sentence_count'] as number) ?? expectedAnswers.length,
      expected_answers: expectedAnswers,
    },
  };
}

function buildTT6FromSource(spec: TaskSpec, sourceItems: TaskRecord[]): TaskRecord[] {
  return sourceItems.slice(0, 3).map((item, idx) => {
    const opts = item['options'] as Record<string, unknown> | undefined;
    const incorrectText = (opts?.['incorrect_text'] as string) ?? '';
    const correctText =
      (opts?.['correct_text'] as string) ?? (item['correct_answer'] as string) ?? '';

    return {
      ...buildBase(
        spec, `v${idx + 1}`,
        'Өөрийгөө шалгаарай',
        'Өмнөх даалгаврын хариугаа загвартай харьцуул.',
        (item['feedback_text'] as string) ?? `Зөв хариу: ${correctText}`,
        correctText,
      ),
      options: {
        original_attempt: incorrectText,
        model_answer: correctText,
        comparison_mode: 'side_by_side',
      },
    };
  });
}

function buildVariant(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  switch (spec.task_type) {
    case 'TT1_CHOICE':    return buildTT1(spec, v, idx);
    case 'TT2_FILL':      return buildTT2(spec, v, idx);
    case 'TT3_CORRECTION': return buildTT3(spec, v, idx);
    case 'TT4_DICTATION':  return buildTT4(spec, v, idx);
    case 'TT5_MINI_TEXT':  return buildTT5(spec, v, idx);
    default: throw new Error(`Unknown task type: ${spec.task_type}`);
  }
}

// ─── Self-check builder ───────────────────────────────────────────────────────

function buildSelfCheck(spec: TaskSpec): TaskRecord[] | null {
  const srcId = spec.self_check_source ?? '';
  // Try stage1 first, then stage2
  const stage1Path = path.join(STAGE1_DIR, `${srcId}.json`);
  const stage2Path = path.join(STAGE2_DIR, `${srcId}.json`);

  let items: TaskRecord[] | null = null;
  if (fs.existsSync(stage1Path)) {
    items = JSON.parse(fs.readFileSync(stage1Path, 'utf8')) as TaskRecord[];
  } else if (fs.existsSync(stage2Path)) {
    const parsed = JSON.parse(fs.readFileSync(stage2Path, 'utf8')) as
      | TaskRecord[]
      | { variants: TaskRecord[] };
    items = Array.isArray(parsed) ? parsed : parsed.variants;
  }

  if (!items || items.length === 0) return null;
  return buildTT6FromSource(spec, items);
}

// ─── Validators ───────────────────────────────────────────────────────────────

interface ValidationResult { ok: boolean; reasons: string[] }

function runValidators(task: TaskRecord): ValidationResult {
  const reasons: string[] = [];

  const schemaResult = validateTask(task);
  if (!schemaResult.ok) reasons.push(...schemaResult.errors.map((e) => `schema: ${e}`));

  if (task['task_type'] === 'TT1_CHOICE') {
    const distResult = validateDistractors(task as Parameters<typeof validateDistractors>[0]);
    if (!distResult.ok) reasons.push(...distResult.reasons.map((r) => `distractor: ${r}`));
  }

  return { ok: reasons.length === 0, reasons };
}

// ─── Cost helpers ─────────────────────────────────────────────────────────────

function computeCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * COST_PER_M_IN +
         (tokensOut / 1_000_000) * COST_PER_M_OUT;
}

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── User confirmation ────────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase().startsWith('y'));
    });
  });
}

// ─── Reporting ────────────────────────────────────────────────────────────────

function saveUsage(
  records: UsageRecord[],
  failedIds: string[],
  skippedIds: string[],
) {
  const totIn = records.reduce((s, r) => s + r.tokens_in, 0);
  const totOut = records.reduce((s, r) => s + r.tokens_out, 0);
  const totCalls = records.reduce((s, r) => s + r.calls, 0);
  const usage = {
    total_calls: totCalls,
    total_input_tokens: totIn,
    total_output_tokens: totOut,
    estimated_cost_usd: parseFloat(computeCost(totIn, totOut).toFixed(6)),
    model: MODEL,
    provider: 'openrouter',
    failed_task_ids: failedIds,
    skipped_task_ids: skippedIds,
    generated_at: new Date().toISOString(),
  };
  fs.mkdirSync(STAGE2_DIR, { recursive: true });
  fs.writeFileSync(USAGE_PATH, JSON.stringify(usage, null, 2));
  console.log(`\nUsage written → ${USAGE_PATH}`);
}

function printReport(rows: UsageRecord[]) {
  const W = 90;
  console.log('\n' + '─'.repeat(W));
  console.log(
    'task_id'.padEnd(14) +
    'type'.padEnd(8) +
    'calls'.padStart(6) +
    'variants'.padStart(10) +
    'passed'.padStart(8) +
    'rejected'.padStart(10) +
    'tokens'.padStart(9),
  );
  console.log('─'.repeat(W));

  let tCalls = 0, tVariants = 0, tPassed = 0, tRejected = 0, tIn = 0, tOut = 0;
  for (const r of rows) {
    const specRow = TASK_SPECS.find((s) => s.id === r.task_id);
    console.log(
      r.task_id.padEnd(14) +
      (specRow?.task_type.replace('TT', 'TT').slice(0, 7) ?? '').padEnd(8) +
      String(r.calls).padStart(6) +
      String(r.variants_generated).padStart(10) +
      String(r.passed).padStart(8) +
      String(r.rejected).padStart(10) +
      String(r.tokens_in + r.tokens_out).padStart(9),
    );
    tCalls += r.calls; tVariants += r.variants_generated;
    tPassed += r.passed; tRejected += r.rejected;
    tIn += r.tokens_in; tOut += r.tokens_out;
  }

  console.log('─'.repeat(W));
  console.log(
    'TOTAL'.padEnd(14) + ''.padEnd(8) +
    String(tCalls).padStart(6) +
    String(tVariants).padStart(10) +
    String(tPassed).padStart(8) +
    String(tRejected).padStart(10) +
    String(tIn + tOut).padStart(9),
  );
  console.log('─'.repeat(W));
  console.log(`\nEstimated cost: $${computeCost(tIn, tOut).toFixed(4)}`);
  const fullPass = rows.filter((r) => r.passed >= 3).length;
  console.log(`Task IDs with ≥3 passing variants: ${fullPass}/${rows.length}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Filter to only-id if specified
  let specs = ONLY_ID
    ? TASK_SPECS.filter((s) => s.id === ONLY_ID)
    : [...TASK_SPECS];

  if (specs.length === 0) {
    console.error(`ERROR: No task found with id "${ONLY_ID}"`);
    process.exit(1);
  }

  const selfCheckSpecs = specs.filter((s) => s.self_check);
  const llmSpecs = specs.filter((s) => !s.self_check);

  // Cost estimate (rough: 1500 input + 800 output tokens per call)
  const estimatedCalls = llmSpecs.length;
  const estIn = estimatedCalls * 1500;
  const estOut = estimatedCalls * 800;
  const estCost = computeCost(estIn, estOut);
  const hardCap = MAX_COST_ARG;

  // ── Print generation plan ─────────────────────────────────────────────────
  console.log('\n=== GENERATION PLAN ===');
  console.log(`Tasks:             ${specs.map((s) => s.id).join(', ')}`);
  if (selfCheckSpecs.length > 0)
    console.log(`Self-check (no API): ${selfCheckSpecs.map((s) => s.id).join(', ')}`);
  console.log(`API tasks:         ${llmSpecs.length} task ID(s) × ${MAX_ITEMS} variant(s) = ~${llmSpecs.length} call(s)`);
  console.log(`Model:             ${MODEL} via OpenRouter`);
  console.log(`Estimated cost:    $${estCost.toFixed(4)}`);
  console.log(`Hard cap:          $${hardCap.toFixed(2)}`);
  if (IS_DRY_RUN) {
    console.log('\n[--dry-run] No API calls will be made. Exiting.');
    process.exit(0);
  }

  const proceed = await confirm('Proceed? (y/n): ');
  if (!proceed) {
    console.log('Aborted.');
    process.exit(0);
  }

  // ── API key check ─────────────────────────────────────────────────────────
  const apiKey = process.env['OPENROUTER_API_KEY'];
  if (!apiKey) {
    console.error('\nERROR: OPENROUTER_API_KEY not set in .env');
    console.error('Please add: OPENROUTER_API_KEY=sk-or-... to your .env file');
    process.exit(1);
  }

  const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Mongolian Writing App - Content Generation',
    },
  });

  const allWords = loadSeedWords();
  fs.mkdirSync(STAGE2_DIR, { recursive: true });
  fs.mkdirSync(REJECTED_DIR, { recursive: true });

  const report: UsageRecord[] = [];
  const failedIds: string[] = [];
  const skippedIds: string[] = [];
  let runningCost = 0;

  // ── Self-check tasks (no API call) ────────────────────────────────────────
  for (const spec of selfCheckSpecs) {
    console.log(`\n[${spec.id}] Building TT6_SELF_CHECK from ${spec.self_check_source}...`);
    const built = buildSelfCheck(spec);
    if (!built || built.length === 0) {
      console.warn(`  SKIP — source file "${spec.self_check_source}" not found in stage1/ or stage2/`);
      skippedIds.push(spec.id);
      report.push({ task_id: spec.id, calls: 0, variants_generated: 0, passed: 0, rejected: 0, tokens_in: 0, tokens_out: 0, cost_usd: 0 });
      continue;
    }

    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];
    for (const task of built) {
      const result = runValidators(task);
      if (result.ok) {
        passed.push(task);
      } else {
        console.warn(`  REJECT ${task['id']}: ${result.reasons.join('; ')}`);
        rejected.push({ ...task, _rejection_reasons: result.reasons });
      }
    }

    if (passed.length > 0) {
      fs.writeFileSync(
        path.join(STAGE2_DIR, `${spec.id}.json`),
        JSON.stringify(passed, null, 2),
      );
      console.log(`  PASS ${passed.length}/3 → stage2/${spec.id}.json`);
    }
    if (rejected.length > 0) {
      fs.writeFileSync(
        path.join(REJECTED_DIR, `${spec.id}_rejected.json`),
        JSON.stringify(rejected, null, 2),
      );
    }

    report.push({
      task_id: spec.id, calls: 0,
      variants_generated: built.length,
      passed: passed.length, rejected: rejected.length,
      tokens_in: 0, tokens_out: 0, cost_usd: 0,
    });
  }

  // ── LLM tasks ─────────────────────────────────────────────────────────────
  for (const spec of llmSpecs) {
    console.log(`\n[${spec.id}] ${spec.task_type} — generating...`);

    const seedWords = sampleSeedWords(allWords, spec, 12);
    const seedList = formatSeedList(seedWords);

    let parsed: unknown = null;
    let tokensIn = 0;
    let tokensOut = 0;
    let calls = 0;

    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
      if (attempt > 0) {
        console.log(`  Retry ${attempt}/${RETRY_LIMIT}...`);
        await sleep(RATE_LIMIT_MS);
      }

      try {
        const userPrompt = loadUserPrompt(spec.id, seedList);
        const result = await callOpenRouter(client, userPrompt, attempt);
        tokensIn += result.tokensIn;
        tokensOut += result.tokensOut;
        calls++;

        const callCost = computeCost(result.tokensIn, result.tokensOut);
        runningCost += callCost;

        if (runningCost >= hardCap) {
          console.error(
            `\n⚠ COST CAP: $${runningCost.toFixed(4)} ≥ $${hardCap}. Stopping.`,
          );
          saveUsage(report, failedIds, skippedIds);
          printReport(report);
          process.exit(1);
        }

        parsed = extractJson(result.content);
        break;
      } catch (err) {
        console.warn(`  Attempt ${attempt + 1} failed: ${(err as Error).message}`);
        if (attempt === RETRY_LIMIT) {
          console.error(`  SKIP ${spec.id} — all retries exhausted`);
          failedIds.push(spec.id);
        }
      }
    }

    await sleep(RATE_LIMIT_MS);

    if (!parsed) {
      report.push({
        task_id: spec.id, calls, variants_generated: 0,
        passed: 0, rejected: 0, tokens_in: tokensIn, tokens_out: tokensOut,
        cost_usd: computeCost(tokensIn, tokensOut),
      });
      continue;
    }

    // Extract variants array from parsed response
    let rawVariants: unknown[] = [];
    if (Array.isArray(parsed)) {
      rawVariants = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>;
      const key = Object.keys(p).find((k) => Array.isArray(p[k]));
      if (key) rawVariants = p[key] as unknown[];
    }

    // Respect --max-items
    if (rawVariants.length > MAX_ITEMS) rawVariants = rawVariants.slice(0, MAX_ITEMS);

    console.log(`  Received ${rawVariants.length} raw variant(s)`);

    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];

    for (let i = 0; i < rawVariants.length; i++) {
      let task: TaskRecord;
      try {
        task = buildVariant(spec, rawVariants[i] as Record<string, unknown>, i);
      } catch (err) {
        console.warn(`  v${i + 1} build error: ${(err as Error).message}`);
        rejected.push({ _raw: rawVariants[i], _error: (err as Error).message } as TaskRecord);
        continue;
      }

      const vResult = runValidators(task);
      if (vResult.ok) {
        passed.push(task);
        console.log(`  v${i + 1} PASS`);
      } else {
        console.warn(`  v${i + 1} REJECT: ${vResult.reasons.join('; ')}`);
        rejected.push({ ...task, _rejection_reasons: vResult.reasons });
      }
    }

    if (passed.length > 1) {
      const dupes = findDuplicates(passed as Parameters<typeof findDuplicates>[0]);
      if (dupes.length > 0) console.warn(`  Duplicate groups: ${dupes.length}`);
    }

    if (passed.length > 0) {
      fs.writeFileSync(
        path.join(STAGE2_DIR, `${spec.id}.json`),
        JSON.stringify(passed, null, 2),
      );
      console.log(`  ${passed.length}/${rawVariants.length} passed → stage2/${spec.id}.json`);
    }
    if (rejected.length > 0) {
      fs.writeFileSync(
        path.join(REJECTED_DIR, `${spec.id}_rejected.json`),
        JSON.stringify(rejected, null, 2),
      );
    }

    report.push({
      task_id: spec.id, calls,
      variants_generated: rawVariants.length,
      passed: passed.length, rejected: rejected.length,
      tokens_in: tokensIn, tokens_out: tokensOut,
      cost_usd: computeCost(tokensIn, tokensOut),
    });
  }

  saveUsage(report, failedIds, skippedIds);
  printReport(report);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
