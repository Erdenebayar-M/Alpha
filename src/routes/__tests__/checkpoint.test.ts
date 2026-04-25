import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import { processAttempt } from '../../lib/error-engine/attempt-processor';
import { updateSkillState } from '../../lib/engines/skill-engine';
import { generatePlanLessons } from '../../lib/engines/plan-generator';
import checkpointRouter from '../checkpoint';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner:           { findUnique: jest.fn() },
    checkpoint:        { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    task:              { findMany: jest.fn(), findUnique: jest.fn() },
    attempt:           { create: jest.fn() },
    errorLog:          { createMany: jest.fn() },
    learnerSkillState: { findUnique: jest.fn() },
    plan:              { update: jest.fn(), create: jest.fn() },
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

jest.mock('../../lib/engines/plan-generator', () => ({
  generatePlanLessons: jest.fn().mockResolvedValue(undefined),
}));

const mockLearnerFind       = prisma.learner.findUnique           as jest.MockedFunction<any>;
const mockCheckpointFirst   = prisma.checkpoint.findFirst         as jest.MockedFunction<any>;
const mockCheckpointUnique  = prisma.checkpoint.findUnique        as jest.MockedFunction<any>;
const mockCheckpointUpdate  = prisma.checkpoint.update            as jest.MockedFunction<any>;
const mockTaskFindMany      = prisma.task.findMany                as jest.MockedFunction<any>;
const mockTaskFindUnique    = prisma.task.findUnique              as jest.MockedFunction<any>;
const mockAttemptCreate     = prisma.attempt.create               as jest.MockedFunction<any>;
const mockSkillStateFind    = prisma.learnerSkillState.findUnique as jest.MockedFunction<any>;
const mockPlanUpdate        = prisma.plan.update                  as jest.MockedFunction<any>;
const mockPlanCreate        = prisma.plan.create                  as jest.MockedFunction<any>;
const mockProcessAttempt    = processAttempt                      as jest.MockedFunction<typeof processAttempt>;
const mockUpdateSkillState  = updateSkillState                    as jest.MockedFunction<typeof updateSkillState>;
const mockGenerateLessons   = generatePlanLessons                 as jest.MockedFunction<typeof generatePlanLessons>;
const mockVerify            = verifyToken                         as jest.MockedFunction<typeof verifyToken>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PARENT_ID     = 'parent-uuid-1';
const LEARNER_ID    = '11111111-1111-4111-8111-111111111111';
const PLAN_ID       = 'plan-uuid-1';
const CHECKPOINT_ID = 'checkpoint-uuid-1';
const TASK_ID       = 'task-uuid-1';
const BEARER        = 'Bearer test-token';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function fakeCheckpoint(overrides: Record<string, unknown> = {}) {
  return {
    id: CHECKPOINT_ID,
    learner_id: LEARNER_ID,
    plan_id: PLAN_ID,
    task_ids: [TASK_ID],
    status: 'PENDING',
    decision: null,
    result: null,
    scheduled_date: new Date(),
    completed_at: null,
    ...overrides,
  };
}

function fakePlan(overrides: Record<string, unknown> = {}) {
  return {
    id: PLAN_ID,
    learner_id: LEARNER_ID,
    template: 'BALANCED',
    status: 'ACTIVE',
    is_active: true,
    priority_skills: ['S3', 'S5'],
    target_errors: ['C1', 'C2'],
    daily_minutes: 10,
    duration_days: 7,
    source: 'DIAGNOSTIC',
    started_at: new Date(),
    ended_at: null,
    learner: { id: LEARNER_ID, parent_id: PARENT_ID },
    ...overrides,
  };
}

function fakeCheckpointWithPlan(overrides: Record<string, unknown> = {}) {
  return { ...fakeCheckpoint(), plan: fakePlan(), ...overrides };
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
    feedback: 'Зөв бичлээ! Баяр хүргэе!',
    selfCorrected: false,
  };
}

function fakeSkillState(scoreOverride = 0.5) {
  const state: Record<string, unknown> = { learner_id: LEARNER_ID, weak_skills: [], top_error_codes: [] };
  for (let i = 1; i <= 8; i++) {
    state[`s${i}_score`] = scoreOverride;
    state[`s${i}_level`] = 'M3';
    state[`s${i}_confidence`] = 'MEDIUM';
  }
  return state;
}

const SUBMIT_BODY = {
  checkpoint_id: CHECKPOINT_ID,
  answers: [{ task_id: TASK_ID, input_text: 'нар', time_seconds: 10 }],
};

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── GET /checkpoint ──────────────────────────────────────────────────────────

describe('GET /checkpoint', () => {
  function get(learnerId: string) {
    return checkpointRouter.request(`/?learner_id=${learnerId}`, {
      headers: { Authorization: BEARER },
    });
  }

  it('200 — returns pending checkpoint with expanded tasks', async () => {
    mockLearnerFind.mockResolvedValue({ parent_id: PARENT_ID });
    mockCheckpointFirst.mockResolvedValue(fakeCheckpoint());
    mockTaskFindMany.mockResolvedValue([fakeTask()]);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.checkpoint.id).toBe(CHECKPOINT_ID);
    expect(body.data.checkpoint.tasks).toHaveLength(1);
    expect(body.data.checkpoint.tasks[0].id).toBe(TASK_ID);
  });

  it('404 NO_PENDING_CHECKPOINT — when no pending checkpoint exists', async () => {
    mockLearnerFind.mockResolvedValue({ parent_id: PARENT_ID });
    mockCheckpointFirst.mockResolvedValue(null);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NO_PENDING_CHECKPOINT');
  });
});

// ─── POST /checkpoint/submit ──────────────────────────────────────────────────

describe('POST /checkpoint/submit', () => {
  function post(body: Record<string, unknown>) {
    return checkpointRouter.request('/submit', {
      method: 'POST',
      headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  function setupBaseMocks(beforeScore: number, afterScore: number) {
    mockCheckpointUnique.mockResolvedValue(fakeCheckpointWithPlan());
    mockSkillStateFind
      .mockResolvedValueOnce(fakeSkillState(beforeScore))
      .mockResolvedValue(fakeSkillState(afterScore));
    mockProcessAttempt.mockResolvedValue(fakeAttemptResult() as any);
    mockAttemptCreate.mockResolvedValue({ id: 'attempt-uuid-1' });
    mockTaskFindUnique.mockResolvedValue({ primary_skill: 'S3' });
    mockUpdateSkillState.mockResolvedValue(undefined);
    mockCheckpointUpdate.mockResolvedValue({});
  }

  it('200 — processes all answers and returns decision + skill_deltas', async () => {
    setupBaseMocks(0.5, 0.55); // avgDelta = +0.05 → CONTINUE_PLAN

    const res = await post(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(mockProcessAttempt).toHaveBeenCalledTimes(1);
    expect(mockUpdateSkillState).toHaveBeenCalledTimes(1);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('decision');
    expect(body.data).toHaveProperty('skill_deltas');
  });

  it('200 CONTINUE_PLAN — when deltas are neutral (0 ≤ avg ≤ 0.10)', async () => {
    setupBaseMocks(0.5, 0.55); // avgDelta = +0.05

    const res = await post(SUBMIT_BODY);

    const body = await res.json() as any;
    expect(body.data.decision).toBe('CONTINUE_PLAN');
    expect(mockPlanCreate).not.toHaveBeenCalled();
    expect(mockGenerateLessons).not.toHaveBeenCalled();
    expect(mockCheckpointUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CHECKPOINT_ID },
        data: expect.objectContaining({ status: 'COMPLETED', decision: 'CONTINUE_PLAN' }),
      }),
    );
  });

  it('200 NEW_PLAN — calls generatePlanLessons and returns new_plan_id when regression', async () => {
    setupBaseMocks(0.5, 0.4); // avgDelta = -0.10 → NEW_PLAN
    const NEW_PLAN_ID = 'new-plan-uuid-1';
    mockPlanUpdate.mockResolvedValue({});
    mockPlanCreate.mockResolvedValue({ id: NEW_PLAN_ID });
    mockGenerateLessons.mockResolvedValue(undefined);

    const res = await post(SUBMIT_BODY);

    expect(res.status).toBe(200);
    expect(mockPlanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PLAN_ID },
        data: expect.objectContaining({ status: 'REPLACED', is_active: false }),
      }),
    );
    expect(mockPlanCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: 'CHECKPOINT', is_active: true }),
      }),
    );
    expect(mockGenerateLessons).toHaveBeenCalledWith(NEW_PLAN_ID, expect.anything());

    const body = await res.json() as any;
    expect(body.data.decision).toBe('NEW_PLAN');
    expect(body.data.new_plan_id).toBe(NEW_PLAN_ID);
  });

  it('200 LEVEL_UP — when avg skill delta exceeds +0.10', async () => {
    setupBaseMocks(0.5, 0.65); // avgDelta = +0.15 → LEVEL_UP

    const res = await post(SUBMIT_BODY);

    const body = await res.json() as any;
    expect(body.data.decision).toBe('LEVEL_UP');
    expect(body.data).not.toHaveProperty('new_plan_id');
    expect(mockPlanCreate).not.toHaveBeenCalled();
  });

  it('404 NOT_FOUND — when checkpoint belongs to a different parent', async () => {
    mockCheckpointUnique.mockResolvedValue(
      fakeCheckpointWithPlan({ plan: fakePlan({ learner: { id: LEARNER_ID, parent_id: 'other-parent' } }) }),
    );

    const res = await post(SUBMIT_BODY);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockProcessAttempt).not.toHaveBeenCalled();
  });
});
