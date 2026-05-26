/**
 * For each ACTIVE plan whose lessons all have zero tasks, delete its lessons +
 * checkpoints and re-run generatePlanLessons. Use after a plan-generator fix.
 *
 * Usage:
 *   npx ts-node scripts/regenerate-empty-plans.ts           (dry-run)
 *   npx ts-node scripts/regenerate-empty-plans.ts --apply
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';
import { generatePlanLessons } from '../src/lib/engines/plan-generator';

const apply = process.argv.includes('--apply');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}`);

  const plans = await prisma.plan.findMany({
    where: { status: 'ACTIVE' },
    include: { lessons: { select: { id: true, total_tasks: true } } },
  });

  const empties = plans.filter(
    (p) => p.lessons.length > 0 && p.lessons.every((l) => l.total_tasks === 0),
  );

  console.log(`Active plans: ${plans.length}, empty: ${empties.length}`);

  for (const plan of empties) {
    console.log(`Plan ${plan.id} learner=${plan.learner_id} — ${plan.lessons.length} empty lessons`);
    if (!apply) continue;

    await prisma.$transaction([
      prisma.attempt.deleteMany({ where: { lesson_id: { in: plan.lessons.map((l) => l.id) } } }),
      prisma.lesson.deleteMany({ where: { plan_id: plan.id } }),
      prisma.checkpoint.deleteMany({ where: { plan_id: plan.id } }),
    ]);
    await generatePlanLessons(plan.id, prisma);
    console.log(`  → regenerated`);
  }

  if (!apply) console.log('Re-run with --apply to write.');
  await prisma.$disconnect();
})();
