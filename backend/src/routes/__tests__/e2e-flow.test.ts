/**
 * End-to-End: Full Learning Flow
 *
 * Covers registration through plan creation, lesson completion, and dashboard
 * verification — using mocked DB and services. The diagnostic is the
 * single-phase adaptive climb (start → submit → submit … → complete).
 */

import { prisma } from '../../lib/db/client';
import { verifyToken, signToken } from '../../lib/auth/jwt';
import { hashPassword, comparePassword } from '../../lib/auth/password';
import { processAttempt } from '../../lib/error-engine/attempt-processor';
import authRouter from '../auth';
import learnerRouter from '../learner';
import diagnosticRouter from '../diagnostic';
import lessonRouter from '../lesson';
import dashboardRouter from '../dashboard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    parent: { findUnique: jest.fn(), create: jest.fn() },
    learner: { findUnique: jest.fn(), create: jest.fn() },
    learnerSkillState: {
      create: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    diagnosticSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    task: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    attempt: {
      findFirst: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    errorLog: { createMany: jest.fn() },
    lesson: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    plan: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

jest.mock('../../lib/auth/password', () => ({
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
}));

jest.mock('../../lib/error-engine/attempt-processor', () => ({
  processAttempt: jest.fn(),
}));

jest.mock('../../lib/engines/skill-engine', () => ({
  updateSkillState: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/engines/plan-generator', () => ({
  generatePlanLessons: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock references ─────────────────────────────────────────────────────────

const m = {
  parentFindUnique:      prisma.parent.findUnique             as jest.MockedFunction<any>,
  parentCreate:          prisma.parent.create                 as jest.MockedFunction<any>,
  learnerFindUnique:     prisma.learner.findUnique            as jest.MockedFunction<any>,
  learnerCreate:         prisma.learner.create                as jest.MockedFunction<any>,
  skillStateCreate:      prisma.learnerSkillState.create      as jest.MockedFunction<any>,
  skillStateFindUnique:  prisma.learnerSkillState.findUnique  as jest.MockedFunction<any>,
  skillStateUpsert:      prisma.learnerSkillState.upsert      as jest.MockedFunction<any>,
  skillStateUpdate:      prisma.learnerSkillState.update      as jest.MockedFunction<any>,
  sessionFindFirst:      prisma.diagnosticSession.findFirst   as jest.MockedFunction<any>,
  sessionFindUnique:     prisma.diagnosticSession.findUnique  as jest.MockedFunction<any>,
  sessionCreate:         prisma.diagnosticSession.create      as jest.MockedFunction<any>,
  sessionUpdate:         prisma.diagnosticSession.update      as jest.MockedFunction<any>,
  taskFindFirst:         prisma.task.findFirst                as jest.MockedFunction<any>,
  taskFindMany:          prisma.task.findMany                 as jest.MockedFunction<any>,
  taskFindUnique:        prisma.task.findUnique               as jest.MockedFunction<any>,
  attemptFindFirst:      prisma.attempt.findFirst             as jest.MockedFunction<any>,
  attemptCount:          prisma.attempt.count                 as jest.MockedFunction<any>,
  attemptFindMany:       prisma.attempt.findMany              as jest.MockedFunction<any>,
  lessonFindFirst:       prisma.lesson.findFirst              as jest.MockedFunction<any>,
  lessonFindUnique:      prisma.lesson.findUnique             as jest.MockedFunction<any>,
  lessonUpdate:          prisma.lesson.update                 as jest.MockedFunction<any>,
  lessonFindMany:        prisma.lesson.findMany               as jest.MockedFunction<any>,
  planCreate:            prisma.plan.create                   as jest.MockedFunction<any>,
  transaction:           prisma.$transaction                  as jest.MockedFunction<any>,
  verifyToken:           verifyToken                          as jest.MockedFunction<typeof verifyToken>,
  signToken:             signToken                            as jest.MockedFunction<typeof signToken>,
  hashPassword:          hashPassword                         as jest.MockedFunction<typeof hashPassword>,
  comparePassword:       comparePassword                      as jest.MockedFunction<typeof comparePassword>,
  processAttempt:        processAttempt                       as jest.MockedFunction<typeof processAttempt>,
};

// ─── Constants ───────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-e2e-1';
const LEARNER_ID = '22222222-2222-4222-8222-222222222222';
const SESSION_ID = 'session-e2e-1';
const PLAN_ID    = 'plan-e2e-1';
const LESSON_ID  = 'lesson-e2e-1';
const BEARER     = 'Bearer e2e-test-token';

// Lesson tasks targeting S3 and S5
const LES_IDS = ['lesson-task-s3', 'lesson-task-s5'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fakeTask(id: string, skill: string, type = 'TT1_CHOICE') {
  return {
    id,
    task_type: type,
    title: `Task ${id}`,
    prompt_text: 'Choose the correct answer',
    options: { choices: [{ text: 'нар', is_correct: true }] },
    audio_url: null,
    image_url: null,
    primary_skill: skill,
    estimated_time_seconds: 30,
    feedback_text: 'Зөв!',
  };
}

function fakeLearner() {
  return { id: LEARNER_ID, parent_id: PARENT_ID, name: 'Болд', grade: 2, variant: 'A', daily_minutes: 10 };
}

function fakeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    learner_id: LEARNER_ID,
    status: 'IN_PROGRESS',
    weak_skills_detected: [],
    result: { available_rungs: [1, 2, 3], served: [] },
    learner: fakeLearner(),
    ...overrides,
  };
}

// Rendered item payload the diagnostic route returns (TASK_SELECT shape).
function renderedTask(id: string, skill = 'S2') {
  return {
    id,
    task_type: 'TT_1_1',
    prompt_text: 'Choose the correct word',
    options: { choices: [{ text: 'нар', is_correct: true }] },
    audio_url: null,
    image_url: null,
    primary_skill: skill,
    estimated_time_seconds: 30,
  };
}

// Configures the smart task.findMany used by the adaptive route: grade_band
// queries return the bank's rung rows; grade_levels queries return the pool.
function setupBank(
  rungs: number[],
  pools: Record<string, { id: string; primary_skill?: string; task_type?: string; difficulty?: number }[]>,
) {
  const bankRows = rungs.map((r) => ({ grade_levels: [`G2:M${r}`] }));
  m.taskFindMany.mockImplementation((args: any) => {
    const where = args?.where ?? {};
    if (where.grade_band) return Promise.resolve(bankRows);
    const cell: string | undefined = where.grade_levels?.has;
    if (cell) {
      const notIn: string[] = where.id?.notIn ?? [];
      return Promise.resolve(
        (pools[cell] ?? [])
          .map((p) => ({
            id: p.id,
            primary_skill: p.primary_skill ?? 'S2',
            task_type: p.task_type ?? 'TT_1_1',
            difficulty: p.difficulty ?? 2,
          }))
          .filter((t) => !notIn.includes(t.id)),
      );
    }
    return Promise.resolve([]);
  });
  m.taskFindUnique.mockImplementation((args: any) => Promise.resolve(renderedTask(args.where.id)));
}

// One answered item in the reconstructed climb history.
function histAttempt(task_id: string, skill: string, score: number, errors: string[] = []) {
  return {
    task_id,
    score,
    time_seconds: 15,
    error_codes: errors,
    task: { primary_skill: skill, estimated_time_seconds: 30 },
  };
}

function attemptResult(score: number, errorCodes: string[] = []) {
  return {
    score,
    isCorrect: score >= 0.75,
    errorCodes,
    errorsDetail: [],
    feedback: score >= 0.75 ? 'Зөв!' : 'Алдаа байна.',
    selfCorrected: false,
  };
}

async function json(res: Response) {
  return res.json() as Promise<any>;
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: BEARER };
}

function submitBody(task_id: string) {
  return JSON.stringify({ session_id: SESSION_ID, task_id, input_text: 'тест', time_seconds: 15 });
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  m.verifyToken.mockResolvedValue({ parent_id: PARENT_ID });
  m.planCreate.mockResolvedValue({ id: PLAN_ID });
  // Default $transaction: handle both array and callback styles
  m.transaction.mockImplementation((arg: any) => {
    if (typeof arg === 'function') return arg(prisma);
    return Promise.all(arg as any[]);
  });
});

// ─── Step 1: Register parent ──────────────────────────────────────────────────

describe('1 – register parent (Батмөнх, parent@test.mn)', () => {
  it('201 → returns id, email, name, token', async () => {
    m.parentFindUnique.mockResolvedValue(null);
    m.hashPassword.mockResolvedValue('hashed_pw');
    m.parentCreate.mockResolvedValue({
      id: PARENT_ID,
      email: 'parent@test.mn',
      name: 'Батмөнх',
    });
    m.signToken.mockResolvedValue('e2e-test-token');

    const res = await authRouter.request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'parent@test.mn',
        name: 'Батмөнх',
        password: 'password123',
      }),
    });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.data.id).toBe(PARENT_ID);
    expect(body.data.email).toBe('parent@test.mn');
    expect(body.data.name).toBe('Батмөнх');
    expect(body.data.token).toBe('e2e-test-token');
    expect(m.parentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'parent@test.mn', name: 'Батмөнх' }),
      }),
    );
  });
});

// ─── Step 2: Create learner ───────────────────────────────────────────────────

describe('2 – create learner (Болд, grade 2, variant A, 10 min)', () => {
  it('201 → learner created with variant A inferred from grade 2', async () => {
    m.learnerCreate.mockResolvedValue(fakeLearner());
    m.skillStateCreate.mockResolvedValue({});

    const res = await learnerRouter.request('/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Болд', grade: 2, daily_minutes: 10 }),
    });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.data.name).toBe('Болд');
    expect(body.data.grade).toBe(2);
    expect(body.data.variant).toBe('A');
    expect(body.data.daily_minutes).toBe(10);
    expect(body.data.id).toBe(LEARNER_ID);
  });
});

// ─── Step 3: Verify LearnerSkillState ────────────────────────────────────────

describe('3 – LearnerSkillState created with all M0/0/LOW defaults', () => {
  it('learnerSkillState.create called with learner_id and empty arrays', async () => {
    m.learnerCreate.mockResolvedValue(fakeLearner());
    m.skillStateCreate.mockResolvedValue({});

    await learnerRouter.request('/', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: 'Болд', grade: 2, daily_minutes: 10 }),
    });

    expect(m.skillStateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          learner_id: LEARNER_ID,
          top_error_codes: [],
          weak_skills: [],
          recent_error_codes: [],
          recent_task_ids: [],
          preferred_session_length: 10,
        }),
      }),
    );
  });
});

// ─── Step 4: Start diagnostic → first (warm-up) item ─────────────────────────

describe('4 – start diagnostic → warm-up item served first', () => {
  it('201 → session created, first task returned at item 1', async () => {
    m.learnerFindUnique.mockResolvedValue(fakeLearner());
    m.sessionFindFirst.mockResolvedValue(null);
    setupBank([1, 2, 3], { 'G2:M1': [{ id: 'd1' }] });
    m.sessionCreate.mockResolvedValue({ id: SESSION_ID });

    const res = await diagnosticRouter.request('/start', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ learner_id: LEARNER_ID }),
    });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.data.session_id).toBe(SESSION_ID);
    expect(body.data.item_number).toBe(1);
    expect(body.data.task.id).toBe('d1');

    expect(m.sessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          result: expect.objectContaining({
            available_rungs: [1, 2, 3],
            served: [{ task_id: 'd1', rung: 1 }],
          }),
        }),
      }),
    );
  });
});

// ─── Step 5: Submit first answer → next item served ──────────────────────────

describe('5 – submit first answer → adaptive next item', () => {
  it('200 → continue with next_task at item 2 (climb starts at M2)', async () => {
    m.sessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [1, 2, 3], served: [{ task_id: 'd1', rung: 1 }] } }),
    );
    m.attemptFindFirst.mockResolvedValue(null);
    m.processAttempt.mockResolvedValueOnce(attemptResult(1.0, []));
    m.attemptFindMany.mockResolvedValueOnce([histAttempt('d1', 'S1', 1.0, [])]);
    setupBank([1, 2, 3], { 'G2:M2': [{ id: 'd2', primary_skill: 'S2' }] });
    m.sessionUpdate.mockResolvedValue({});

    const res = await diagnosticRouter.request('/submit', {
      method: 'POST',
      headers: authHeaders(),
      body: submitBody('d1'),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(false);
    expect(body.data.next_task.id).toBe('d2');
    expect(body.data.item_number).toBe(2);
    expect(m.sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: expect.objectContaining({
            served: [
              { task_id: 'd1', rung: 1 },
              { task_id: 'd2', rung: 2 },
            ],
          }),
        }),
      }),
    );
  });
});

// ─── Steps 6–10: submit final answer → diagnostic completes with a plan ──────

describe('6–10 – final answer brackets the level and completes the diagnostic', () => {
  // A 6-item climb: passes at M2, fails at M3 → bracketed at M2. S3/S5 are the
  // weakest skills (score 0, errors C1/E2), matching the learner's profile.
  const served = [
    { task_id: 'd1', rung: 1 },
    { task_id: 'd2', rung: 2 },
    { task_id: 'd3', rung: 2 },
    { task_id: 'd4', rung: 3 },
    { task_id: 'd5', rung: 3 },
    { task_id: 'd6', rung: 2 },
  ];
  const history = [
    histAttempt('d1', 'S1', 1.0, []),
    histAttempt('d2', 'S2', 1.0, []),
    histAttempt('d3', 'S7', 1.0, []),
    histAttempt('d4', 'S3', 0.0, ['C1']),
    histAttempt('d5', 'S5', 0.0, ['E2']),
    histAttempt('d6', 'S6', 1.0, []),
  ];

  let completedBody: any;

  beforeEach(async () => {
    m.sessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [1, 2, 3], served } }),
    );
    m.attemptFindFirst.mockResolvedValue(null);
    m.processAttempt.mockResolvedValueOnce(attemptResult(1.0, []));
    m.attemptFindMany.mockResolvedValueOnce(history);
    m.sessionUpdate.mockResolvedValue({});
    m.skillStateUpsert.mockResolvedValue({});
    m.planCreate.mockResolvedValue({ id: PLAN_ID });

    const res = await diagnosticRouter.request('/submit', {
      method: 'POST',
      headers: authHeaders(),
      body: submitBody('d6'),
    });
    completedBody = await json(res);
    expect(res.status).toBe(200);
  });

  it('10 – completed = true, lessons generated', () => {
    expect(completedBody.data.completed).toBe(true);
    expect(completedBody.data.lessons_generated).toBe(true);
  });

  it('11 – result: level M2 (bracketed), S3/S5 priority, C1/E2 errors', () => {
    const r = completedBody.data.result;

    expect(r.general_level).toBe('M2');
    expect(r.level_confidence).toBe('HIGH');
    expect(r.bank_coverage).toBe(3);
    expect(r.capped_by_bank).toBe(false);
    expect(r.priority_skills).toEqual(expect.arrayContaining(['S3', 'S5']));
    expect(r.top_error_codes).toEqual(expect.arrayContaining(['C1', 'E2']));

    expect(Object.keys(r.skill_levels)).toHaveLength(8);
    expect(Object.keys(r.skill_scores)).toHaveLength(8);
    expect(r.skill_levels['S1']).not.toBe('M0');
    expect(r.skill_levels['S2']).not.toBe('M0');
  });

  it('12 – plan auto-created with correct priority_skills and source', () => {
    expect(completedBody.data.plan_id).toBe(PLAN_ID);
    expect(m.planCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          learner_id: LEARNER_ID,
          source: 'DIAGNOSTIC',
          status: 'ACTIVE',
          duration_days: 14,
          priority_skills: expect.arrayContaining(['S3', 'S5']),
        }),
      }),
    );
  });
});

// ─── Step 11b: GET result endpoint ───────────────────────────────────────────

describe('11b – GET /diagnostic/result/:sessionId', () => {
  it('200 → stored result has general_level, S3/S5 priority, C1/E2 errors', async () => {
    const storedResult = {
      general_level: 'M2',
      level_confidence: 'HIGH',
      bank_coverage: 3,
      capped_by_bank: false,
      confidence: 'HIGH',
      skill_levels: { S1: 'M3', S2: 'M3', S3: 'M0', S4: 'M0', S5: 'M0', S6: 'M3', S7: 'M3', S8: 'M0' },
      skill_scores: { S1: 1.0, S2: 1.0, S3: 0.0, S4: 0.0, S5: 0.0, S6: 1.0, S7: 1.0, S8: 0.0 },
      top_error_codes: ['C1', 'E2'],
      priority_skills: ['S3', 'S5'],
      recommended_daily_minutes: 10,
    };

    m.sessionFindUnique.mockResolvedValueOnce(
      fakeSession({ status: 'COMPLETED', result: storedResult }),
    );

    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.result.general_level).toBe('M2');
    expect(body.data.result.priority_skills).toEqual(['S3', 'S5']);
    expect(body.data.result.top_error_codes).toContain('C1');
    expect(body.data.result.top_error_codes).toContain('E2');
  });
});

// ─── Step 13: Get today's lesson ─────────────────────────────────────────────

describe("13 – GET today's lesson → tasks targeting S3 and S5", () => {
  it('200 → lesson returned with tasks for S3/S5', async () => {
    m.learnerFindUnique.mockResolvedValue(fakeLearner());
    m.lessonFindFirst.mockResolvedValue({
      id: LESSON_ID,
      learner_id: LEARNER_ID,
      plan_id: PLAN_ID,
      day_number: 1,
      primary_skill: 'S3',
      secondary_skill: 'S5',
      session_length: 10,
      lesson_goal: 'Урт эгшгийн дүрмийг давтана',
      task_ids: LES_IDS,
      estimated_duration_seconds: 600,
      status: 'PENDING',
      completed_tasks: 0,
      total_tasks: 2,
    });
    m.taskFindMany.mockResolvedValueOnce([
      fakeTask(LES_IDS[0], 'S3'),
      fakeTask(LES_IDS[1], 'S5'),
    ]);
    m.lessonUpdate.mockResolvedValue({
      id: LESSON_ID,
      learner_id: LEARNER_ID,
      plan_id: PLAN_ID,
      day_number: 1,
      primary_skill: 'S3',
      secondary_skill: 'S5',
      task_ids: LES_IDS,
      status: 'IN_PROGRESS',
      completed_tasks: 0,
      total_tasks: 2,
    });

    const res = await lessonRouter.request(`/today?learner_id=${LEARNER_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.lesson.primary_skill).toBe('S3');
    expect(body.data.lesson.secondary_skill).toBe('S5');
    expect(body.data.lesson.tasks).toHaveLength(2);
    expect(body.data.lesson.tasks.map((t: any) => t.id)).toEqual(expect.arrayContaining(LES_IDS));

    expect(m.lessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'IN_PROGRESS' }),
      }),
    );
  });
});

// ─── Step 14: Submit all lesson tasks + complete lesson ───────────────────────

describe('14 – submit lesson tasks and complete lesson', () => {
  const fakeLesson = (completedCount: number) => ({
    id: LESSON_ID,
    learner_id: LEARNER_ID,
    plan_id: PLAN_ID,
    task_ids: LES_IDS,
    status: 'IN_PROGRESS',
    completed_tasks: completedCount,
    total_tasks: 2,
    learner: fakeLearner(),
  });

  it('submits S3 task (score 0.75)', async () => {
    m.lessonFindUnique.mockResolvedValue(fakeLesson(0));
    m.attemptFindFirst.mockResolvedValue(null);
    m.processAttempt.mockResolvedValueOnce(attemptResult(0.75, []));
    m.taskFindUnique.mockResolvedValue({ primary_skill: 'S3' });
    m.lessonUpdate.mockResolvedValue({ completed_tasks: 1, total_tasks: 2 });

    const res = await lessonRouter.request('/attempt', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        lesson_id: LESSON_ID,
        task_id: LES_IDS[0],
        input_text: 'тогоо',
        time_seconds: 18,
      }),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.score).toBe(0.75);
    expect(body.data.lesson_progress.completed).toBe(1);
    expect(body.data.lesson_progress.total).toBe(2);
  });

  it('submits S5 task (score 1.0)', async () => {
    m.lessonFindUnique.mockResolvedValue(fakeLesson(1));
    m.attemptFindFirst.mockResolvedValue(null);
    m.processAttempt.mockResolvedValueOnce(attemptResult(1.0, []));
    m.taskFindUnique.mockResolvedValue({ primary_skill: 'S5' });
    m.lessonUpdate.mockResolvedValue({ completed_tasks: 2, total_tasks: 2 });

    const res = await lessonRouter.request('/attempt', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        lesson_id: LESSON_ID,
        task_id: LES_IDS[1],
        input_text: 'гэрт',
        time_seconds: 12,
      }),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.score).toBe(1.0);
    expect(body.data.lesson_progress.completed).toBe(2);
    expect(body.data.lesson_progress.total).toBe(2);
  });

  it('completes lesson → status COMPLETED, accuracy calculated', async () => {
    m.lessonFindUnique.mockResolvedValue({
      ...fakeLesson(2),
      status: 'IN_PROGRESS',
    });
    m.attemptFindMany.mockResolvedValueOnce([
      { score: 0.75 },
      { score: 1.0 },
    ]);
    m.lessonUpdate.mockResolvedValue({
      id: LESSON_ID,
      day_number: 1,
      accuracy: 0.875,
      completed_tasks: 2,
      total_tasks: 2,
      completed_at: new Date().toISOString(),
    });

    const res = await lessonRouter.request(`/${LESSON_ID}/complete`, {
      method: 'POST',
      headers: authHeaders(),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
    expect(body.data.accuracy).toBeCloseTo(0.875, 2);
    expect(m.lessonUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });
});

// ─── Step 15: Dashboard/skills → scores updated ──────────────────────────────

describe('15 – GET /dashboard/skills → scores updated after lesson', () => {
  it('200 → skill state returned with updated S3 and S5 scores', async () => {
    m.learnerFindUnique.mockResolvedValue(fakeLearner());
    m.skillStateFindUnique.mockResolvedValue({
      learner_id: LEARNER_ID,
      general_level: 'M1',
      s1_score: 1.0,  s1_level: 'M5', s1_confidence: 'LOW',
      s2_score: 1.0,  s2_level: 'M5', s2_confidence: 'LOW',
      s3_score: 0.575, s3_level: 'M0', s3_confidence: 'LOW',
      s4_score: 0.5,  s4_level: 'M1', s4_confidence: 'LOW',
      s5_score: 0.65,  s5_level: 'M3', s5_confidence: 'LOW',
      s6_score: 0.5,  s6_level: 'M1', s6_confidence: 'LOW',
      s7_score: 0.875, s7_level: 'M3', s7_confidence: 'LOW',
      s8_score: 1.0,  s8_level: 'M5', s8_confidence: 'LOW',
      top_error_codes: ['C1', 'E2'],
      weak_skills: ['S3'],
      current_streak: 1,
      longest_streak: 1,
    });

    const res = await dashboardRouter.request(`/skills?learner_id=${LEARNER_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.skills.s3_score).toBeGreaterThan(0.375);
    expect(body.data.skills.s5_score).toBeGreaterThan(0.375);
    expect(body.data.skills.general_level).toBe('M1');
  });
});

// ─── Step 16: Dashboard/progress → streak = 1 ────────────────────────────────

describe('16 – GET /dashboard/progress → streak = 1', () => {
  it('200 → current_streak = 1 after completing first lesson', async () => {
    m.learnerFindUnique.mockResolvedValue(fakeLearner());
    m.skillStateFindUnique.mockResolvedValue({
      current_streak: 1,
      longest_streak: 1,
    });
    m.lessonFindMany.mockResolvedValue([
      {
        id: LESSON_ID,
        day_number: 1,
        accuracy: 0.875,
        completed_at: new Date().toISOString(),
      },
    ]);

    const res = await dashboardRouter.request(`/progress?learner_id=${LEARNER_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.current_streak).toBe(1);
    expect(body.data.longest_streak).toBe(1);
    expect(body.data.recent_lessons).toHaveLength(1);
    expect(body.data.recent_lessons[0].id).toBe(LESSON_ID);
    expect(body.data.recent_lessons[0].accuracy).toBeCloseTo(0.875);
  });
});
