/**
 * LLM task generator — calls Claude API to produce TT1–TT6 task variants,
 * validates them, and writes to stage2/ (pass) or rejected/stage2/ (fail).
 *
 * Run: npx tsx content-pipeline/scripts/llmGenerate.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import Anthropic from '@anthropic-ai/sdk';
import * as dotenv from 'dotenv';

import { validateTask } from './validators/schemaValidator';
import { validateDistractors } from './validators/distractor';
import { findDuplicates } from './validators/uniqueness';

dotenv.config();

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-5-20250929';
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.4;
const RETRY_LIMIT = 2;
const RATE_LIMIT_MS = 1500;
const COST_HARD_CAP_USD = 10;

// Input cost per million tokens (Sonnet 3.5)
const COST_PER_M_IN = 3.0;
const COST_PER_M_OUT = 15.0;

const BASE = path.resolve(__dirname, '../..');
const PROMPTS_DIR = path.join(BASE, 'content-pipeline/scripts/prompts');
const STAGE2_DIR = path.join(BASE, 'content-pipeline/stage2');
const REJECTED_DIR = path.join(BASE, 'content-pipeline/rejected/stage2');
const STAGE1_DIR = path.join(BASE, 'content-pipeline/stage1');
const SEED_WORDS_PATH = path.join(BASE, 'content-pipeline/generated/seed-words.json');
const USAGE_PATH = path.join(BASE, 'content-pipeline/stage2/_usage.json');

// ─── Task catalogue ──────────────────────────────────────────────────────────

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
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G12-009', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M1',
    error_targets: ['G1', 'G2'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G12-010', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M1',
    error_targets: ['E1', 'E2'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G12-012', task_type: 'TT6_SELF_CHECK',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M1',
    error_targets: ['H4'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
    self_check: true, self_check_source: 'G12-011',
  },
  {
    id: 'G12-015', task_type: 'TT2_FILL',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M1',
    error_targets: ['E1', 'E2'], grade_band: ['G1', 'G2'],
    difficulty: 2, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  // G24 tasks
  {
    id: 'G24-004', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M2',
    error_targets: ['E1', 'E2', 'E7'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-010', task_type: 'TT2_FILL',
    primary_skill: 'S3', secondary_skill: null, level_target: 'M2',
    error_targets: ['C1', 'C2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-011', task_type: 'TT2_FILL',
    primary_skill: 'S4', secondary_skill: null, level_target: 'M2',
    error_targets: ['C4'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-012', task_type: 'TT1_CHOICE',
    primary_skill: 'S5', secondary_skill: 'S6', level_target: 'M2',
    error_targets: ['E2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-013', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M2',
    error_targets: ['G2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-014', task_type: 'TT4_DICTATION',
    primary_skill: 'S7', secondary_skill: null, level_target: 'M2',
    error_targets: ['H1', 'C1'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 60, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-017', task_type: 'TT2_FILL',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M2-M3',
    error_targets: ['E2', 'E7'], grade_band: ['G3', 'G4'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-018', task_type: 'TT3_CORRECTION',
    primary_skill: 'S6', secondary_skill: null, level_target: 'M2',
    error_targets: ['G1', 'G2'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-019', task_type: 'TT5_MINI_TEXT',
    primary_skill: 'S7', secondary_skill: null, level_target: 'M3',
    error_targets: ['C1', 'C4', 'E1'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 120, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-020', task_type: 'TT6_SELF_CHECK',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M2',
    error_targets: ['H4'], grade_band: ['G2', 'G3'],
    difficulty: 3, estimated_time_seconds: 30, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'END',
    self_check: true, self_check_source: 'G24-013',
  },
  {
    id: 'G24-022', task_type: 'TT3_CORRECTION',
    primary_skill: 'S5', secondary_skill: null, level_target: 'M3',
    error_targets: ['E2', 'E7'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
  {
    id: 'G24-024', task_type: 'TT3_CORRECTION',
    primary_skill: 'S8', secondary_skill: null, level_target: 'M3',
    error_targets: ['E1', 'E2', 'C1'], grade_band: ['G3', 'G4'],
    difficulty: 4, estimated_time_seconds: 45, review_after_days: [1, 3, 7],
    lesson_slot_fit: 'CORE',
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

interface SeedWord {
  id: string; word: string; grade_band: string; skills: string[]; errors: string[];
  sentence: string; distractors: string[]; correct_spelling: string;
}

interface UsageRecord {
  task_id: string; calls: number; variants_generated: number;
  passed: number; rejected: number; tokens_in: number; tokens_out: number;
  cost_usd: number;
}

interface ReportRow extends UsageRecord {}

// ─── Seed word loader ────────────────────────────────────────────────────────

function loadSeedWords(): SeedWord[] {
  const raw = JSON.parse(fs.readFileSync(SEED_WORDS_PATH, 'utf8'));
  return raw.words as SeedWord[];
}

function sampleSeedWords(
  allWords: SeedWord[],
  spec: TaskSpec,
  count = 10,
): SeedWord[] {
  // Filter by grade band match
  const gradePrefixes = spec.grade_band.map((g) => g.replace('G', ''));
  const filtered = allWords.filter((w) => {
    const wb = w.grade_band.replace('G', '');
    return gradePrefixes.some((p) => wb.includes(p));
  });

  const pool = filtered.length >= count ? filtered : allWords;
  // Shuffle deterministically using task ID as seed (simple Fisher-Yates variant)
  const arr = [...pool];
  let seed = spec.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return Math.abs(seed) / 0x7fffffff; };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}

function formatSeedList(words: SeedWord[]): string {
  return words.map((w) => `- ${w.word} (${w.correct_spelling}) [${w.skills.join(',')}] — «${w.sentence}»`).join('\n');
}

// ─── Prompt loader ───────────────────────────────────────────────────────────

function loadPrompt(taskId: string, seedList: string): string {
  const p = path.join(PROMPTS_DIR, `${taskId}.md`);
  if (!fs.existsSync(p)) throw new Error(`Prompt template not found: ${p}`);
  return fs.readFileSync(p, 'utf8').replace('{seed_list}', seedList);
}

// ─── API caller ──────────────────────────────────────────────────────────────

async function callClaude(
  client: Anthropic,
  prompt: string,
  attempt: number,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const systemAddendum = attempt > 0
    ? '\n\nЧУХАЛ: JSON-ЫГ ЯНДАН ГАРГА. Бусад текст, тайлбар огт бичихгүй.'
    : '';

  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    temperature: TEMPERATURE,
    messages: [{ role: 'user', content: prompt + systemAddendum }],
  });

  const content = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  return {
    content,
    tokensIn: msg.usage.input_tokens,
    tokensOut: msg.usage.output_tokens,
  };
}

// ─── JSON extractor ──────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  // Strip markdown code fences if present
  const stripped = raw.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
  // Find first { or [
  const start = Math.min(
    stripped.indexOf('{') === -1 ? Infinity : stripped.indexOf('{'),
    stripped.indexOf('[') === -1 ? Infinity : stripped.indexOf('['),
  );
  if (start === Infinity) throw new Error('No JSON object found in response');
  return JSON.parse(stripped.slice(start));
}

// ─── Task builders ───────────────────────────────────────────────────────────

type TaskRecord = Record<string, unknown>;

function buildBase(spec: TaskSpec, versionSuffix: string, title: string, promptText: string, feedbackText: string, correctAnswer: string): TaskRecord {
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
  const correctChoice = choices.find((c) => c.is_correct);
  const sentenceWithBlank = (v['sentence_with_blank'] as string) ?? '';
  const correctAnswer = (v['correct_answer'] as string) ?? correctChoice?.text ?? '';

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Зөвийг сонгоно уу',
      sentenceWithBlank ? `Доорх өгүүлбэрт алийг нь бичих вэ?\n${sentenceWithBlank}` : 'Зөв хэлбэрийг сонгоно уу.',
      (v['feedback_text'] as string) ?? '',
      correctAnswer,
    ),
    options: { choices, audio_trigger: false },
  };
}

function buildTT2(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Дутуу үсгийг нөхөөрэй',
      `Доорх өгүүлбэрт дутуу хэсгийг нөхөөрэй:\n${v['display_text'] as string}`,
      (v['feedback_text'] as string) ?? '',
      (v['correct_answer'] as string) ?? (v['blank_answer'] as string) ?? '',
    ),
    options: {
      display_text: v['display_text'] as string,
      blank_position: (v['blank_position'] as number) ?? 0,
      blank_answer: v['blank_answer'] as string,
      context_word: v['context_word'] as string,
    },
  };
}

function buildTT3(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const correctText = v['correct_text'] as string;
  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Алдааг засаарай',
      'Дараах өгүүлбэрт алдаа байна. Зөв засаарай.',
      (v['feedback_text'] as string) ?? `Зөв хариу: ${correctText}`,
      correctText,
    ),
    options: {
      incorrect_text: v['incorrect_text'] as string,
      correct_text: correctText,
      error_type: (v['error_type'] as string) ?? spec.error_targets[0],
      hint: (v['hint'] as string) ?? (v['feedback_text'] as string) ?? '',
    },
  };
}

function buildTT4(spec: TaskSpec, v: Record<string, unknown>, idx: number): TaskRecord {
  const expectedAnswers = (v['expected_answers'] as string[]) ??
    (v['words'] as string[]) ??
    (v['sentences'] as string[]) ?? [];
  const audioText = (v['audio_text'] as string) ??
    (v['sentences'] ? (v['sentences'] as string[]).join(' ') : '') ??
    (v['words'] ? (v['words'] as string[]).join(', ') : '');
  const correctAnswer = (v['correct_answer'] as string) ?? expectedAnswers.join(';');

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Сонсоод бичээрэй',
      'Сонссон үгс болон өгүүлбэрийг бичээрэй.',
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
  const audioText = (v['audio_text'] as string) ?? expectedAnswers.join(' ');
  const correctAnswer = (v['correct_answer'] as string) ?? expectedAnswers.join(';');

  return {
    ...buildBase(
      spec, `v${idx + 1}`,
      'Жижиг эх сонсоод бичээрэй',
      'Сонссон өгүүлбэрүүдийг дарааллаар бичээрэй.',
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
    const opts = item['options'] as Record<string, unknown>;
    const incorrectText = (opts['incorrect_text'] as string) ?? '';
    const correctText = (opts['correct_text'] as string) ?? (item['correct_answer'] as string) ?? '';

    return {
      ...buildBase(
        spec, `v${idx + 1}`,
        'Өөрийгөө шалгаарай',
        'Өмнөх даалгаврын хариугаа моделтой харьцуул.',
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
    case 'TT1_CHOICE': return buildTT1(spec, v, idx);
    case 'TT2_FILL':   return buildTT2(spec, v, idx);
    case 'TT3_CORRECTION': return buildTT3(spec, v, idx);
    case 'TT4_DICTATION':  return buildTT4(spec, v, idx);
    case 'TT5_MINI_TEXT':  return buildTT5(spec, v, idx);
    default: throw new Error(`Unknown task type: ${spec.task_type}`);
  }
}

// ─── Validator runner ────────────────────────────────────────────────────────

interface ValidationResult {
  ok: boolean;
  reasons: string[];
}

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

// ─── Self-check builder ──────────────────────────────────────────────────────

function buildSelfCheck(spec: TaskSpec): TaskRecord[] | null {
  const srcPath = path.join(STAGE1_DIR, `${spec.self_check_source}.json`);
  if (!fs.existsSync(srcPath)) {
    // Try stage2
    const s2 = path.join(STAGE2_DIR, `${spec.self_check_source}.json`);
    if (!fs.existsSync(s2)) return null;
    const items = JSON.parse(fs.readFileSync(s2, 'utf8')) as TaskRecord[];
    return buildTT6FromSource(spec, items);
  }
  const items = JSON.parse(fs.readFileSync(srcPath, 'utf8')) as TaskRecord[];
  return buildTT6FromSource(spec, items);
}

// ─── Cost tracker ─────────────────────────────────────────────────────────────

function computeCost(tokensIn: number, tokensOut: number): number {
  return (tokensIn / 1_000_000) * COST_PER_M_IN + (tokensOut / 1_000_000) * COST_PER_M_OUT;
}

// ─── Sleep ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// ─── User confirmation ───────────────────────────────────────────────────────

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase().startsWith('y'));
    });
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY not set in .env');
    process.exit(1);
  }

  const llmTasks = TASK_SPECS.filter((s) => !s.self_check);
  const selfCheckTasks = TASK_SPECS.filter((s) => s.self_check);

  const estimatedCalls = llmTasks.length * (RETRY_LIMIT + 1);
  const estimatedCostLow = computeCost(estimatedCalls * 1000, estimatedCalls * 500);
  const estimatedCostHigh = computeCost(estimatedCalls * 2000, estimatedCalls * 1500);

  console.log('\n=== LLM Task Generator ===');
  console.log(`Tasks requiring LLM: ${llmTasks.length} (+ ${selfCheckTasks.length} self-check, no API call)`);
  console.log(`Model: ${MODEL}`);
  console.log(`Estimated API calls: ~${llmTasks.length} (up to ${estimatedCalls} with retries)`);
  console.log(`Estimated cost: $${estimatedCostLow.toFixed(2)}–$${estimatedCostHigh.toFixed(2)}`);
  console.log(`Hard cap: $${COST_HARD_CAP_USD}`);
  console.log('');

  const proceed = await confirm('Proceed? (y/N): ');
  if (!proceed) {
    console.log('Aborted.');
    process.exit(0);
  }

  const client = new Anthropic({ apiKey });
  const allWords = loadSeedWords();

  fs.mkdirSync(STAGE2_DIR, { recursive: true });
  fs.mkdirSync(REJECTED_DIR, { recursive: true });

  const usageRecords: UsageRecord[] = [];
  const report: ReportRow[] = [];
  let totalCost = 0;

  // ── Process self-check tasks first (no API calls) ──────────────────────────
  for (const spec of selfCheckTasks) {
    console.log(`\n[${spec.id}] Building self-check from ${spec.self_check_source}...`);
    const built = buildSelfCheck(spec);
    if (!built || built.length === 0) {
      console.warn(`  SKIP — source file ${spec.self_check_source} not found`);
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
      fs.writeFileSync(path.join(STAGE2_DIR, `${spec.id}.json`), JSON.stringify(passed, null, 2));
      console.log(`  PASS ${passed.length}/3 variants → stage2/${spec.id}.json`);
    }
    if (rejected.length > 0) {
      fs.writeFileSync(path.join(REJECTED_DIR, `${spec.id}_rejected.json`), JSON.stringify(rejected, null, 2));
    }

    report.push({ task_id: spec.id, calls: 0, variants_generated: built.length, passed: passed.length, rejected: rejected.length, tokens_in: 0, tokens_out: 0, cost_usd: 0 });
  }

  // ── Process LLM tasks ──────────────────────────────────────────────────────
  for (const spec of llmTasks) {
    console.log(`\n[${spec.id}] ${spec.task_type} — generating...`);

    const seedWords = sampleSeedWords(allWords, spec, 10);
    const seedList = formatSeedList(seedWords);

    let rawResponse = '';
    let tokensIn = 0;
    let tokensOut = 0;
    let calls = 0;
    let parsed: unknown = null;

    for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
      if (attempt > 0) {
        console.log(`  Retry ${attempt}/${RETRY_LIMIT}...`);
        await sleep(RATE_LIMIT_MS);
      }

      const prompt = loadPrompt(spec.id, seedList);
      try {
        const result = await callClaude(client, prompt, attempt);
        rawResponse = result.content;
        tokensIn += result.tokensIn;
        tokensOut += result.tokensOut;
        calls++;

        totalCost += computeCost(result.tokensIn, result.tokensOut);
        if (totalCost > COST_HARD_CAP_USD) {
          console.error(`\nCOST CAP REACHED ($${totalCost.toFixed(3)} > $${COST_HARD_CAP_USD}). Stopping.`);
          saveUsage(usageRecords);
          printReport(report);
          process.exit(1);
        }

        parsed = extractJson(rawResponse);
        break;
      } catch (err) {
        console.warn(`  Attempt ${attempt + 1} failed: ${(err as Error).message}`);
        if (attempt === RETRY_LIMIT) {
          console.error(`  SKIP ${spec.id} — all retries exhausted`);
        }
      }
    }

    await sleep(RATE_LIMIT_MS);

    if (!parsed) {
      report.push({ task_id: spec.id, calls, variants_generated: 0, passed: 0, rejected: 0, tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: computeCost(tokensIn, tokensOut) });
      continue;
    }

    // Extract variants array
    let rawVariants: unknown[] = [];
    if (Array.isArray(parsed)) {
      rawVariants = parsed;
    } else if (parsed && typeof parsed === 'object') {
      const p = parsed as Record<string, unknown>;
      const key = Object.keys(p).find((k) => Array.isArray(p[k]));
      if (key) rawVariants = p[key] as unknown[];
    }

    console.log(`  Received ${rawVariants.length} raw variants`);

    const passed: TaskRecord[] = [];
    const rejected: TaskRecord[] = [];

    for (let i = 0; i < rawVariants.length; i++) {
      let task: TaskRecord;
      try {
        task = buildVariant(spec, rawVariants[i] as Record<string, unknown>, i);
      } catch (err) {
        console.warn(`  Variant ${i + 1} build error: ${(err as Error).message}`);
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

    // Uniqueness check across passed variants
    if (passed.length > 1) {
      const dupes = findDuplicates(passed as Parameters<typeof findDuplicates>[0]);
      if (dupes.length > 0) {
        console.warn(`  Duplicate groups found: ${dupes.length}`);
      }
    }

    if (passed.length > 0) {
      fs.writeFileSync(path.join(STAGE2_DIR, `${spec.id}.json`), JSON.stringify(passed, null, 2));
      console.log(`  ${passed.length}/${rawVariants.length} passed → stage2/${spec.id}.json`);
    }
    if (rejected.length > 0) {
      fs.writeFileSync(path.join(REJECTED_DIR, `${spec.id}_rejected.json`), JSON.stringify(rejected, null, 2));
    }

    const rowCost = computeCost(tokensIn, tokensOut);
    const row: ReportRow = { task_id: spec.id, calls, variants_generated: rawVariants.length, passed: passed.length, rejected: rejected.length, tokens_in: tokensIn, tokens_out: tokensOut, cost_usd: rowCost };
    report.push(row);
    usageRecords.push(row);
  }

  saveUsage(usageRecords);
  printReport(report);
}

function saveUsage(records: UsageRecord[]) {
  fs.writeFileSync(USAGE_PATH, JSON.stringify({ generated_at: new Date().toISOString(), records }, null, 2));
  console.log(`\nUsage written to ${USAGE_PATH}`);
}

function printReport(rows: ReportRow[]) {
  console.log('\n' + '─'.repeat(90));
  console.log(
    'task_id'.padEnd(14) +
    'calls'.padStart(6) +
    'variants'.padStart(10) +
    'passed'.padStart(8) +
    'rejected'.padStart(10) +
    'tok_in'.padStart(8) +
    'tok_out'.padStart(9) +
    'cost_$'.padStart(9),
  );
  console.log('─'.repeat(90));

  let totCalls = 0, totVariants = 0, totPassed = 0, totRejected = 0, totIn = 0, totOut = 0, totCost = 0;
  for (const r of rows) {
    console.log(
      r.task_id.padEnd(14) +
      String(r.calls).padStart(6) +
      String(r.variants_generated).padStart(10) +
      String(r.passed).padStart(8) +
      String(r.rejected).padStart(10) +
      String(r.tokens_in).padStart(8) +
      String(r.tokens_out).padStart(9) +
      r.cost_usd.toFixed(4).padStart(9),
    );
    totCalls += r.calls; totVariants += r.variants_generated;
    totPassed += r.passed; totRejected += r.rejected;
    totIn += r.tokens_in; totOut += r.tokens_out; totCost += r.cost_usd;
  }

  console.log('─'.repeat(90));
  console.log(
    'TOTAL'.padEnd(14) +
    String(totCalls).padStart(6) +
    String(totVariants).padStart(10) +
    String(totPassed).padStart(8) +
    String(totRejected).padStart(10) +
    String(totIn).padStart(8) +
    String(totOut).padStart(9) +
    totCost.toFixed(4).padStart(9),
  );
  console.log('─'.repeat(90));

  const fullPass = rows.filter((r) => r.passed >= 3).length;
  console.log(`\nTask IDs with ≥3 passing variants: ${fullPass}/${rows.length}`);
  console.log(`Total actual cost: $${totCost.toFixed(4)}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
