import type { PrismaClient } from '../../../generated/prisma';

// Canonical skill priority: S7 → S2 → S3 → S5 → S4 → S6 → S8 → S1
const SKILL_PRIORITY_ORDER = ['S7', 'S2', 'S3', 'S5', 'S4', 'S6', 'S8', 'S1'] as const;

/**
 * Creates Lesson rows (one per day) and one Checkpoint row for the given Plan.
 * Must be called after the Plan row is created by the diagnostic engine.
 */
export async function generatePlanLessons(planId: string, db: PrismaClient): Promise<void> {
  // 1. Load plan with learner + skill state
  const plan = await db.plan.findUniqueOrThrow({
    where: { id: planId },
    include: {
      learner: {
        include: { skill_state: true },
      },
    },
  });

  const { learner } = plan;
  const skillState = learner.skill_state;
  const generalLevel: string = skillState?.general_level ?? 'M0';
  const recentTaskIds: string[] = skillState?.recent_task_ids ?? [];

  // Variant A (grades 1–2) → G1/G2 tasks; Variant B (grades 2–4) → G2/G3/G4 tasks
  const gradeBands = learner.variant === 'A' ? ['G1', 'G2'] : ['G2', 'G3', 'G4'];

  // Skill rotation: plan.priority_skills sorted by canonical priority order
  const planSkillSet = new Set(plan.priority_skills);
  const filteredByPriority = SKILL_PRIORITY_ORDER.filter((s) => planSkillSet.has(s));
  const rotationSkills = filteredByPriority.length > 0 ? filteredByPriority : [...SKILL_PRIORITY_ORDER];

  const budgetSeconds = plan.daily_minutes * 60;

  // 2. Fetch all eligible tasks in one query (excludes recent + diagnostic tasks)
  const allTasks = await db.task.findMany({
    where: {
      grade_band: { hasSome: gradeBands },
      level_target: { contains: generalLevel },
      is_diagnostic: false,
      id: { notIn: recentTaskIds },
    },
    orderBy: { difficulty: 'asc' },
  });

  const usedInPlan = new Set<string>();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  interface LessonSpec {
    day_number: number;
    primary_skill: string;
    task_ids: string[];
    total_tasks: number;
    estimated_duration_seconds: number;
    scheduled_date: Date;
  }

  const lessonSpecs: LessonSpec[] = [];

  // 3. Build one lesson spec per day
  for (let day = 1; day <= plan.duration_days; day++) {
    const skill = rotationSkills[(day - 1) % rotationSkills.length];

    const available = allTasks.filter(
      (t) => (t.primary_skill as string) === skill && !usedInPlan.has(t.id),
    );

    const selectedIds: string[] = [];
    let elapsed = 0;

    for (const task of available) {
      if (elapsed + task.estimated_time_seconds > budgetSeconds) break;
      selectedIds.push(task.id);
      elapsed += task.estimated_time_seconds;
      usedInPlan.add(task.id);
    }

    const scheduledDate = new Date(today);
    scheduledDate.setDate(today.getDate() + (day - 1));

    lessonSpecs.push({
      day_number: day,
      primary_skill: skill,
      task_ids: selectedIds,
      total_tasks: selectedIds.length,
      estimated_duration_seconds: elapsed,
      scheduled_date: scheduledDate,
    });
  }

  // 4. Checkpoint at the midpoint day, one task sampled per covered skill
  const midpointDay = Math.ceil(plan.duration_days / 2);

  const checkpointDate = new Date(today);
  checkpointDate.setDate(today.getDate() + (midpointDay - 1));

  const coveredSkills = [
    ...new Set(
      lessonSpecs.filter((l) => l.day_number <= midpointDay).map((l) => l.primary_skill),
    ),
  ];

  const checkpointTaskIds: string[] = [];
  for (const skill of coveredSkills) {
    const task = allTasks.find(
      (t) => (t.primary_skill as string) === skill && !usedInPlan.has(t.id),
    );
    if (task) {
      checkpointTaskIds.push(task.id);
      usedInPlan.add(task.id);
    }
  }

  // 5. Write lessons + checkpoint in one transaction
  await db.$transaction([
    ...lessonSpecs.map((spec) =>
      db.lesson.create({
        data: {
          learner_id: learner.id,
          plan_id: planId,
          day_number: spec.day_number,
          primary_skill: spec.primary_skill as never,
          session_length: plan.daily_minutes,
          task_ids: spec.task_ids,
          estimated_duration_seconds: spec.estimated_duration_seconds,
          status: 'PENDING',
          total_tasks: spec.total_tasks,
          scheduled_date: spec.scheduled_date,
        },
      }),
    ),
    db.checkpoint.create({
      data: {
        learner_id: learner.id,
        plan_id: planId,
        task_ids: checkpointTaskIds,
        status: 'PENDING',
        scheduled_date: checkpointDate,
      },
    }),
  ]);
}
