import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { startDiagnosticSchema, submitDiagnosticSchema } from '@app/shared';
import { processAttempt } from '../lib/error-engine/attempt-processor';
import type { TaskRepository, AttemptRepository, ErrorLogRepository } from '../lib/error-engine/attempt-processor';
import type { ErrorCode, PrismaClient } from '../../generated/prisma';
import { calculateFinalResult } from '../lib/engines/diagnostic-branching';
import type { DiagnosticAttempt } from '../lib/engines/diagnostic-branching';
import {
  DEFAULT_CONFIG,
  planNextRung,
  orderRungsByPreference,
  selectNextItem,
  shouldStop,
  estimateLevel,
  type ServedItem,
  type CandidateTask,
} from '../lib/engines/diagnostic-adaptive';
import { generatePlanLessons } from '../lib/engines/plan-generator';
import { buildSkillColumns } from '../lib/skill-state';
import { TASK_SELECT } from '../lib/task-select';

const diagnostic = new Hono<AuthEnv>();

diagnostic.use('/*', withAuth);


// ─── Session climb state (persisted in DiagnosticSession.result JSON) ─────────

interface ServedRef {
  task_id: string;
  rung: number; // M-index the item was served AT
}

interface ClimbMeta {
  available_rungs: number[]; // rungs the active bank has for this learner's grade
  served: ServedRef[]; // items handed out, in order
}

// ─── Bank helpers (the only DB-touching diagnostic selection logic) ──────────

/** Distinct M-rungs (0..5) the active bank has for this grade. */
async function availableRungsForGrade(grade: number, db: PrismaClient): Promise<number[]> {
  const gradeCode = `G${grade}`;
  const tasks = await db.task.findMany({
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

/** Un-served candidate tasks tagged for exactly G{grade}:M{rung}. */
async function poolAtRung(
  grade: number,
  rung: number,
  seenIds: string[],
  db: PrismaClient,
): Promise<CandidateTask[]> {
  const cell = `G${grade}:M${rung}`;
  const tasks = await db.task.findMany({
    where: { is_active: true, grade_levels: { has: cell }, id: { notIn: seenIds } },
    select: { id: true, primary_skill: true, task_type: true, difficulty: true },
  });
  return tasks.map((t) => ({
    id: t.id,
    primary_skill: t.primary_skill,
    task_type: t.task_type,
    difficulty: t.difficulty,
  }));
}

/**
 * Pick the next item: walk rungs nearest-to-target (widening for a thin bank),
 * returning the first non-empty pool's selection. Null → the bank is exhausted.
 */
async function pickNextItem(
  grade: number,
  target: number,
  availableRungs: number[],
  seenIds: string[],
  history: ServedItem[],
  db: PrismaClient,
): Promise<{ id: string; rung: number } | null> {
  for (const rung of orderRungsByPreference(target, availableRungs)) {
    const pool = await poolAtRung(grade, rung, seenIds, db);
    const chosen = selectNextItem(pool, history, DEFAULT_CONFIG);
    if (chosen) return { id: chosen.id, rung };
  }
  return null;
}

function fetchTask(taskId: string) {
  return prisma.task.findUnique({ where: { id: taskId }, select: TASK_SELECT });
}

// ─── POST /api/diagnostic/start ──────────────────────────────────────────────

diagnostic.post('/start', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = startDiagnosticSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { learner_id } = parsed.data;
  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const completed = await prisma.diagnosticSession.findFirst({
    where: { learner_id, status: 'COMPLETED' },
    select: { id: true },
  });
  if (completed) {
    return ERRORS.CONFLICT(c, 'Diagnostic already completed for this learner');
  }

  const existing = await prisma.diagnosticSession.findFirst({
    where: { learner_id, status: 'IN_PROGRESS' },
    select: { id: true },
  });
  if (existing) {
    await prisma.diagnosticSession.update({
      where: { id: existing.id },
      data: { status: 'ABANDONED' },
    });
  }

  const availableRungs = await availableRungsForGrade(learner.grade, prisma);
  if (availableRungs.length === 0) {
    return ERRORS.UNPROCESSABLE(c, 'No diagnostic content is available for this grade yet');
  }

  // First item = the warm-up rung (empty history → planNextRung returns warmup).
  const target = planNextRung([], DEFAULT_CONFIG);
  const first = await pickNextItem(learner.grade, target, availableRungs, [], [], prisma);
  if (!first) {
    return ERRORS.UNPROCESSABLE(c, 'No diagnostic content is available for this grade yet');
  }

  const meta: ClimbMeta = {
    available_rungs: availableRungs,
    served: [{ task_id: first.id, rung: first.rung }],
  };

  const session = await prisma.diagnosticSession.create({
    data: {
      learner_id,
      status: 'IN_PROGRESS',
      weak_skills_detected: [],
      result: meta as any,
    },
    select: { id: true },
  });

  const task = await fetchTask(first.id);
  return ok(c, { session_id: session.id, task, item_number: 1 }, undefined, 201);
});

// ─── POST /api/diagnostic/submit ─────────────────────────────────────────────

diagnostic.post('/submit', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = submitDiagnosticSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { session_id, task_id, input_text, time_seconds } = parsed.data;
  const parent_id = c.get('parent_id');

  const session = await prisma.diagnosticSession.findUnique({
    where: { id: session_id },
    include: { learner: true },
  });
  if (!session) return ERRORS.NOT_FOUND(c, 'Diagnostic session not found');
  if (session.learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Diagnostic session not found');
  if (session.status !== 'IN_PROGRESS') {
    return ERRORS.UNPROCESSABLE(c, 'Session is not in progress');
  }

  const meta = (session.result as unknown as ClimbMeta | null) ?? { available_rungs: [], served: [] };

  // The submitted task must be one we served, and not already answered.
  const servedRef = meta.served.find((s) => s.task_id === task_id);
  if (!servedRef) {
    return ERRORS.UNPROCESSABLE(c, 'Task was not served for this session');
  }
  const duplicate = await prisma.attempt.findFirst({
    where: { diagnostic_session_id: session_id, task_id },
    select: { id: true },
  });
  if (duplicate) {
    return ERRORS.CONFLICT(c, 'Task already submitted for this session');
  }

  const taskRepo: TaskRepository = {
    findById: (id) => prisma.task.findUnique({ where: { id } }) as any,
  };
  const attemptRepo: AttemptRepository = {
    create: (data) =>
      prisma.attempt.create({
        data: {
          learner_id: data.learnerId,
          task_id: data.taskId,
          diagnostic_session_id: data.diagnosticSessionId,
          input_text: data.inputText,
          score: data.score,
          time_seconds: data.timeSeconds,
          self_corrected: data.selfCorrected,
          error_codes: data.errorCodes,
          context: data.context as any,
        },
        select: { id: true },
      }),
  };
  const errorLogRepo: ErrorLogRepository = {
    createMany: async ({ attemptId, errors }) => {
      if (errors.length === 0) return;
      await prisma.errorLog.createMany({
        data: errors.map((e) => ({
          attempt_id: attemptId,
          error_code: e.errorCode as ErrorCode,
          severity: e.severity,
          position_in_word: e.positionInWord ?? null,
          expected_char: e.expectedChar ?? null,
          actual_char: e.actualChar ?? null,
          context_word: e.contextWord ?? null,
        })),
      });
    },
  };

  const attemptResult = await processAttempt(
    {
      learnerId: session.learner_id,
      taskId: task_id,
      diagnosticSessionId: session_id,
      inputText: input_text,
      timeSeconds: time_seconds,
    },
    taskRepo,
    attemptRepo,
    errorLogRepo,
  );

  // Rebuild the served-item history (now including the attempt just created).
  const attempts = await prisma.attempt.findMany({
    where: { diagnostic_session_id: session_id },
    select: {
      task_id: true,
      score: true,
      time_seconds: true,
      error_codes: true,
      task: { select: { primary_skill: true, estimated_time_seconds: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  const rungByTask = new Map(meta.served.map((s) => [s.task_id, s.rung]));
  const history: ServedItem[] = attempts.map((a) => ({
    task_id: a.task_id,
    rung: rungByTask.get(a.task_id) ?? meta.available_rungs[0] ?? 0,
    primary_skill: a.task.primary_skill,
    score: a.score,
    error_codes: a.error_codes,
    time_seconds: a.time_seconds,
    estimated_time_seconds: a.task.estimated_time_seconds,
  }));

  const base = {
    score: attemptResult.score,
    is_correct: attemptResult.isCorrect,
    error_codes: attemptResult.errorCodes,
    feedback: attemptResult.feedback,
  };

  // Continue unless the climb says stop; when continuing, try to serve an item.
  const stop = shouldStop(history, DEFAULT_CONFIG, meta.available_rungs);
  let next: { id: string; rung: number } | null = null;
  if (!stop.stop) {
    const target = planNextRung(history, DEFAULT_CONFIG);
    const seenIds = attempts.map((a) => a.task_id);
    next = await pickNextItem(session.learner.grade, target, meta.available_rungs, seenIds, history, prisma);
  }

  if (!stop.stop && next) {
    const newMeta: ClimbMeta = {
      ...meta,
      served: [...meta.served, { task_id: next.id, rung: next.rung }],
    };
    await prisma.diagnosticSession.update({
      where: { id: session_id },
      data: { result: newMeta as any },
    });
    const nextTask = await fetchTask(next.id);
    return ok(c, {
      ...base,
      completed: false,
      next_task: nextTask,
      item_number: history.length + 1,
    });
  }

  // ── Finalize (climb stopped, or the bank is exhausted) ────────────────────

  const diagAttempts: DiagnosticAttempt[] = history.map((h) => ({
    task_id: h.task_id,
    primary_skill: h.primary_skill,
    score: h.score,
    error_codes: h.error_codes,
  }));

  const skillPart = calculateFinalResult(diagAttempts, session.learner.grade);
  const levelEst = estimateLevel(history, meta.available_rungs, DEFAULT_CONFIG);

  // general_level now comes from the adaptive climb; skills/errors from skillPart.
  const finalResult = {
    general_level: levelEst.level,
    level_confidence: levelEst.confidence,
    bank_coverage: levelEst.bank_coverage,
    capped_by_bank: levelEst.capped_by_bank,
    confidence: skillPart.confidence,
    skill_levels: skillPart.skill_levels,
    skill_scores: skillPart.skill_scores,
    skill_confidence: skillPart.skill_confidence,
    top_error_codes: skillPart.top_error_codes,
    priority_skills: skillPart.priority_skills,
    recommended_daily_minutes: skillPart.recommended_daily_minutes,
  };

  const avgScore = Object.values(skillPart.skill_scores).reduce((a, b) => a + b, 0) / 8;
  const template = avgScore < 0.4 ? 'INTENSIVE' : avgScore < 0.7 ? 'BALANCED' : 'STABILIZATION';

  const skillStateData = {
    general_level: finalResult.general_level,
    ...buildSkillColumns(skillPart),
    top_error_codes: skillPart.top_error_codes,
    weak_skills: skillPart.priority_skills,
    preferred_session_length: skillPart.recommended_daily_minutes,
  } as any;

  const [, , newPlan] = (await prisma.$transaction([
    prisma.diagnosticSession.update({
      where: { id: session_id },
      data: {
        status: 'COMPLETED',
        result: finalResult as any,
        weak_skills_detected: skillPart.priority_skills,
        completed_at: new Date(),
      },
    }),
    prisma.learnerSkillState.upsert({
      where: { learner_id: session.learner_id },
      create: {
        learner_id: session.learner_id,
        ...skillStateData,
        recent_error_codes: [],
        recent_task_ids: [],
      },
      update: skillStateData,
    }),
    prisma.plan.create({
      data: {
        learner_id: session.learner_id,
        template: template as any,
        status: 'ACTIVE',
        priority_skills: skillPart.priority_skills,
        target_errors: skillPart.top_error_codes,
        daily_minutes: skillPart.recommended_daily_minutes,
        duration_days: 14,
        source: 'DIAGNOSTIC',
      },
      select: { id: true },
    }),
  ])) as any;

  // Completion (session + skill state + plan) is already committed above; lesson
  // generation failing must not fail the request, but must be surfaced so the
  // client knows the plan may have zero lessons.
  let lessons_generated = true;
  await generatePlanLessons(newPlan.id, prisma).catch((err) => {
    lessons_generated = false;
    const reqId = (c.get('requestId') as string | undefined) ?? null;
    console.error(JSON.stringify({
      ts: new Date().toISOString(),
      request_id: reqId,
      method: c.req.method,
      path: c.req.path,
      error: `generatePlanLessons failed (non-fatal) for plan ${newPlan.id}: ${err instanceof Error ? err.message : String(err)}`,
      stack: err instanceof Error ? err.stack : undefined,
    }));
  });

  return ok(c, { ...base, completed: true, result: finalResult, plan_id: newPlan.id, lessons_generated });
});

// ─── GET /api/diagnostic/result/:sessionId ───────────────────────────────────

diagnostic.get('/result/:sessionId', async (c) => {
  const sessionId = c.req.param('sessionId');
  const parent_id = c.get('parent_id');

  const session = await prisma.diagnosticSession.findUnique({
    where: { id: sessionId },
    include: { learner: true },
  });
  if (!session) return ERRORS.NOT_FOUND(c, 'Diagnostic session not found');
  if (session.learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Diagnostic session not found');
  if (session.status !== 'COMPLETED') {
    return ERRORS.UNPROCESSABLE(c, 'Session is not yet completed');
  }

  return ok(c, { result: session.result });
});

export default diagnostic;
