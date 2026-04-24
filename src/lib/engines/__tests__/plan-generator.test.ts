import { generatePlanLessons } from '../plan-generator';
import type { PrismaClient } from '../../../../generated/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-default',
    primary_skill: 'S7',
    level_target: 'M0',
    grade_band: ['G1', 'G2'],
    estimated_time_seconds: 120,
    difficulty: 1,
    is_diagnostic: false,
    ...overrides,
  };
}

function makeSkillState(overrides: Record<string, unknown> = {}) {
  return {
    general_level: 'M0',
    recent_task_ids: [] as string[],
    ...overrides,
  };
}

function makePlan(overrides: Record<string, unknown> = {}) {
  const learnerOverrides = (overrides.learner as Record<string, unknown>) ?? {};
  delete overrides.learner;

  return {
    id: 'plan-1',
    learner_id: 'learner-1',
    template: 'BALANCED',
    status: 'ACTIVE',
    priority_skills: ['S7'],
    target_errors: [],
    daily_minutes: 10,
    duration_days: 7,
    source: 'DIAGNOSTIC',
    started_at: new Date(),
    learner: {
      id: 'learner-1',
      variant: 'A',
      daily_minutes: 10,
      skill_state: makeSkillState(),
      ...learnerOverrides,
    },
    ...overrides,
  };
}

interface MockDbOpts {
  plan?: ReturnType<typeof makePlan>;
  taskPool?: ReturnType<typeof makeTask>[];
}

function makeMockDb(opts: MockDbOpts = {}) {
  const plan = opts.plan ?? makePlan();
  const taskPool = opts.taskPool ?? [];

  const lessonCreate = jest.fn().mockResolvedValue({});
  const checkpointCreate = jest.fn().mockResolvedValue({});

  // Smart mock: apply the notIn filter so dedup tests work correctly
  const taskFindMany = jest.fn().mockImplementation(async (args: any) => {
    const notIn: string[] = args?.where?.id?.notIn ?? [];
    return taskPool.filter((t) => !notIn.includes(t.id));
  });

  // $transaction receives PrismaPromises (already created); just resolve them all
  const $transaction = jest
    .fn()
    .mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));

  const db = {
    plan: {
      findUniqueOrThrow: jest.fn().mockResolvedValue(plan),
    },
    task: {
      findMany: taskFindMany,
    },
    lesson: {
      create: lessonCreate,
    },
    checkpoint: {
      create: checkpointCreate,
    },
    $transaction,
  } as unknown as PrismaClient;

  return { db, lessonCreate, checkpointCreate, taskFindMany, $transaction };
}

// ─── Helper: extract `data` arg from mock call ────────────────────────────────

function lessonData(mock: jest.Mock, callIndex: number) {
  return mock.mock.calls[callIndex][0].data as Record<string, unknown>;
}

function checkpointData(mock: jest.Mock) {
  return mock.mock.calls[0][0].data as Record<string, unknown>;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generatePlanLessons', () => {
  describe('row counts', () => {
    test('7-day plan creates exactly 7 Lesson rows and 1 Checkpoint row', async () => {
      const tasks = Array.from({ length: 20 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 60 }),
      );
      const { db, lessonCreate, checkpointCreate } = makeMockDb({ taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      expect(lessonCreate).toHaveBeenCalledTimes(7);
      expect(checkpointCreate).toHaveBeenCalledTimes(1);
    });

    test('14-day plan creates exactly 14 Lesson rows and 1 Checkpoint row', async () => {
      const tasks = Array.from({ length: 40 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 60 }),
      );
      const plan = makePlan({ duration_days: 14 });
      const { db, lessonCreate, checkpointCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      expect(lessonCreate).toHaveBeenCalledTimes(14);
      expect(checkpointCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('task deduplication', () => {
    test('tasks in recent_task_ids are never assigned to any lesson', async () => {
      const recentId = 'task-recent';
      // Pool includes the recent task — the smart mock will exclude it via notIn
      const tasks = [
        makeTask({ id: recentId }),
        makeTask({ id: 'task-ok-1', estimated_time_seconds: 60 }),
        makeTask({ id: 'task-ok-2', estimated_time_seconds: 60 }),
      ];
      const plan = makePlan({
        learner: { skill_state: makeSkillState({ recent_task_ids: [recentId] }) },
      });
      const { db, lessonCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const allAssignedIds = lessonCreate.mock.calls.flatMap(
        (call) => call[0].data.task_ids as string[],
      );
      expect(allAssignedIds).not.toContain(recentId);
    });

    test('a task assigned on day N is not assigned again on day N+1', async () => {
      // Only 2 unique tasks; 7-day plan → tasks run out but never repeat
      const tasks = [
        makeTask({ id: 'task-a', estimated_time_seconds: 60 }),
        makeTask({ id: 'task-b', estimated_time_seconds: 60 }),
      ];
      const { db, lessonCreate } = makeMockDb({ taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const allAssignedIds = lessonCreate.mock.calls.flatMap(
        (call) => call[0].data.task_ids as string[],
      );
      const uniqueIds = new Set(allAssignedIds);
      expect(uniqueIds.size).toBe(allAssignedIds.length); // no duplicates
    });
  });

  describe('daily time budget', () => {
    test('sum of task times never exceeds daily_minutes × 60', async () => {
      // Budget: 5 min = 300 s. Tasks: 180 s each → only 1 fits (180 < 300; 360 > 300)
      const tasks = Array.from({ length: 10 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 180 }),
      );
      const plan = makePlan({ daily_minutes: 5 });
      const { db, lessonCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const budget = 5 * 60;
      for (const call of lessonCreate.mock.calls) {
        const { estimated_duration_seconds } = call[0].data as { estimated_duration_seconds: number };
        expect(estimated_duration_seconds).toBeLessThanOrEqual(budget);
      }
    });

    test('packs as many tasks as fit without exceeding budget', async () => {
      // Budget: 10 min = 600 s. Tasks: 200 s each → 2 fit (400 < 600; 600 = ok, 800 > 600)
      // But 200+200 = 400 ≤ 600; 400+200 = 600 ≤ 600; so 3 fit (600 exactly)
      const tasks = Array.from({ length: 10 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 200 }),
      );
      const plan = makePlan({ daily_minutes: 10 }); // 600 s budget
      const { db, lessonCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      // Day 1: 3 tasks (600 s exactly). After that pool is exhausted.
      const firstDayData = lessonData(lessonCreate, 0);
      expect((firstDayData.task_ids as string[]).length).toBe(3);
      expect(firstDayData.estimated_duration_seconds).toBe(600);
    });
  });

  describe('skill rotation', () => {
    test('uses canonical priority order (S7 before S2 before S3…) regardless of input order', async () => {
      // priority_skills in reverse canonical order → generator must sort them
      const tasks = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeTask({ id: `s7-${i}`, primary_skill: 'S7', estimated_time_seconds: 60 }),
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeTask({ id: `s3-${i}`, primary_skill: 'S3', estimated_time_seconds: 60 }),
        ),
      ];
      // Provide S3 before S7 — generator must reorder to canonical (S7 first)
      const plan = makePlan({ priority_skills: ['S3', 'S7'], duration_days: 4 });
      const { db, lessonCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const skills = lessonCreate.mock.calls.map((c) => c[0].data.primary_skill as string);
      // canonical order: S7 → S3 → S7 → S3
      expect(skills[0]).toBe('S7');
      expect(skills[1]).toBe('S3');
      expect(skills[2]).toBe('S7');
      expect(skills[3]).toBe('S3');
    });

    test('cycles through all priority skills across days', async () => {
      const tasks = [
        ...Array.from({ length: 10 }, (_, i) =>
          makeTask({ id: `s7-${i}`, primary_skill: 'S7', estimated_time_seconds: 60 }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          makeTask({ id: `s2-${i}`, primary_skill: 'S2', estimated_time_seconds: 60 }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          makeTask({ id: `s3-${i}`, primary_skill: 'S3', estimated_time_seconds: 60 }),
        ),
      ];
      const plan = makePlan({ priority_skills: ['S7', 'S2', 'S3'], duration_days: 7 });
      const { db, lessonCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const skills = lessonCreate.mock.calls.map((c) => c[0].data.primary_skill as string);
      // 7 days, 3 skills → S7 S2 S3 S7 S2 S3 S7
      expect(skills).toEqual(['S7', 'S2', 'S3', 'S7', 'S2', 'S3', 'S7']);
    });
  });

  describe('checkpoint placement', () => {
    test('7-day plan places checkpoint at day 4 (midpoint)', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + 3); // day 4 = today + 3

      const tasks = Array.from({ length: 20 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 60 }),
      );
      const plan = makePlan({ duration_days: 7 });
      const { db, checkpointCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const { scheduled_date } = checkpointData(checkpointCreate);
      expect((scheduled_date as Date).toDateString()).toBe(expectedDate.toDateString());
    });

    test('14-day plan places checkpoint at day 7 (midpoint)', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() + 6); // day 7 = today + 6

      const tasks = Array.from({ length: 50 }, (_, i) =>
        makeTask({ id: `task-${i}`, estimated_time_seconds: 60 }),
      );
      const plan = makePlan({ duration_days: 14 });
      const { db, checkpointCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const { scheduled_date } = checkpointData(checkpointCreate);
      expect((scheduled_date as Date).toDateString()).toBe(expectedDate.toDateString());
    });

    test('checkpoint task_ids are drawn from skills covered up to the midpoint', async () => {
      // 3-skill rotation; 6-day plan → midpoint = day 3 → S7, S2, S3 covered.
      // Budget: 5 min (300 s). Tasks: 200 s each → 1 fits per day, leaving spare
      // tasks in each skill pool for the checkpoint to draw from.
      const tasks = [
        ...Array.from({ length: 5 }, (_, i) =>
          makeTask({ id: `s7-${i}`, primary_skill: 'S7', estimated_time_seconds: 200 }),
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeTask({ id: `s2-${i}`, primary_skill: 'S2', estimated_time_seconds: 200 }),
        ),
        ...Array.from({ length: 5 }, (_, i) =>
          makeTask({ id: `s3-${i}`, primary_skill: 'S3', estimated_time_seconds: 200 }),
        ),
      ];
      const plan = makePlan({ priority_skills: ['S7', 'S2', 'S3'], duration_days: 6, daily_minutes: 5 });
      const { db, checkpointCreate } = makeMockDb({ plan, taskPool: tasks });

      await generatePlanLessons('plan-1', db);

      const { task_ids } = checkpointData(checkpointCreate) as { task_ids: string[] };
      // Checkpoint should have at least 1 task; IDs must come from the pool
      expect(task_ids.length).toBeGreaterThan(0);
      const allPoolIds = tasks.map((t) => t.id);
      for (const id of task_ids) {
        expect(allPoolIds).toContain(id);
      }
    });
  });
});
