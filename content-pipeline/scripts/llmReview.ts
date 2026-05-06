import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, DraftStage, TaskType, SkillCode, LessonSlot } from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const isDryRun = process.argv.includes('--dry-run');

const PIPELINE_ROOT   = path.resolve(__dirname, '..');
const STAGE1_DIR      = path.join(PIPELINE_ROOT, 'stage1');
const REVIEW_LOG_PATH = path.join(PIPELINE_ROOT, 'review-log.json');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma  = new PrismaClient({ adapter });

const VALID_TASK_TYPES = new Set(Object.values(TaskType));
const VALID_SKILLS     = new Set(Object.values(SkillCode));
const VALID_SLOTS      = new Set(Object.values(LessonSlot));

function toTaskType(raw: string): TaskType {
  if (!VALID_TASK_TYPES.has(raw as TaskType)) throw new Error(`Unknown task_type: ${raw}`);
  return raw as TaskType;
}
function toSkill(raw: string | null | undefined): SkillCode | null {
  if (!raw) return null;
  if (!VALID_SKILLS.has(raw as SkillCode)) throw new Error(`Unknown skill: ${raw}`);
  return raw as SkillCode;
}
function toSlot(raw: string): LessonSlot {
  if (!VALID_SLOTS.has(raw as LessonSlot)) throw new Error(`Unknown lesson_slot_fit: ${raw}`);
  return raw as LessonSlot;
}

const MODEL = 'google/gemini-2.5-flash';
const COST_CAP_USD = 5.0;
// Rates per token for google/gemini-2.5-flash (verify at https://openrouter.ai/google/gemini-2.5-flash)
const INPUT_COST_PER_TOKEN = 0.00000015;
const OUTPUT_COST_PER_TOKEN = 0.0000006;
const SLEEP_MS = 1000;

const systemPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/_reviewer.md'),
  'utf-8'
);

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000',
    'X-Title': 'Mongolian Writing App - Content Review',
  },
});

interface ReviewResult {
  approved: boolean;
  issues: string[];
  severity: 'ok' | 'minor' | 'blocker';
  fix_suggestion: string;
}

interface ReviewLog {
  total_reviewed: number;
  validated: number;
  flagged: number;
  rejected: number;
  review_failures: Array<{ task_id: string; variant_id: string; raw_response?: string; error: string }>;
  by_issue: Record<string, number>;
  by_stage: {
    stage1: { total: number; validated: number; flagged: number; rejected: number };
    stage2: { total: number; validated: number; flagged: number; rejected: number };
  };
  total_input_tokens: number;
  total_output_tokens: number;
  estimated_cost_usd: number;
  provider: string;
  model: string;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function stripFences(text: string): string {
  return text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

async function callReviewer(taskJson: string, retrying = false): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = retrying
    ? [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: taskJson },
        { role: 'assistant', content: '```json' },
        { role: 'user', content: 'Reply with raw JSON only, no markdown, no explanation.' },
      ]
    : [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: taskJson },
      ];

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 500,
    temperature: 0.2,
    messages,
  });

  return {
    text: response.choices[0].message.content ?? '',
    usage: response.usage
      ? { prompt_tokens: response.usage.prompt_tokens, completion_tokens: response.usage.completion_tokens }
      : undefined,
  };
}

async function reviewVariant(
  variant: Record<string, unknown>,
  log: ReviewLog,
  stage: 'stage1' | 'stage2'
): Promise<{ review: ReviewResult; inputTokens: number; outputTokens: number } | null> {
  const taskJson = JSON.stringify(variant, null, 2);
  let text = '';
  let usage: { prompt_tokens: number; completion_tokens: number } | undefined;

  try {
    const result = await callReviewer(taskJson);
    text = result.text;
    usage = result.usage;
    const stripped = stripFences(text);
    const review = JSON.parse(stripped) as ReviewResult;
    return {
      review,
      inputTokens: usage?.prompt_tokens ?? 0,
      outputTokens: usage?.completion_tokens ?? 0,
    };
  } catch {
    // Retry once
    try {
      const result = await callReviewer(taskJson, true);
      text = result.text;
      usage = result.usage;
      const stripped = stripFences(text);
      const review = JSON.parse(stripped) as ReviewResult;
      return {
        review,
        inputTokens: usage?.prompt_tokens ?? 0,
        outputTokens: usage?.completion_tokens ?? 0,
      };
    } catch (err2) {
      log.review_failures.push({
        task_id: (variant.id as string)?.split('-v')[0] ?? 'unknown',
        variant_id: variant.id as string ?? 'unknown',
        raw_response: text,
        error: String(err2),
      });
      return null;
    }
  }
}

async function processFiles(
  dir: string,
  stage: 'stage1' | 'stage2',
  log: ReviewLog
): Promise<void> {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_'));

  const existingIds = new Set(
    (await prisma.taskDraft.findMany({ select: { id: true } })).map(r => r.id)
  );

  for (const file of files) {
    const filePath = path.join(dir, file);
    const taskId = path.basename(file, '.json');

    let variants: Record<string, unknown>[];
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      variants = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.variants)
          ? raw.variants
          : [raw];
    } catch {
      console.error(`[SKIP] Failed to parse ${file}`);
      continue;
    }

    for (const variant of variants) {
      const variantId = (variant.id as string) ?? taskId;

      if (existingIds.has(variantId)) {
        console.log(`  [SKIP] ${variantId} already in DB`);
        continue;
      }
      const estimatedCost =
        log.total_input_tokens * INPUT_COST_PER_TOKEN +
        log.total_output_tokens * OUTPUT_COST_PER_TOKEN;

      if (estimatedCost >= COST_CAP_USD) {
        console.warn(`\n[COST CAP] Estimated cost $${estimatedCost.toFixed(4)} reached $${COST_CAP_USD} limit.`);
        console.warn('Stopping. Run again to continue (already-processed files will be skipped if you add dedup logic).');
        process.exit(0);
      }

      console.log(`[${stage}] Reviewing ${variantId}...`);

      const result = await reviewVariant(variant, log, stage);
      log.total_reviewed++;
      log.by_stage[stage].total++;

      if (!result) {
        console.log(`  → FAILURE (parse error)`);
        continue;
      }

      const { review, inputTokens, outputTokens } = result;
      log.total_input_tokens += inputTokens;
      log.total_output_tokens += outputTokens;

      // Tally issues
      for (const issue of review.issues) {
        log.by_issue[issue] = (log.by_issue[issue] ?? 0) + 1;
      }

      const reviewedAt = new Date().toISOString();

      let dest: string;
      let targetStage: DraftStage;
      if (review.severity === 'ok') {
        dest = 'stage2';
        targetStage = DraftStage.STAGE2;
        log.validated++;
        log.by_stage[stage].validated++;
      } else if (review.severity === 'minor') {
        dest = 'flagged';
        targetStage = DraftStage.FLAGGED;
        log.flagged++;
        log.by_stage[stage].flagged++;
      } else {
        dest = 'rejected';
        targetStage = DraftStage.REJECTED;
        log.rejected++;
        log.by_stage[stage].rejected++;
      }

      if (!isDryRun) {
        try {
          const variantId = (variant.id as string) ?? taskId;
          await prisma.taskDraft.upsert({
            where: { id: variantId },
            create: {
              id:                     variantId,
              task_id:                variantId.replace(/-v\d+$/, ''),
              stage:                  targetStage,
              task_type:              toTaskType(variant.task_type as string),
              title:                  variant.title as string,
              prompt_text:            variant.prompt_text as string,
              correct_answer:         variant.correct_answer as string,
              options:                variant.options as object,
              audio_url:              (variant.audio_url as string) ?? null,
              image_url:              (variant.image_url as string) ?? null,
              primary_skill:          toSkill(variant.primary_skill as string)!,
              secondary_skill:        toSkill(variant.secondary_skill as string | undefined),
              level_target:           variant.level_target as string,
              error_targets:          (variant.error_targets as string[]) ?? [],
              grade_band:             (variant.grade_band as string[]) ?? [],
              difficulty:             variant.difficulty as number,
              estimated_time_seconds: variant.estimated_time_seconds as number,
              review_after_days:      (variant.review_after_days as number[]) ?? [],
              lesson_slot_fit:        toSlot(variant.lesson_slot_fit as string),
              feedback_text:          variant.feedback_text as string,
              is_diagnostic:          (variant.is_diagnostic as boolean) ?? false,
              ai_review_severity:     review.severity,
              ai_review_issues:       review.issues ?? [],
              ai_fix_suggestion:      review.fix_suggestion ?? null,
              ai_reviewed_at:         new Date(reviewedAt),
            },
            update: {
              stage:                  targetStage,
              ai_review_severity:     review.severity,
              ai_review_issues:       review.issues ?? [],
              ai_fix_suggestion:      review.fix_suggestion ?? null,
              ai_reviewed_at:         new Date(reviewedAt),
            },
          });
        } catch (upsertErr) {
          console.error(`  [DB ERROR] Failed to upsert ${variant.id}: ${(upsertErr as Error).message}`);
        }
      }

      console.log(`  → ${dest.toUpperCase()} | severity=${review.severity} | issues=${review.issues.join(',') || 'none'}`);
      if (review.fix_suggestion) {
        console.log(`     fix: ${review.fix_suggestion}`);
      }

      await sleep(SLEEP_MS);
    }
  }
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY not set in .env');
    process.exit(1);
  }

  console.log(isDryRun ? '[DRY RUN] No files will be written.\n' : '[LIVE RUN] Writing output files.\n');

  const log: ReviewLog = {
    total_reviewed: 0,
    validated: 0,
    flagged: 0,
    rejected: 0,
    review_failures: [],
    by_issue: {},
    by_stage: {
      stage1: { total: 0, validated: 0, flagged: 0, rejected: 0 },
      stage2: { total: 0, validated: 0, flagged: 0, rejected: 0 },
    },
    total_input_tokens: 0,
    total_output_tokens: 0,
    estimated_cost_usd: 0,
    provider: 'openrouter',
    model: MODEL,
  };

  await processFiles(STAGE1_DIR, 'stage1', log);

  log.estimated_cost_usd =
    log.total_input_tokens * INPUT_COST_PER_TOKEN +
    log.total_output_tokens * OUTPUT_COST_PER_TOKEN;

  console.log('\n=== REVIEW COMPLETE ===');
  console.log(`Total reviewed : ${log.total_reviewed}`);
  console.log(`Validated      : ${log.validated}`);
  console.log(`Flagged        : ${log.flagged}`);
  console.log(`Rejected       : ${log.rejected}`);
  console.log(`Failures       : ${log.review_failures.length}`);
  console.log(`Estimated cost : $${log.estimated_cost_usd.toFixed(5)}`);

  if (!isDryRun) {
    fs.writeFileSync(REVIEW_LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`\nReview log written to ${REVIEW_LOG_PATH}`);
  } else {
    console.log('\n[DRY RUN] Log not written. Would have produced:');
    console.log(JSON.stringify(log, null, 2));
  }
}

main()
  .catch(err => { console.error('Fatal error:', err); process.exit(1); })
  .finally(() => prisma.$disconnect());
