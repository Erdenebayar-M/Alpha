import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import { processAttempt } from '../../lib/error-engine/attempt-processor';
import { updateSkillState } from '../../lib/engines/skill-engine';
import lessonRouter from '../lesson';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner:           { findUnique: jest.fn() },
    lesson:            { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    task:              { findMany: jest.fn(), findUnique: jest.fn() },
    attempt:           { findFirst: jest.fn(), findMany: jest.fn() },
    errorLog:          { createMany: jest.fn() },
    learnerSkillState: { findUnique: jest.fn() },
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

jest.mock('../../lib/error-engine/attempt-processor', () => ({
  processAttempt: jest.fn(),
}));

jest.mock('../../lib/engines/skill-engine', () => ({
  updateSkillState: jest.fn().mockResolvedValue(undefined),
}));

const mockLearnerFind      = prisma.learner.findUnique           as jest.MockedFunction<any>;
const mockLessonFindFirst  = prisma.lesson.findFirst             as jest.MockedFunction<any>;
const mockLessonFindUnique = prisma.lesson.findUnique            as jest.MockedFunction<any>;
const mockLessonUpdate     = prisma.lesson.update                as jest.MockedFunction<any>;
const mockTaskFindMany     = prisma.task.findMany                as jest.MockedFunction<any>;
const mockTaskFindUnique   = prisma.task.findUnique              as jest.MockedFunction<any>;
const mockAttemptFindFirst = prisma.attempt.findFirst            as jest.MockedFunction<any>;
const mockAttemptFindMany  = prisma.attempt.findMany             as jest.MockedFunction<any>;
const mockSkillStateFindUnique = prisma.learnerSkillState.findUnique as jest.MockedFunction<any>;
const mockProcessAttempt   = processAttempt                      as jest.MockedFunction<typeof processAttempt>;
const mockUpdateSkillState = updateSkillState                    as jest.MockedFunction<typeof updateSkillState>;
const mockVerify           = verifyToken                         as jest.MockedFunction<typeof verifyToken>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-uuid-1';
const LEARNER_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID  = 'lesson-uuid-1';
const TASK_ID    = 'task-uuid-1';
const BEARER     = 'Bearer test-token';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function fakeLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: LESSON_ID,
    learner_id: LEARNER_ID,
    plan_id: 'plan-uuid-1',
    day_number: 1,
    primary_skill: 'S3',
    status: 'PENDING',
    task_ids: [TASK_ID],
    total_tasks: 1,
    completed_tasks: 0,
    scheduled_date: new Date(),
    started_at: null,
    completed_at: null,
    accuracy: null,
    learner: { id: LEARNER_ID, parent_id: PARENT_ID },
    ...overrides,
  };
}

function fakeTask() {
  return {
    id: TASK_ID,
    task_type: 'TT1_CHOICE',
    title: 'Test task',
    prompt_text: 'Choose the correct word',
    options: { choices: [{ text: 'нар', is_correct: true }] },
    audio_url: null,
    image_url: null,
    primary_skill: 'S3',
    estimated_time_seconds: 30,
  };
}

function fakeAttemptResult() {
  return {
    score: 1.0,
    isCorrect: true,
    errorCodes: [],
    errorsDetail: [],
    feedback: 'Correct!',
    selfCorrected: false,
  };
}

function fakeSkillState() {
  const state: Record<string, unknown> = { learner_id: LEARNER_ID };
  for (let i = 1; i <= 8; i++) {
    state[`s${i}_score`] = 0.65;
    state[`s${i}_level`] = 'M3';
    state[`s${i}_confidence`] = 'MEDIUM';
  }
  return state;
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── GET /today ───────────────────────────────────────────────────────────────

describe('GET /lesson/today', () => {
  function get(learnerId: string) {
    return lessonRouter.request(`/today?learner_id=${learnerId}`, {
      headers: { Authorization: BEARER },
    });
  }

  it('200 — returns lesson with expanded Task objects', async () => {
    mockLearnerFind.mockResolvedValue({ parent_id: PARENT_ID });
    mockLessonFindFirst.mockResolvedValue(fakeLesson({ status: 'IN_PROGRESS' }));
    mockTaskFindMany.mockResolvedValue([fakeTask()]);
    mockLessonUpdate.mockResolvedValue(fakeLesson({ status: 'IN_PROGRESS', started_at: new Date() }));

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.lesson.id).toBe(LESSON_ID);
    expect(body.data.lesson.tasks).toHaveLength(1);
    expect(body.data.lesson.tasks[0].id).toBe(TASK_ID);
  });

  it('200 — sets status to IN_PROGRESS and started_at when lesson was PENDING', async () => {
    const pendingLesson = fakeLesson({ status: 'PENDING' });
    const inProgressLesson = fakeLesson({ status: 'IN_PROGRESS', started_at: new Date() });
    mockLearnerFind.mockResolvedValue({ parent_id: PARENT_ID });
    mockLessonFindFirst.mockResolvedValue(pendingLesson);
    mockTaskFindMany.mockResolvedValue([fakeTask()]);
    mockLessonUpdate.mockResolvedValue(inProgressLesson);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(200);
    expect(mockLessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LESSON_ID },
        data: expect.objectContaining({ status: 'IN_PROGRESS', started_at: expect.any(Date) }),
      }),
    );
    const body = await res.json() as any;
    expect(body.data.lesson.status).toBe('IN_PROGRESS');
  });

  it('404 NO_LESSON_TODAY — when no lesson is scheduled for today', async () => {
    mockLearnerFind.mockResolvedValue({ parent_id: PARENT_ID });
    mockLessonFindFirst.mockResolvedValue(null);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NO_LESSON_TODAY');
  });

  it('404 — returns NOT_FOUND when learner belongs to a different parent', async () => {
    mockLearnerFind.mockResolvedValue({ parent_id: 'other-parent' });

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockLessonFindFirst).not.toHaveBeenCalled();
  });
});

// ─── POST /attempt ────────────────────────────────────────────────────────────

describe('POST /lesson/attempt', () => {
  function post(body: Record<string, unknown>) {
    return lessonRouter.request('/attempt', {
      method: 'POST',
      headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    lesson_id: LESSON_ID,
    task_id: TASK_ID,
    input_text: 'нар',
    time_seconds: 10,
  };

  function setupAttemptMocks() {
    mockLessonFindUnique.mockResolvedValue(fakeLesson({ status: 'IN_PROGRESS' }));
    mockAttemptFindFirst.mockResolvedValue(null);
    mockProcessAttempt.mockResolvedValue(fakeAttemptResult() as any);
    mockTaskFindUnique.mockResolvedValue({ primary_skill: 'S3' });
    mockUpdateSkillState.mockResolvedValue(undefined);
    mockLessonUpdate.mockResolvedValue(fakeLesson({ completed_tasks: 1 }));
    mockSkillStateFindUnique.mockResolvedValue(fakeSkillState());
  }

  it('200 — calls processAttempt and updateSkillState', async () => {
    setupAttemptMocks();

    const res = await post(validBody);

    expect(res.status).toBe(200);
    expect(mockProcessAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: LEARNER_ID,
        taskId: TASK_ID,
        lessonId: LESSON_ID,
        inputText: 'нар',
        timeSeconds: 10,
      }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    );
    expect(mockUpdateSkillState).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: LEARNER_ID,
        primarySkill: 'S3',
        score: 1.0,
        taskId: TASK_ID,
      }),
      expect.anything(),
    );

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.score).toBe(1.0);
    expect(body.data.is_correct).toBe(true);
    expect(body.data).toHaveProperty('errors');
    expect(body.data).toHaveProperty('feedback');
    expect(body.data).toHaveProperty('updated_skills');
  });

  it('200 — increments completed_tasks', async () => {
    setupAttemptMocks();

    await post(validBody);

    expect(mockLessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LESSON_ID },
        data: { completed_tasks: { increment: 1 } },
      }),
    );
  });

  it('404 — returns NOT_FOUND when lesson belongs to a different parent', async () => {
    mockLessonFindUnique.mockResolvedValue(
      fakeLesson({ learner: { id: LEARNER_ID, parent_id: 'other-parent' } }),
    );

    const res = await post(validBody);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockProcessAttempt).not.toHaveBeenCalled();
  });
});

// ─── POST /:id/complete ───────────────────────────────────────────────────────

describe('POST /lesson/:id/complete', () => {
  function post(id: string) {
    return lessonRouter.request(`/${id}/complete`, {
      method: 'POST',
      headers: { Authorization: BEARER },
    });
  }

  it('200 — marks lesson COMPLETED with correct accuracy and response shape', async () => {
    mockLessonFindUnique.mockResolvedValue(fakeLesson({ status: 'IN_PROGRESS' }));
    mockAttemptFindMany.mockResolvedValue([
      { score: 1.0 },
      { score: 0.5 },
      { score: 0.75 },
    ]);
    mockLessonUpdate.mockResolvedValue(fakeLesson({ status: 'COMPLETED', accuracy: 0.75 }));

    const res = await post(LESSON_ID);

    expect(res.status).toBe(200);
    expect(mockLessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: LESSON_ID },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );

    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.lesson_id).toBe(LESSON_ID);
    // (1.0 + 0.5 + 0.75) / 3 ≈ 0.75
    expect(body.data.accuracy).toBeCloseTo(0.75);
    expect(body.data).toHaveProperty('completed_at');
  });
});
