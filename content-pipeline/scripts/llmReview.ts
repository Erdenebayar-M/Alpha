import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isDryRun = process.argv.includes('--dry-run');

const PIPELINE_ROOT = path.resolve(__dirname, '..');
const STAGE1_DIR = path.join(PIPELINE_ROOT, 'stage1');
const STAGE2_DIR = path.join(PIPELINE_ROOT, 'stage2');
const VALIDATED_DIR = path.join(PIPELINE_ROOT, 'validated');
const FLAGGED_DIR = path.join(PIPELINE_ROOT, 'flagged');
const REJECTED_DIR = path.join(PIPELINE_ROOT, 'rejected');
const REVIEW_LOG_PATH = path.join(PIPELINE_ROOT, 'review-log.json');

const MODEL = 'anthropic/claude-haiku-4-5';
const COST_CAP_USD = 5.0;
const INPUT_COST_PER_TOKEN = 0.0000008;
const OUTPUT_COST_PER_TOKEN = 0.000001;
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

function ensureDir(dir: string) {
  if (!isDryRun && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readOutputFile(filePath: string): { task_id: string; variants: unknown[] } | null {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function writeOutputFile(filePath: string, data: { task_id: string; variants: unknown[] }) {
  if (isDryRun) return;
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function appendVariantToOutput(dir: string, taskId: string, variant: unknown) {
  ensureDir(dir);
  const filePath = path.join(dir, `${taskId}.json`);
  const existing = readOutputFile(filePath) ?? { task_id: taskId, variants: [] };
  existing.variants.push(variant);
  writeOutputFile(filePath, existing);
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

  for (const file of files) {
    const filePath = path.join(dir, file);
    const taskId = path.basename(file, '.json');

    let variants: Record<string, unknown>[];
    try {
      const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      variants = Array.isArray(raw) ? raw : [raw];
    } catch {
      console.error(`[SKIP] Failed to parse ${file}`);
      continue;
    }

    for (const variant of variants) {
      const variantId = (variant.id as string) ?? taskId;
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

      const annotated = { ...variant, review: {
        ...review,
        reviewed_at: new Date().toISOString(),
        model: MODEL,
        provider: 'openrouter',
      }};

      let dest: string;
      if (review.severity === 'ok') {
        dest = 'validated';
        log.validated++;
        log.by_stage[stage].validated++;
        if (!isDryRun) appendVariantToOutput(VALIDATED_DIR, taskId, annotated);
      } else if (review.severity === 'minor') {
        dest = 'flagged';
        log.flagged++;
        log.by_stage[stage].flagged++;
        if (!isDryRun) appendVariantToOutput(FLAGGED_DIR, taskId, annotated);
      } else {
        dest = 'rejected';
        log.rejected++;
        log.by_stage[stage].rejected++;
        if (!isDryRun) appendVariantToOutput(REJECTED_DIR, taskId, annotated);
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
  await processFiles(STAGE2_DIR, 'stage2', log);

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

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
