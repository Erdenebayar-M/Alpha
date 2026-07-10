import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import { processAttempt } from '../../lib/error-engine/attempt-processor';
import diagnosticRouter from '../diagnostic';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner: { findUnique: jest.fn() },
    diagnosticSession: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    task: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    attempt: { findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    errorLog: { createMany: jest.fn() },
    learnerSkillState: { upsert: jest.fn() },
    plan: { create: jest.fn() },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

jest.mock('../../lib/error-engine/attempt-processor', () => ({
  processAttempt: jest.fn(),
}));

jest.mock('../../lib/engines/plan-generator', () => ({
  generatePlanLessons: jest.fn().mockResolvedValue(undefined),
}));

const mockLearnerFind       = prisma.learner.findUnique            as jest.MockedFunction<any>;
const mockSessionFindFirst  = prisma.diagnosticSession.findFirst   as jest.MockedFunction<any>;
const mockSessionFindUnique = prisma.diagnosticSession.findUnique  as jest.MockedFunction<any>;
const mockSessionCreate     = prisma.diagnosticSession.create      as jest.MockedFunction<any>;
const mockSessionUpdate     = prisma.diagnosticSession.update      as jest.MockedFunction<any>;
const mockTaskFindUnique    = prisma.task.findUnique               as jest.MockedFunction<any>;
const mockTaskFindMany      = prisma.task.findMany                 as jest.MockedFunction<any>;
const mockAttemptFindFirst  = prisma.attempt.findFirst             as jest.MockedFunction<any>;
const mockAttemptFindMany   = prisma.attempt.findMany              as jest.MockedFunction<any>;
const mockSkillStateUpsert  = prisma.learnerSkillState.upsert      as jest.MockedFunction<any>;
const mockPlanCreate        = prisma.plan.create                   as jest.MockedFunction<any>;
const mockProcessAttempt    = processAttempt                       as jest.MockedFunction<typeof processAttempt>;
const mockVerify            = verifyToken                          as jest.MockedFunction<typeof verifyToken>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-uuid-1';
const LEARNER_ID = 'learner-uuid-1';
const SESSION_ID = 'session-uuid-1';
const BEARER     = 'Bearer test-token';

// ─── Configurable bank (drives the smart task.findMany mock) ─────────────────

// grade_levels rows the bank exposes for the learner's grade (availableRungs).
let BANK_ROWS: { grade_levels: string[] }[] = [];
// per-cell candidate pools, keyed by "G{grade}:M{rung}".
let POOL: Record<string, { id: string; primary_skill: string; task_type: string; difficulty: number }[]> = {};

function poolTask(id: string, over: Partial<{ primary_skill: string; task_type: string; difficulty: number }> = {}) {
  return {
    id,
    primary_skill: over.primary_skill ?? 'S2',
    task_type: over.task_type ?? 'TT_1_1',
    difficulty: over.difficulty ?? 2,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fakeLearner(overrides: Record<string, unknown> = {}) {
  return { id: LEARNER_ID, parent_id: PARENT_ID, name: 'Bat', grade: 1, variant: 'A', daily_minutes: 10, ...overrides };
}

function renderedTask(id: string) {
  return {
    id,
    task_type: 'TT_1_1',
    prompt_text: 'Choose the correct word',
    options: { choices: [{ text: 'нар', is_correct: true }] },
    audio_url: null,
    image_url: null,
    primary_skill: 'S2',
    estimated_time_seconds: 30,
  };
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

function historyAttempt(task_id: string, over: Partial<{ score: number; primary_skill: string; est: number; time: number; errors: string[] }> = {}) {
  return {
    task_id,
    score: over.score ?? 1,
    time_seconds: over.time ?? 20,
    error_codes: over.errors ?? [],
    task: { primary_skill: over.primary_skill ?? 'S2', estimated_time_seconds: over.est ?? 30 },
  };
}

function postStart(body: unknown) {
  return diagnosticRouter.request('/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: BEARER },
    body: JSON.stringify(body),
  });
}

function postSubmit(body: unknown) {
  return diagnosticRouter.request('/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: BEARER },
    body: JSON.stringify(body),
  });
}

const json = (res: Response): Promise<any> => res.json();

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  BANK_ROWS = [];
  POOL = {};
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
  mockPlanCreate.mockResolvedValue({ id: 'test-plan-id' });
  mockSessionCreate.mockResolvedValue({ id: SESSION_ID });
  mockSessionUpdate.mockResolvedValue({});
  mockSkillStateUpsert.mockResolvedValue({});

  // Smart task.findMany: grade_band query → bank rows; grade_levels query → pool.
  mockTaskFindMany.mockImplementation((args: any) => {
    const where = args?.where ?? {};
    if (where.grade_band) return Promise.resolve(BANK_ROWS);
    const cell: string | undefined = where.grade_levels?.has;
    if (cell) {
      const notIn: string[] = where.id?.notIn ?? [];
      return Promise.resolve((POOL[cell] ?? []).filter((t) => !notIn.includes(t.id)));
    }
    return Promise.resolve([]);
  });

  mockTaskFindUnique.mockImplementation((args: any) => Promise.resolve(renderedTask(args.where.id)));
});

// ─── POST /diagnostic/start ──────────────────────────────────────────────────

describe('POST /diagnostic/start', () => {
  it('201 — serves the warm-up (M1) item first and persists climb state', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue(null);
    BANK_ROWS = [{ grade_levels: ['G1:M1'] }, { grade_levels: ['G1:M2'] }, { grade_levels: ['G1:M3'] }];
    POOL['G1:M1'] = [poolTask('G1M1-a')];

    const res = await postStart({ learner_id: LEARNER_ID });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.data.session_id).toBe(SESSION_ID);
    expect(body.data.item_number).toBe(1);
    expect(body.data.task.id).toBe('G1M1-a');

    // climb state persisted: available rungs + first served item
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          result: expect.objectContaining({
            available_rungs: [1, 2, 3],
            served: [{ task_id: 'G1M1-a', rung: 1 }],
          }),
        }),
      }),
    );
  });

  it('422 — no diagnostic content for the grade (empty bank)', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue(null);
    BANK_ROWS = []; // no rungs

    const res = await postStart({ learner_id: LEARNER_ID });
    expect(res.status).toBe(422);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('409 — learner already has a completed diagnostic', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValueOnce({ id: 'done-session' });

    const res = await postStart({ learner_id: LEARNER_ID });
    expect(res.status).toBe(409);
  });

  it('abandons an existing IN_PROGRESS session before starting a new one', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst
      .mockResolvedValueOnce(null)                        // completed check
      .mockResolvedValueOnce({ id: 'existing-session' }); // in-progress check
    BANK_ROWS = [{ grade_levels: ['G1:M1'] }, { grade_levels: ['G1:M2'] }];
    POOL['G1:M1'] = [poolTask('G1M1-a')];

    const res = await postStart({ learner_id: LEARNER_ID });

    expect(res.status).toBe(201);
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ABANDONED' }) }),
    );
  });

  it('404 — learner belongs to a different parent', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner({ parent_id: 'someone-else' }));
    const res = await postStart({ learner_id: LEARNER_ID });
    expect(res.status).toBe(404);
  });
});

// ─── POST /diagnostic/submit ─────────────────────────────────────────────────

describe('POST /diagnostic/submit', () => {
  function armSubmit() {
    mockProcessAttempt.mockResolvedValue({
      score: 1,
      isCorrect: true,
      errorCodes: [],
      feedback: 'Сайн байна!',
    } as any);
  }

  it('continue — scores the item and returns the next task (steps up on PASS)', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [1, 2, 3], served: [{ task_id: 'G1M1-a', rung: 1 }] } }),
    );
    mockAttemptFindFirst.mockResolvedValue(null); // not a duplicate
    armSubmit();
    mockAttemptFindMany.mockResolvedValue([historyAttempt('G1M1-a')]);
    POOL['G1:M2'] = [poolTask('G1M2-a')];

    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'G1M1-a', input_text: 'нар', time_seconds: 12 });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(false);
    expect(body.data.next_task.id).toBe('G1M2-a');
    expect(body.data.item_number).toBe(2);

    // next item appended to served state, at the rung it was served on
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          result: expect.objectContaining({
            served: [
              { task_id: 'G1M1-a', rung: 1 },
              { task_id: 'G1M2-a', rung: 2 },
            ],
          }),
        }),
      }),
    );
  });

  it('complete — finalizes when the bank is exhausted (writes plan + skill state)', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [2], served: [{ task_id: 'only-a', rung: 2 }] } }),
    );
    mockAttemptFindFirst.mockResolvedValue(null);
    armSubmit();
    mockAttemptFindMany.mockResolvedValue([historyAttempt('only-a', { primary_skill: 'S2' })]);
    POOL['G1:M2'] = [poolTask('only-a')]; // the only item, already served → pool empties

    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'only-a', input_text: 'нар', time_seconds: 10 });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.completed).toBe(true);
    expect(body.data.plan_id).toBe('test-plan-id');
    expect(body.data.lessons_generated).toBe(true);
    expect(body.data.result.general_level).toMatch(/^M[0-5]$/);
    expect(body.data.result).toHaveProperty('bank_coverage', 1);
    expect(mockSkillStateUpsert).toHaveBeenCalled();
    expect(mockPlanCreate).toHaveBeenCalled();
  });

  it('409 — task already submitted for this session', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [1, 2], served: [{ task_id: 'G1M1-a', rung: 1 }] } }),
    );
    mockAttemptFindFirst.mockResolvedValue({ id: 'existing-attempt' });

    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'G1M1-a', input_text: 'нар', time_seconds: 5 });
    expect(res.status).toBe(409);
  });

  it('422 — task was never served for this session', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ result: { available_rungs: [1, 2], served: [{ task_id: 'G1M1-a', rung: 1 }] } }),
    );

    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'not-served', input_text: 'нар', time_seconds: 5 });
    expect(res.status).toBe(422);
  });

  it('404 — session belongs to a different parent', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ learner: fakeLearner({ parent_id: 'someone-else' }) }),
    );
    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'G1M1-a', input_text: 'нар', time_seconds: 5 });
    expect(res.status).toBe(404);
  });

  it('422 — session is not in progress', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession({ status: 'COMPLETED' }));
    const res = await postSubmit({ session_id: SESSION_ID, task_id: 'G1M1-a', input_text: 'нар', time_seconds: 5 });
    expect(res.status).toBe(422);
  });
});

// ─── GET /diagnostic/result/:sessionId ───────────────────────────────────────

describe('GET /diagnostic/result/:sessionId', () => {
  it('200 — returns the stored result for a completed session', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ status: 'COMPLETED', result: { general_level: 'M2' } }),
    );

    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.result.general_level).toBe('M2');
  });

  it('422 — session not yet completed', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession({ status: 'IN_PROGRESS' }));
    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    expect(res.status).toBe(422);
  });
});
