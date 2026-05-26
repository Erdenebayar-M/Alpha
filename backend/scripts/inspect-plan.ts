import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

(async () => {
  const total = await prisma.task.count();
  const nonDiag = await prisma.task.count({ where: { is_diagnostic: false } });
  const diag = await prisma.task.count({ where: { is_diagnostic: true } });
  console.log({ total, nonDiag, diag });

  const byLevel = await prisma.task.groupBy({
    by: ['level_target'],
    where: { is_diagnostic: false },
    _count: { _all: true },
  });
  console.log('byLevel non-diagnostic:', byLevel);

  const byGrade = await prisma.task.findMany({
    where: { is_diagnostic: false },
    select: { grade_band: true },
    take: 5,
  });
  console.log('sample grade_band:', byGrade);

  const plans = await prisma.plan.findMany({
    where: { status: 'ACTIVE' },
    include: {
      lessons: { select: { day_number: true, total_tasks: true, task_ids: true } },
      learner: {
        select: { variant: true, skill_state: { select: { general_level: true } } },
      },
    },
  });
  for (const pl of plans) {
    console.log(
      `plan ${pl.id} variant=${pl.learner.variant} level=${pl.learner.skill_state?.general_level} duration=${pl.duration_days}`,
    );
    for (const l of pl.lessons.slice(0, 5)) {
      console.log(`  day ${l.day_number} total=${l.total_tasks} ids=${l.task_ids.length}`);
    }
  }
  const candidates = await prisma.task.findMany({
    where: {
      grade_band: { hasSome: ['G1', 'G2'] },
      level_target: { contains: 'M2' },
      is_diagnostic: false,
    },
    select: { id: true, primary_skill: true, level_target: true },
  });
  console.log(`candidates for variant=A level=M2: ${candidates.length}`);
  const bySkill: Record<string, number> = {};
  for (const t of candidates) bySkill[t.primary_skill as string] = (bySkill[t.primary_skill as string] ?? 0) + 1;
  console.log('candidate skill distribution:', bySkill);

  const planRow = await prisma.plan.findFirst({
    where: { status: 'ACTIVE' },
    select: { priority_skills: true },
  });
  console.log('plan priority_skills:', planRow?.priority_skills);

  await prisma.$disconnect();
})();
