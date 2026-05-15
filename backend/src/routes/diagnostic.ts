import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok } from '../lib/response';
import { startDiagnosticSchema, submitDiagnosticSchema, nextPhaseSchema } from '@app/shared';
import { processAttempt } from '../lib/error-engine/attempt-processor';
import type { TaskRepository, AttemptRepository, ErrorLogRepository } from '../lib/error-engine/attempt-processor';
import type { ErrorCode } from '../../generated/prisma';
import { selectPhaseB, calculateFinalResult, shouldBypassPhaseB } from '../lib/engines/diagnostic-branching';
import type { PhaseAAttempt, DiagnosticAttempt } from '../lib/engines/diagnostic-branching';
import { generatePlanLessons } from '../lib/engines/plan-generator';

const diagnostic = new Hono<AuthEnv>();

diagnostic.use('/*', withAuth);

const ALL_SKILLS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;
const PHASE_TOTALS = { PHASE_A: 8, PHASE_B: 8, PHASE_C: 4 } as const;

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

  const existing = await prisma.diagnosticSession.findFirst({
    where: { learner_id, status: 'IN_PROGRESS' },
  });
  if (existing) {
    return ERRORS.CONFLICT(c, 'A diagnostic session is already in progress');
  }

  const gradeBands = learner.variant === 'A' ? ['G1', 'G2'] : ['G2', 'G3', 'G4'];

  const taskResults = await Promise.all(
    ALL_SKILLS.map((skill) =>
      prisma.task.findFirst({
        where: {
          primary_skill: skill as any,
          grade_band: { hasSome: gradeBands },
        },
        orderBy: { difficulty: 'asc' },
        select: {
          id: true,
          task_type: true,
          title: true,
          prompt_text: true,
          options: true,
          audio_url: true,
          image_url: true,
          primary_skill: true,
          estimated_time_seconds: true,
        },
      }),
    ),
  );

  const tasks = taskResults.filter((t): t is NonNullable<typeof t> => t !== null);

  const session = await prisma.diagnosticSession.create({
    data: {
      learner_id,
      status: 'IN_PROGRESS',
      current_phase: 'PHASE_A',
      weak_skills_detected: [],
      result: { _counts: { a: tasks.length, b: 0 } },
    },
    select: { id: true },
  });

  return ok(c, { session_id: session.id, phase: 'A', tasks, total_phases: 3 }, undefined, 201);
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

  const result = await processAttempt(
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

  const completedCount = await prisma.attempt.count({
    where: { diagnostic_session_id: session_id },
  });

  const phaseTotal = PHASE_TOTALS[session.current_phase];

  const sessionMeta = (session.result as Record<string, any> | null) ?? {};
  const phaseOffset =
    session.current_phase === 'PHASE_A' ? 0 :
    session.current_phase === 'PHASE_B' ? (sessionMeta._counts?.a ?? 8) :
    (sessionMeta._counts?.a ?? 8) + (sessionMeta._counts?.b ?? (session.phase_b_completed ? 8 : 0));

  return ok(c, {
    score: result.score,
    is_correct: result.isCorrect,
    error_codes: result.errorCodes,
    feedback: result.feedback,
    phase_progress: {
      completed: Math.min(completedCount - phaseOffset, phaseTotal),
      total: phaseTotal,
    },
  });
});

// ─── POST /api/diagnostic/next-phase ─────────────────────────────────────────

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

diagnostic.post('/next-phase', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = nextPhaseSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { session_id } = parsed.data;
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

  const attempts = await prisma.attempt.findMany({
    where: { diagnostic_session_id: session_id },
    select: {
      task_id: true,
      score: true,
      error_codes: true,
      task: { select: { primary_skill: true } },
    },
    orderBy: { created_at: 'asc' },
  });

  // ── PHASE_A → PHASE_B ────────────────────────────────────────────────────

  if (session.current_phase === 'PHASE_A') {
    const meta = (session.result as Record<string, any> | null) ?? {};
    const phaseAExpected: number = meta._counts?.a ?? 8;

    if (attempts.length < phaseAExpected) {
      return ERRORS.UNPROCESSABLE(
        c,
        `Phase A is not complete: ${attempts.length} of ${phaseAExpected} tasks submitted`,
      );
    }

    const phaseAAttempts: PhaseAAttempt[] = attempts.slice(0, phaseAExpected).map((a) => ({
      task_id: a.task_id,
      primary_skill: a.task.primary_skill,
      score: a.score,
      error_codes: a.error_codes,
    }));

    if (shouldBypassPhaseB(phaseAAttempts)) {
      const seenIds = attempts.map((a) => a.task_id);
      const partial = calculateFinalResult(
        phaseAAttempts.map((a) => ({ ...a, primary_skill: a.primary_skill })),
        session.learner.grade,
      );

      const [mixedDictation, sentenceDictation, correction, boundary] = await Promise.all([
        prisma.task.findFirst({
          where: { task_type: 'TT4_DICTATION', id: { notIn: seenIds } },
          orderBy: { difficulty: 'asc' },
          select: TASK_SELECT,
        }),
        prisma.task.findFirst({
          where: { task_type: 'TT5_MINI_TEXT', id: { notIn: seenIds } },
          orderBy: { difficulty: 'asc' },
          select: TASK_SELECT,
        }),
        prisma.task.findFirst({
          where: { task_type: 'TT3_CORRECTION', id: { notIn: seenIds } },
          orderBy: { difficulty: 'asc' },
          select: TASK_SELECT,
        }),
        prisma.task.findFirst({
          where: { id: { notIn: seenIds }, difficulty: { gte: 3 } },
          orderBy: { difficulty: 'desc' },
          select: TASK_SELECT,
        }),
      ]);

      const tasks = [mixedDictation, sentenceDictation, correction, boundary].filter(
        (t): t is NonNullable<typeof t> => t !== null,
      );

      await prisma.diagnosticSession.update({
        where: { id: session_id },
        data: {
          phase_a_completed: true,
          phase_b_completed: false,
          current_phase: 'PHASE_C',
          weak_skills_detected: [],
          result: { ...meta, _counts: { a: phaseAExpected, b: 0, c: tasks.length } },
        },
      });

      return ok(c, { phase: 'C', tasks, estimated_level: partial.general_level, bypassed_phase_b: true });
    }

    const { weakSkills, phaseBTaskIds } = await selectPhaseB(phaseAAttempts, prisma);

    const tasks = await prisma.task.findMany({
      where: { id: { in: phaseBTaskIds } },
      select: TASK_SELECT,
    });

    await prisma.diagnosticSession.update({
      where: { id: session_id },
      data: {
        phase_a_completed: true,
        current_phase: 'PHASE_B',
        weak_skills_detected: weakSkills,
        result: { ...meta, _counts: { a: phaseAExpected, b: tasks.length } },
      },
    });

    return ok(c, { phase: 'B', tasks, weak_skills: weakSkills });
  }

  // ── PHASE_B → PHASE_C ────────────────────────────────────────────────────

  if (session.current_phase === 'PHASE_B') {
    const meta = (session.result as Record<string, any> | null) ?? {};
    const phaseACount: number = meta._counts?.a ?? 8;
    const phaseBCount: number = meta._counts?.b ?? 8;
    const phaseABExpected = phaseACount + phaseBCount;

    if (attempts.length < phaseABExpected) {
      return ERRORS.UNPROCESSABLE(
        c,
        `Phase B is not complete: ${attempts.length - phaseACount} of ${phaseBCount} tasks submitted`,
      );
    }

    const phaseABAttempts: DiagnosticAttempt[] = attempts.slice(0, phaseABExpected).map((a) => ({
      task_id: a.task_id,
      primary_skill: a.task.primary_skill,
      score: a.score,
      error_codes: a.error_codes,
    }));

    const partial = calculateFinalResult(phaseABAttempts, session.learner.grade);
    const estimated_level = partial.general_level;
    const seenIds = attempts.map((a) => a.task_id);

    const [mixedDictation, sentenceDictation, correction, boundary] = await Promise.all([
      prisma.task.findFirst({
        where: { task_type: 'TT4_DICTATION', id: { notIn: seenIds } },
        orderBy: { difficulty: 'asc' },
        select: TASK_SELECT,
      }),
      prisma.task.findFirst({
        where: { task_type: 'TT5_MINI_TEXT', id: { notIn: seenIds } },
        orderBy: { difficulty: 'asc' },
        select: TASK_SELECT,
      }),
      prisma.task.findFirst({
        where: { task_type: 'TT3_CORRECTION', id: { notIn: seenIds } },
        orderBy: { difficulty: 'asc' },
        select: TASK_SELECT,
      }),
      prisma.task.findFirst({
        where: { id: { notIn: seenIds }, difficulty: { gte: 3 } },
        orderBy: { difficulty: 'desc' },
        select: TASK_SELECT,
      }),
    ]);

    const tasks = [mixedDictation, sentenceDictation, correction, boundary].filter(
      (t): t is NonNullable<typeof t> => t !== null,
    );

    await prisma.diagnosticSession.update({
      where: { id: session_id },
      data: {
        phase_b_completed: true,
        current_phase: 'PHASE_C',
        result: { ...meta, _counts: { ...meta._counts, c: tasks.length } },
      },
    });

    return ok(c, { phase: 'C', tasks, estimated_level });
  }

  // ── PHASE_C → COMPLETED ──────────────────────────────────────────────────

  if (session.current_phase === 'PHASE_C') {
    const meta = (session.result as Record<string, any> | null) ?? {};
    const phaseACount: number = meta._counts?.a ?? 8;
    const phaseBCount: number = meta._counts?.b ?? (session.phase_b_completed ? 8 : 0);
    const phaseCCount: number = meta._counts?.c ?? 4;
    const phaseOffset = phaseACount + phaseBCount;
    const expectedTotal = phaseOffset + phaseCCount;

    if (attempts.length < expectedTotal) {
      return ERRORS.UNPROCESSABLE(
        c,
        `Phase C is not complete: ${attempts.length - phaseOffset} of ${phaseCCount} tasks submitted`,
      );
    }

    const allAttempts: DiagnosticAttempt[] = attempts.slice(0, expectedTotal).map((a) => ({
      task_id: a.task_id,
      primary_skill: a.task.primary_skill,
      score: a.score,
      error_codes: a.error_codes,
    }));

    const finalResult = calculateFinalResult(allAttempts, session.learner.grade);

    const confidence = finalResult.confidence as any;
    const avgScore =
      Object.values(finalResult.skill_scores).reduce((a, b) => a + b, 0) / 8;
    const template =
      avgScore < 0.4 ? 'INTENSIVE' : avgScore < 0.7 ? 'BALANCED' : 'STABILIZATION';

    const skillStateData = {
      general_level: finalResult.general_level as any,
      s1_score: finalResult.skill_scores['S1'],
      s2_score: finalResult.skill_scores['S2'],
      s3_score: finalResult.skill_scores['S3'],
      s4_score: finalResult.skill_scores['S4'],
      s5_score: finalResult.skill_scores['S5'],
      s6_score: finalResult.skill_scores['S6'],
      s7_score: finalResult.skill_scores['S7'],
      s8_score: finalResult.skill_scores['S8'],
      s1_level: finalResult.skill_levels['S1'] as any,
      s2_level: finalResult.skill_levels['S2'] as any,
      s3_level: finalResult.skill_levels['S3'] as any,
      s4_level: finalResult.skill_levels['S4'] as any,
      s5_level: finalResult.skill_levels['S5'] as any,
      s6_level: finalResult.skill_levels['S6'] as any,
      s7_level: finalResult.skill_levels['S7'] as any,
      s8_level: finalResult.skill_levels['S8'] as any,
      s1_confidence: confidence,
      s2_confidence: confidence,
      s3_confidence: confidence,
      s4_confidence: confidence,
      s5_confidence: confidence,
      s6_confidence: confidence,
      s7_confidence: confidence,
      s8_confidence: confidence,
      top_error_codes: finalResult.top_error_codes,
      weak_skills: finalResult.priority_skills,
      preferred_session_length: finalResult.recommended_daily_minutes,
    };

    const [, , newPlan] = await prisma.$transaction([
      prisma.diagnosticSession.update({
        where: { id: session_id },
        data: {
          status: 'COMPLETED',
          result: finalResult as any,
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
          priority_skills: finalResult.priority_skills,
          target_errors: finalResult.top_error_codes,
          daily_minutes: finalResult.recommended_daily_minutes,
          duration_days: 14,
          source: 'DIAGNOSTIC',
        },
        select: { id: true },
      }),
    ]) as any;

    await generatePlanLessons(newPlan.id, prisma);

    return ok(c, { completed: true, result: finalResult, plan_id: newPlan.id });
  }

  return ERRORS.UNPROCESSABLE(c, 'Session is in an unexpected phase state');
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
