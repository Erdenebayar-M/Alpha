/**
 * Audit `grade_levels` integrity across live (is_active) Task rows.
 *
 * Read-only. `Task.grade_levels` (cells like "G3:M2") is the only field the
 * diagnostic pool query filters on (backend/src/routes/diagnostic.ts). A task
 * whose grade_levels is empty, or missing a cell for a grade in its
 * grade_band, still exists but is never served — it silently disappears from
 * the adaptive diagnostic.
 *
 * Background: PATCH /api/admin/content/live-tasks/:id used to accept an
 * unvalidated `updates` bag and write `grade_levels` straight to the DB with
 * no consistency check against the (immutable) grade_band. This script finds
 * every task already affected and, via the edited_live TaskDraftAuditLog
 * trail the PATCH route writes on every edit, splits them into tasks the bug
 * actually DAMAGED (grade_levels was edited away) vs tasks that simply never
 * had grade_levels populated.
 *
 * Usage:  npx tsx content-pipeline/scripts/auditGradeLevels.ts
 *         (requires backend/.env with DATABASE_URL)
 *
 * Exit code 1 if any EMPTY/MISMATCH task is found, 0 if all are consistent.
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

// The shared validator is the single source of truth for grade_band/grade_levels
// consistency — the same function the PATCH route now enforces on write.
import { validateGradeLevels } from '@app/shared';

type Classification = 'OK' | 'EMPTY' | 'MISMATCH';

interface AuditRow {
  id: string;
  task_type: string;
  grade_band: string[];
  grade_levels: string[];
  level_target: string;
  classification: Classification;
  errors: string[];
  hasEditedLiveLog: boolean;
}

function classify(gradeBand: string[], gradeLevels: string[]): { classification: Classification; errors: string[] } {
  const errors = validateGradeLevels(gradeBand, gradeLevels);
  if (errors.length === 0) return { classification: 'OK', errors: [] };
  if (gradeLevels.length === 0) return { classification: 'EMPTY', errors };
  return { classification: 'MISMATCH', errors };
}

async function main(): Promise<void> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  const rows: AuditRow[] = [];
  try {
    const tasks = await prisma.task.findMany({
      where: { is_active: true },
      select: { id: true, task_type: true, grade_band: true, grade_levels: true, level_target: true },
    });

    const damaged = tasks.filter((t) => classify(t.grade_band, t.grade_levels).classification !== 'OK');

    // One grouped query for edited_live audit-log presence, rather than N queries.
    const editedLogs = damaged.length
      ? await prisma.taskDraftAuditLog.findMany({
          where: { task_id: { in: damaged.map((t) => t.id) }, action: 'edited_live' },
          select: { task_id: true },
        })
      : [];
    const editedIds = new Set(editedLogs.map((l) => l.task_id));

    for (const t of tasks) {
      const { classification, errors } = classify(t.grade_band, t.grade_levels);
      rows.push({
        id: t.id,
        task_type: t.task_type,
        grade_band: t.grade_band,
        grade_levels: t.grade_levels,
        level_target: t.level_target,
        classification,
        errors,
        hasEditedLiveLog: editedIds.has(t.id),
      });
    }
  } finally {
    await prisma.$disconnect();
  }

  const flagged = rows.filter((r) => r.classification !== 'OK');
  const damagedRows = flagged.filter((r) => r.hasEditedLiveLog);
  const neverPopulatedRows = flagged.filter((r) => !r.hasEditedLiveLog);

  console.log(`\nGrade-Levels Audit`);
  console.log(`===================`);
  console.log(`Scanned ${rows.length} active task(s). Flagged: ${flagged.length} (OK: ${rows.length - flagged.length}).\n`);

  if (flagged.length === 0) {
    console.log('All active tasks have consistent grade_levels. ✓');
    return;
  }

  console.log(`  Damaged by live-edit (has edited_live audit log): ${damagedRows.length}`);
  console.log(`  Never populated (no edited_live audit log):       ${neverPopulatedRows.length}\n`);

  const byGroup = (list: AuditRow[], keyFn: (r: AuditRow) => string[]): Record<string, number> => {
    const counts: Record<string, number> = {};
    for (const r of list) {
      for (const key of keyFn(r)) counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  };

  const printCounts = (label: string, counts: Record<string, number>) => {
    console.log(`  ${label}:`);
    for (const [key, n] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
      console.log(`    ${key.padEnd(12)} ${n}`);
    }
  };

  console.log(`--- Damaged (by task_type) ---`);
  printCounts('task_type', byGroup(damagedRows, (r) => [r.task_type]));
  console.log(`--- Damaged (by grade, from grade_band) ---`);
  printCounts('grade', byGroup(damagedRows, (r) => r.grade_band));

  console.log(`\n--- Never populated (by task_type) ---`);
  printCounts('task_type', byGroup(neverPopulatedRows, (r) => [r.task_type]));
  console.log(`--- Never populated (by grade, from grade_band) ---`);
  printCounts('grade', byGroup(neverPopulatedRows, (r) => r.grade_band));

  console.log(`\n--- Flagged rows ---`);
  for (const r of flagged) {
    const tag = r.hasEditedLiveLog ? 'DAMAGED' : 'NEVER_POPULATED';
    console.log(`  [${r.classification}/${tag}] ${r.id} (${r.task_type})`);
    console.log(`      grade_band=${JSON.stringify(r.grade_band)}  grade_levels=${JSON.stringify(r.grade_levels)}  level_target=${r.level_target}`);
    console.log(`      ${r.errors.join('; ')}`);
  }

  console.log(`\n------------------------------------------------`);
  console.log(`Total scanned: ${rows.length} | OK: ${rows.length - flagged.length} | Flagged: ${flagged.length} (damaged: ${damagedRows.length}, never populated: ${neverPopulatedRows.length})`);
  process.exitCode = 1;
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
