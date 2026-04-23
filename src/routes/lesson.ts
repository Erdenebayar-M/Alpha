import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { withAuth, type AuthEnv } from '../lib/auth/middleware';
import { ERRORS } from '../lib/errors';
import { processAttempt } from '../lib/error-engine/attempt-processor';
import type { TaskRepository, AttemptRepository, ErrorLogRepository } from '../lib/error-engine/attempt-processor';
import type { ErrorCode } from '../../generated/prisma';
import { updateSkillState } from '../lib/engines/skill-engine';
import { lessonAttemptSchema } from '../lib/validators/lesson';

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
  const learner_id = c.req.query('learner_id');
  if (!learner_id) return ERRORS.VALIDATION_ERROR(c, 'learner_id is required');

  const parent_id = c.get('parent_id');

  const learner = await prisma.learner.findUnique({ where: { id: learner_id } });
  if (!learner) return ERRORS.NOT_FOUND(c, 'Learner not found');
  if (learner.parent_id !== parent_id) return ERRORS.FORBIDDEN(c);

  const lessonRecord = await prisma.lesson.findFirst({
    where: { learner_id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
    orderBy: { day_number: 'asc' },
  });
  if (!lessonRecord) return ERRORS.NOT_FOUND(c, 'No lesson available today');

  const tasks = await prisma.task.findMany({
    where: { id: { in: lessonRecord.task_ids } },
    select: TASK_SELECT,
  });

  if (lessonRecord.status === 'PENDING') {
    await prisma.lesson.update({
      where: { id: lessonRecord.id },
      data: { status: 'IN_PROGRESS' },
    });
  }

  return c.json({ lesson: lessonRecord, tasks }, 200);
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
  if (lessonRecord.learner.parent_id !== parent_id) return ERRORS.FORBIDDEN(c);

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
    select: { completed_tasks: true, total_tasks: true },
  });

  return c.json({
    score: result.score,
    is_correct: result.isCorrect,
    error_codes: result.errorCodes,
    feedback: result.feedback,
    lesson_progress: {
      completed: updatedLesson.completed_tasks,
      total: updatedLesson.total_tasks,
    },
  }, 200);
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
  if (lessonRecord.learner.parent_id !== parent_id) return ERRORS.FORBIDDEN(c);

  const attempts = await prisma.attempt.findMany({
    where: { lesson_id: id },
    select: { score: true },
  });

  const accuracy =
    attempts.length > 0
      ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
      : 0;

  const updatedLesson = await prisma.lesson.update({
    where: { id },
    data: { status: 'COMPLETED' as any, accuracy, completed_at: new Date() },
  });

  return c.json({ completed: true, lesson: updatedLesson }, 200);
});

export default lesson;
