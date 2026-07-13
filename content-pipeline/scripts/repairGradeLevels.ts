/**
 * Repair `grade_levels` on active Task rows flagged by auditGradeLevels.ts.
 *
 * Repairs ONLY from a traceable source — never fabricates a grade_levels
 * value (repo hard rule: never invent content; untraceable data goes to
 * human review, not a guess):
 *
 *   1. The most recent 'edited_live' TaskDraftAuditLog snapshot for the task
 *      — the pre-edit grade_levels captured by the PATCH route before the
 *      damaging write, if that snapshot itself is internally consistent.
 *   2. content-pipeline/validated/{group}.json — matched by variant.id ===
 *      Task.id, re-derived via buildGradeLevels(variant.grade_band,
 *      variant.level_target) (same formula as backend/prisma/seed.ts).
 *
 * Anything else is printed as HUMAN REVIEW with a re-derived *suggestion*
 * (buildGradeLevels(task.grade_band, task.level_target)) and left untouched.
 *
 * Dry-run by default — prints what WOULD change. Pass --apply to write.
 * Every write is wrapped in a transaction with a TaskDraftAuditLog row
 * (action: 'repaired_grade_levels'), preserving the audit trail.
 *
 * Usage:
 *   npx tsx content-pipeline/scripts/repairGradeLevels.ts            (dry-run)
 *   npx tsx content-pipeline/scripts/repairGradeLevels.ts --apply
 *   (requires backend/.env with DATABASE_URL)
 */
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, DraftStage } from '../../backend/generated/prisma';
import { validateGradeLevels } from '@app/shared';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const apply = process.argv.includes('--apply');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Same formula as backend/prisma/seed.ts buildGradeLevels — kept in sync deliberately;
// this script only ever proposes a *suggestion* from it, never writes it unattributed.
const LEVEL_CODES = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'];
function buildGradeLevels(gradeBand: string[], levelTarget: string): string[] {
  const rangeMatch = levelTarget.match(/^(M[0-5])-(M[0-5])$/);
  let levels: string[];
  if (rangeMatch) {
    const start = LEVEL_CODES.indexOf(rangeMatch[1]);
    const end = LEVEL_CODES.indexOf(rangeMatch[2]);
    levels = start >= 0 && end >= 0 ? LEVEL_CODES.slice(start, end + 1) : ['M0'];
  } else {
    levels = LEVEL_CODES.includes(levelTarget) ? [levelTarget] : ['M0'];
  }
  const cells: string[] = [];
  for (const g of gradeBand) for (const l of levels) cells.push(`${g}:${l}`);
  return cells;
}

interface ValidatedVariant {
  id: string;
  grade_band?: string[];
  level_target?: string;
}

/** Index every content-pipeline/validated/*.json variant by its id (== Task.id on import). */
function loadValidatedIndex(): Map<string, ValidatedVariant> {
  const dir = path.resolve(__dirname, '../validated');
  const index = new Map<string, ValidatedVariant>();
  if (!fs.existsSync(dir)) return index;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
    const variants: ValidatedVariant[] = Array.isArray(raw?.variants) ? raw.variants : [raw];
    for (const v of variants) if (v?.id) index.set(v.id, v);
  }
  return index;
}

type Source = 'audit_log' | 'validated_json' | 'none';

interface Plan {
  id: string;
  task_type: string;
  grade_band: string[];
  current_grade_levels: string[];
  source: Source;
  resolved: string[] | null; // the traceable value to write, or null if untraceable
  suggestion: string[]; // re-derived guess, for human review only
  detail: string;
}

async function main(): Promise<void> {
  const validatedIndex = loadValidatedIndex();

  const tasks = await prisma.task.findMany({
    where: { is_active: true },
    select: { id: true, task_type: true, grade_band: true, grade_levels: true, level_target: true },
  });

  const flagged = tasks.filter((t) => validateGradeLevels(t.grade_band, t.grade_levels).length > 0);

  console.log(`\nGrade-Levels Repair (${apply ? 'APPLY' : 'DRY-RUN'})`);
  console.log(`===================================================`);
  console.log(`${flagged.length} flagged task(s) out of ${tasks.length} active.\n`);

  const plans: Plan[] = [];

  for (const t of flagged) {
    const suggestion = buildGradeLevels(t.grade_band, t.level_target);

    // Source 1: most recent edited_live audit log snapshot, if internally consistent.
    const logs = await prisma.taskDraftAuditLog.findMany({
      where: { task_id: t.id, action: 'edited_live' },
      orderBy: { performed_at: 'desc' },
      select: { snapshot: true, performed_at: true },
    });
    let resolved: string[] | null = null;
    let source: Source = 'none';
    let detail = 'no traceable source';

    for (const log of logs) {
      const snapshot = log.snapshot as { grade_levels?: unknown } | null;
      const candidate = snapshot?.grade_levels;
      if (Array.isArray(candidate) && validateGradeLevels(t.grade_band, candidate).length === 0) {
        resolved = candidate as string[];
        source = 'audit_log';
        detail = `pre-edit snapshot from ${log.performed_at.toISOString()}`;
        break;
      }
    }

    // Source 2: validated/*.json, matched by id, re-derived via buildGradeLevels.
    if (!resolved) {
      const variant = validatedIndex.get(t.id);
      if (variant?.grade_band && variant.level_target) {
        const candidate = buildGradeLevels(variant.grade_band, variant.level_target);
        if (validateGradeLevels(t.grade_band, candidate).length === 0) {
          resolved = candidate;
          source = 'validated_json';
          detail = `re-derived from validated/*.json (grade_band=${JSON.stringify(variant.grade_band)}, level_target=${variant.level_target})`;
        }
      }
    }

    plans.push({
      id: t.id,
      task_type: t.task_type,
      grade_band: t.grade_band,
      current_grade_levels: t.grade_levels,
      source,
      resolved,
      suggestion,
      detail,
    });
  }

  const repairable = plans.filter((p) => p.resolved !== null);
  const humanReview = plans.filter((p) => p.resolved === null);

  console.log(`--- Repairable from a traceable source (${repairable.length}) ---`);
  for (const p of repairable) {
    console.log(`  ${p.id} (${p.task_type}) [source: ${p.source}]`);
    console.log(`    current: ${JSON.stringify(p.current_grade_levels)}`);
    console.log(`    ${apply ? 'writing' : 'would write'}: ${JSON.stringify(p.resolved)}`);
    console.log(`    ${p.detail}`);
  }

  console.log(`\n--- HUMAN REVIEW — untraceable, NOT written (${humanReview.length}) ---`);
  for (const p of humanReview) {
    console.log(`  ${p.id} (${p.task_type})  grade_band=${JSON.stringify(p.grade_band)}`);
    console.log(`    current: ${JSON.stringify(p.current_grade_levels)}`);
    console.log(`    suggestion (unverified, re-derived from grade_band+level_target): ${JSON.stringify(p.suggestion)}`);
  }

  if (!apply) {
    console.log(`\nDry-run only — no writes made. Re-run with --apply to write the ${repairable.length} repairable row(s).`);
    await prisma.$disconnect();
    return;
  }

  let written = 0;
  for (const p of repairable) {
    const before = await prisma.task.findUnique({ where: { id: p.id } });
    if (!before) continue;
    await prisma.$transaction(async (tx) => {
      await tx.taskDraftAuditLog.create({
        data: {
          draft_id:   null,
          task_id:    p.id,
          action:     'repaired_grade_levels',
          from_stage: DraftStage.STAGE2,
          notes:      `Repaired grade_levels from source=${p.source}: ${p.detail}`,
          snapshot:   before as object,
        },
      });
      await tx.task.update({ where: { id: p.id }, data: { grade_levels: p.resolved! } });
    });
    written += 1;
  }

  console.log(`\nApplied ${written} repair(s). ${humanReview.length} row(s) still need human review.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
