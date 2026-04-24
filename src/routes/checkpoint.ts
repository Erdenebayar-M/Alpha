import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok, fail } from '../lib/response';
import { processAttempt } from '../lib/error-engine/attempt-processor';
import type { TaskRepository } from '../lib/error-engine/attempt-processor';
import type { ErrorCode } from '../../generated/prisma';
import { updateSkillState } from '../lib/engines/skill-engine';
import { generatePlanLessons } from '../lib/engines/plan-generator';
import { checkpointSubmitSchema } from '../lib/validators/checkpoint';

const checkpoint = new Hono<AuthEnv>();
checkpoint.use('/*', withAuth);

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_SELECT = {
  id: true,
  task_type: true,
  title: true,
  prompt_text: true,
  options: true,
  audio_url: true,
  image_url: true,
  primary_skill: true,
  estimated_time_seconds: true,
} as const;

const SKILL_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'] as const;

// avg delta > +10% → LEVEL_UP; avg delta < 0 → NEW_PLAN; else → CONTINUE_PLAN
const LEVEL_UP_THRESHOLD = 0.10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractScores(state: Record<string, unknown> | null): Record<string, number> {
  const result: Record<string, number> = {};
  for (const sk of SKILL_KEYS) {
    result[sk] = state ? ((state[`${sk}_score`] as number) ?? 0) : 0;
  }
  return result;
}

function computeDeltas(
  before: Record<string, number>,
  after: Record<string, number>,
): Record<string, number> {
  const deltas: Record<string, number> = {};
  for (const sk of SKILL_KEYS) {
    deltas[sk] = (after[sk] ?? 0) - (before[sk] ?? 0);
  }
  return deltas;
}

// ─── GET /api/checkpoint?learner_id=<id> ─────────────────────────────────────

checkpoint.get('/', async (c) => {
  const learner_id = c.req.query('learner_id');
  if (!learner_id) return ERRORS.VALIDATION_ERROR(c, 'learner_id is required');

  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const checkpointRecord = await prisma.checkpoint.findFirst({
    where: { plan: { learner_id }, status: 'PENDING' },
  });
  if (!checkpointRecord) {
    return fail(c, 'NO_PENDING_CHECKPOINT', 'No pending checkpoint', undefined, 404);
  }

  const tasks = await prisma.task.findMany({
    where: { id: { in: checkpointRecord.task_ids } },
    select: TASK_SELECT,
  });

  return ok(c, { checkpoint: { ...checkpointRecord, tasks } });
});

// ─── POST /api/checkpoint/submit ─────────────────────────────────────────────

checkpoint.post('/submit', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = checkpointSubmitSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { checkpoint_id, answers } = parsed.data;
  const parent_id = c.get('parent_id');

  const checkpointRecord = await prisma.checkpoint.findUnique({
    where: { id: checkpoint_id },
    include: { plan: { include: { learner: true } } },
  });
  if (!checkpointRecord) return ERRORS.NOT_FOUND(c, 'Checkpoint not found');
  if (checkpointRecord.plan.learner.parent_id !== parent_id) {
    return ERRORS.NOT_FOUND(c, 'Checkpoint not found');
  }

  const learnerId = checkpointRecord.learner_id;
  const plan = checkpointRecord.plan;

  // Snapshot skill state before processing answers
  const beforeState = await prisma.learnerSkillState.findUnique({
    where: { learner_id: learnerId },
  });
  const beforeScores = extractScores(beforeState as unknown as Record<string, unknown> | null);

  const taskRepo: TaskRepository = {
    findById: (id) => prisma.task.findUnique({ where: { id } }) as never,
  };

  // Process each answer: score → write attempt → update skill state
  for (const answer of answers) {
    const result = await processAttempt(
      {
        learnerId,
        taskId: answer.task_id,
        inputText: answer.input_text,
        timeSeconds: answer.time_seconds,
      },
      taskRepo,
    );

    const attempt = await prisma.attempt.create({
      data: {
        learner_id: learnerId,
        task_id: answer.task_id,
        checkpoint_id,
        input_text: answer.input_text,
        score: result.score,
        time_seconds: answer.time_seconds,
        self_corrected: result.selfCorrected,
        error_codes: result.errorCodes,
        context: 'CHECKPOINT',
      },
      select: { id: true },
    });

    if (result.errorsDetail.length > 0) {
      await prisma.errorLog.createMany({
        data: result.errorsDetail.map((e) => ({
          attempt_id: attempt.id,
          error_code: e.errorCode as ErrorCode,
          severity: e.severity,
          position_in_word: e.position ?? null,
          expected_char: e.expectedChar ?? null,
          actual_char: e.actualChar ?? null,
          context_word: e.contextWord ?? null,
        })),
      });
    }

    const taskRecord = await prisma.task.findUnique({
      where: { id: answer.task_id },
      select: { primary_skill: true },
    });

    if (taskRecord?.primary_skill) {
      await updateSkillState(
        {
          learnerId,
          primarySkill: taskRecord.primary_skill,
          score: result.score,
          errorCodes: result.errorCodes,
          taskId: answer.task_id,
        },
        prisma,
      );
    }
  }

  // Compute deltas vs. pre-checkpoint snapshot
  const afterState = await prisma.learnerSkillState.findUnique({
    where: { learner_id: learnerId },
  });
  const afterScores = extractScores(afterState as unknown as Record<string, unknown> | null);
  const skill_deltas = computeDeltas(beforeScores, afterScores);

  const avgDelta =
    Object.values(skill_deltas).reduce((sum, v) => sum + v, 0) / SKILL_KEYS.length;

  let decision: 'CONTINUE_PLAN' | 'NEW_PLAN' | 'LEVEL_UP';
  if (avgDelta > LEVEL_UP_THRESHOLD) {
    decision = 'LEVEL_UP';
  } else if (avgDelta < 0) {
    decision = 'NEW_PLAN';
  } else {
    decision = 'CONTINUE_PLAN';
  }

  let new_plan_id: string | undefined;

  if (decision === 'NEW_PLAN') {
    // Deactivate old plan first (@@unique([learner_id, is_active]) requires this)
    await prisma.plan.update({
      where: { id: plan.id },
      data: { status: 'REPLACED', is_active: false, ended_at: new Date() },
    });

    const newPlan = await prisma.plan.create({
      data: {
        learner_id: learnerId,
        template: plan.template,
        priority_skills: afterState?.weak_skills ?? plan.priority_skills,
        target_errors: afterState?.top_error_codes ?? plan.target_errors,
        daily_minutes: plan.daily_minutes,
        duration_days: plan.duration_days,
        source: 'CHECKPOINT',
        is_active: true,
        status: 'ACTIVE',
      },
    });

    await generatePlanLessons(newPlan.id, prisma);
    new_plan_id = newPlan.id;
  }

  await prisma.checkpoint.update({
    where: { id: checkpoint_id },
    data: {
      status: 'COMPLETED',
      decision,
      completed_at: new Date(),
      result: { skill_deltas, new_plan_needed: decision === 'NEW_PLAN' },
    },
  });

  return ok(c, {
    decision,
    skill_deltas,
    ...(new_plan_id ? { new_plan_id } : {}),
  });
});

export default checkpoint;
