import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { ok, fail } from '../lib/response';
import { processAttempt } from '../lib/error-engine/attempt-processor';
import type { TaskRepository, AttemptRepository, ErrorLogRepository } from '../lib/error-engine/attempt-processor';
import type { ErrorCode } from '../../generated/prisma';
import { updateSkillState } from '../lib/engines/skill-engine';
import { lessonAttemptSchema } from '@app/shared';
import { learnerIdQuerySchema } from '@app/shared';

const lesson = new Hono<AuthEnv>();

lesson.use('/*', withAuth);

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

// ─── GET /today?learner_id=... ────────────────────────────────────────────────

lesson.get('/today', async (c) => {
  const parsedQuery = learnerIdQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid query parameters', parsedQuery.error.flatten().fieldErrors);
  }
  const { learner_id } = parsedQuery.data;
  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Learner not found');

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const lessonRecord = await prisma.lesson.findFirst({
    where: {
      learner_id,
      scheduled_date: today,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
  });
  if (!lessonRecord) return fail(c, 'NO_LESSON_TODAY', 'No lesson scheduled for today', undefined, 404);

  const tasks = await prisma.task.findMany({
    where: { id: { in: lessonRecord.task_ids } },
    select: TASK_SELECT,
  });

  let updatedLesson = lessonRecord;
  if (lessonRecord.status === 'PENDING') {
    updatedLesson = await prisma.lesson.update({
      where: { id: lessonRecord.id },
      data: { status: 'IN_PROGRESS', started_at: new Date() },
    });
  }

  return ok(c, { lesson: { ...updatedLesson, tasks } });
});

// ─── POST /attempt ────────────────────────────────────────────────────────────

lesson.post('/attempt', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = lessonAttemptSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR(c, 'Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { lesson_id, task_id, input_text, time_seconds } = parsed.data;
  const parent_id = c.get('parent_id');

  const lessonRecord = await prisma.lesson.findUnique({
    where: { id: lesson_id },
    include: { learner: true },
  });
  if (!lessonRecord) return ERRORS.NOT_FOUND(c, 'Lesson not found');
  if (lessonRecord.learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Lesson not found');

  const duplicate = await prisma.attempt.findFirst({
    where: { lesson_id, task_id },
    select: { id: true },
  });
  if (duplicate) return ERRORS.CONFLICT(c, 'Task already submitted for this lesson');

  const taskRepo: TaskRepository = {
    findById: (id) => prisma.task.findUnique({ where: { id } }) as any,
  };

  const attemptRepo: AttemptRepository = {
    create: (data) =>
      prisma.attempt.create({
        data: {
          learner_id: data.learnerId,
          task_id: data.taskId,
          lesson_id: data.lessonId,
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
      learnerId: lessonRecord.learner_id,
      taskId: task_id,
      lessonId: lesson_id,
      inputText: input_text,
      timeSeconds: time_seconds,
    },
    taskRepo,
    attemptRepo,
    errorLogRepo,
  );

  const taskRecord = await prisma.task.findUnique({
    where: { id: task_id },
    select: { primary_skill: true },
  });

  if (taskRecord?.primary_skill) {
    await updateSkillState(
      {
        learnerId: lessonRecord.learner_id,
        primarySkill: taskRecord.primary_skill,
        score: result.score,
        errorCodes: result.errorCodes,
        taskId: task_id,
      },
      prisma,
    );
  }

  const updatedLesson = await prisma.lesson.update({
    where: { id: lesson_id },
    data: { completed_tasks: { increment: 1 } },
  });

  const skillState = await prisma.learnerSkillState.findUnique({
    where: { learner_id: lessonRecord.learner_id },
  });
  const n = taskRecord?.primary_skill ? parseInt(taskRecord.primary_skill.slice(1), 10) : 0;
  const updated_skills =
    skillState && n >= 1 && n <= 8
      ? [
          {
            skill: taskRecord!.primary_skill,
            score: (skillState as any)[`s${n}_score`],
            level: (skillState as any)[`s${n}_level`],
            confidence: (skillState as any)[`s${n}_confidence`],
          },
        ]
      : [];

  return ok(c, {
    score: result.score,
    is_correct: result.isCorrect,
    errors: result.errorCodes,
    feedback: result.feedback,
    updated_skills,
    lesson_progress: {
      completed: updatedLesson.completed_tasks,
      total: updatedLesson.total_tasks,
    },
  });
});

// ─── POST /:id/complete ───────────────────────────────────────────────────────

lesson.post('/:id/complete', async (c) => {
  const id = c.req.param('id');
  const parent_id = c.get('parent_id');

  const lessonRecord = await prisma.lesson.findUnique({
    where: { id },
    include: { learner: true },
  });
  if (!lessonRecord) return ERRORS.NOT_FOUND(c, 'Lesson not found');
  if (lessonRecord.learner.parent_id !== parent_id) return ERRORS.NOT_FOUND(c, 'Lesson not found');

  const attempts = await prisma.attempt.findMany({
    where: { lesson_id: id },
    select: { score: true },
  });

  const accuracy =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      : 0;

  const completedAt = new Date();
  await prisma.lesson.update({
    where: { id },
    data: { status: 'COMPLETED' as any, accuracy, completed_at: completedAt },
  });

  return ok(c, { completed: true, lesson_id: id, accuracy, completed_at: completedAt });
});

export default lesson;
