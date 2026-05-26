/**
 * One-off backfill: recompute scheduled_date for Lessons + Checkpoints created
 * by the old plan-generator that used local-midnight (off-by-one in non-UTC TZ).
 *
 * Strategy: for each ACTIVE plan, anchor day 1 to UTC midnight of plan.created_at,
 * then set lesson.scheduled_date = anchor + (day_number - 1) days,
 * checkpoint.scheduled_date = anchor + (ceil(duration_days/2) - 1) days.
 *
 * Usage:
 *   npm --workspace=@app/backend exec ts-node scripts/fix-lesson-dates.ts [--dry-run] [--apply]
 *
 * Default is dry-run. Pass --apply to write changes.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const apply = process.argv.includes('--apply');
const dryRun = !apply;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function utcMidnight(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function addUtcDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log(`Mode: ${dryRun ? 'DRY-RUN (no writes)' : 'APPLY'}`);

  const plans = await prisma.plan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      lessons: { orderBy: { day_number: 'asc' } },
      checkpoints: true,
    },
  });

  console.log(`Found ${plans.length} ACTIVE plan(s).`);

  let lessonUpdates = 0;
  let checkpointUpdates = 0;
  let lessonsSkipped = 0;

  for (const plan of plans) {
    const anchor = utcMidnight(plan.started_at);
    const midpointDay = Math.ceil(plan.duration_days / 2);
    const checkpointDate = addUtcDays(anchor, midpointDay - 1);

    console.log(
      `\nPlan ${plan.id}  learner=${plan.learner_id}  anchor=${ymd(anchor)}  duration=${plan.duration_days}d`,
    );

    for (const lesson of plan.lessons) {
      const expected = addUtcDays(anchor, lesson.day_number - 1);
      const current = utcMidnight(lesson.scheduled_date);
      if (current.getTime() === expected.getTime()) {
        lessonsSkipped++;
        continue;
      }
      console.log(
        `  lesson day=${lesson.day_number}  ${ymd(current)} -> ${ymd(expected)}`,
      );
      lessonUpdates++;
      if (apply) {
        await prisma.lesson.update({
          where: { id: lesson.id },
          data: { scheduled_date: expected },
        });
      }
    }

    for (const cp of plan.checkpoints) {
      const current = utcMidnight(cp.scheduled_date);
      if (current.getTime() === checkpointDate.getTime()) continue;
      console.log(
        `  checkpoint            ${ymd(current)} -> ${ymd(checkpointDate)}`,
      );
      checkpointUpdates++;
      if (apply) {
        await prisma.checkpoint.update({
          where: { id: cp.id },
          data: { scheduled_date: checkpointDate },
        });
      }
    }
  }

  console.log(
    `\nSummary: lessons ${apply ? 'updated' : 'to update'}=${lessonUpdates}, skipped=${lessonsSkipped}, checkpoints ${apply ? 'updated' : 'to update'}=${checkpointUpdates}`,
  );
  if (dryRun) console.log('Re-run with --apply to write changes.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
