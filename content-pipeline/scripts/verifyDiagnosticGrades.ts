/**
 * Read-only probe of real diagnostic content coverage for G1-G4.
 *
 * Runs the same two queries the diagnostic route uses to pick items
 * (backend/src/routes/diagnostic.ts: availableRungsForGrade + poolAtRung),
 * directly against the DB, without creating a learner or session. Useful to
 * run before/after content-pipeline/scripts/repairGradeLevels.ts --apply to
 * see whether repair actually restored any selectable content, and as a
 * standing check on the G3/G4-empty, G1/G2-thin gap this bug investigation
 * started from.
 *
 * Usage:  npx tsx content-pipeline/scripts/verifyDiagnosticGrades.ts
 *         (requires backend/.env with DATABASE_URL)
 */
import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../backend/generated/prisma';

dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/** Mirrors diagnostic.ts availableRungsForGrade. */
async function availableRungsForGrade(grade: number): Promise<number[]> {
  const gradeCode = `G${grade}`;
  const tasks = await prisma.task.findMany({
    where: { is_active: true, grade_band: { has: gradeCode } },
    select: { grade_levels: true },
  });
  const set = new Set<number>();
  for (const t of tasks) {
    for (const cell of t.grade_levels) {
      const [g, m] = cell.split(':');
      if (g === gradeCode && /^M[0-5]$/.test(m)) set.add(Number(m.slice(1)));
    }
  }
  return [...set].sort((a, b) => a - b);
}

/** Mirrors diagnostic.ts poolAtRung — count only, no candidate selection needed here. */
async function poolCountAtRung(grade: number, rung: number): Promise<number> {
  const cell = `G${grade}:M${rung}`;
  return prisma.task.count({ where: { is_active: true, grade_levels: { has: cell } } });
}

async function main(): Promise<void> {
  console.log(`\nDiagnostic Grade Coverage (real DB, read-only)`);
  console.log(`================================================\n`);

  for (const grade of [1, 2, 3, 4]) {
    const rungs = await availableRungsForGrade(grade);
    if (rungs.length === 0) {
      console.log(`G${grade}: NO CONTENT — /diagnostic/start would return 422 for this grade.`);
      continue;
    }
    const counts = await Promise.all(rungs.map((r) => poolCountAtRung(grade, r)));
    const total = counts.reduce((a, b) => a + b, 0);
    const perRung = rungs.map((r, i) => `M${r}=${counts[i]}`).join(', ');
    console.log(`G${grade}: ${rungs.length} rung(s) with content, ${total} task(s) total  (${perRung})`);
  }

  console.log('');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  await prisma.$disconnect();
  process.exit(1);
});
