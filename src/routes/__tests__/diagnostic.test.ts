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
    task: { findFirst: jest.fn(), findMany: jest.fn() },
    attempt: { findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() },
    errorLog: { createMany: jest.fn() },
    learnerSkillState: { upsert: jest.fn() },
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

const mockLearnerFind       = prisma.learner.findUnique              as jest.MockedFunction<any>;
const mockSessionFindFirst  = prisma.diagnosticSession.findFirst    as jest.MockedFunction<any>;
const mockSessionFindUnique = prisma.diagnosticSession.findUnique   as jest.MockedFunction<any>;
const mockSessionCreate     = prisma.diagnosticSession.create       as jest.MockedFunction<any>;
const mockSessionUpdate     = prisma.diagnosticSession.update       as jest.MockedFunction<any>;
const mockTaskFindFirst     = prisma.task.findFirst                 as jest.MockedFunction<any>;
const mockTaskFindMany      = prisma.task.findMany                  as jest.MockedFunction<any>;
const mockAttemptFindFirst  = prisma.attempt.findFirst              as jest.MockedFunction<any>;
const mockAttemptCount      = prisma.attempt.count                  as jest.MockedFunction<any>;
const mockAttemptFindMany   = prisma.attempt.findMany               as jest.MockedFunction<any>;
const mockSkillStateUpsert  = prisma.learnerSkillState.upsert       as jest.MockedFunction<any>;
const mockTransaction       = prisma.$transaction                   as jest.MockedFunction<any>;
const mockProcessAttempt    = processAttempt                        as jest.MockedFunction<typeof processAttempt>;
const mockVerify            = verifyToken                           as jest.MockedFunction<typeof verifyToken>;

// ─── Constants ───────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-uuid-1';
const LEARNER_ID = 'learner-uuid-1';
const SESSION_ID = 'session-uuid-1';
const BEARER     = 'Bearer test-token';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fakeLearner(overrides: Record<string, unknown> = {}) {
  return {
    id: LEARNER_ID,
    parent_id: PARENT_ID,
    name: 'Bat',
    grade: 1,
    variant: 'A',
    daily_minutes: 10,
    ...overrides,
  };
}

function fakeTask(skill: string) {
  return {
    id: `task-${skill}`,
    task_type: 'TT1_CHOICE',
    title: `Task for ${skill}`,
    prompt_text: 'Choose the correct word',
    options: { choices: [{ text: 'нар', is_correct: true }] },
    audio_url: null,
    image_url: null,
    primary_skill: skill,
    estimated_time_seconds: 30,
  };
}

function fakeSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    learner_id: LEARNER_ID,
    status: 'IN_PROGRESS',
    current_phase: 'PHASE_A',
    weak_skills_detected: [],
    learner: fakeLearner(),
    ...overrides,
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

function postNextPhase(body: unknown) {
  return diagnosticRouter.request('/next-phase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: BEARER },
    body: JSON.stringify(body),
  });
}

async function json(res: Response): Promise<any> {
  return res.json();
}

const ALL_SKILLS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── POST /api/diagnostic/start ──────────────────────────────────────────────

describe('POST /diagnostic/start', () => {
  it('201 — creates session and returns 8 tasks (one per skill)', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue(null);
    ALL_SKILLS.forEach((s) => mockTaskFindFirst.mockResolvedValueOnce(fakeTask(s)));
    mockSessionCreate.mockResolvedValue({ id: SESSION_ID });

    const res = await postStart({ learner_id: LEARNER_ID });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.session_id).toBe(SESSION_ID);
    expect(body.phase).toBe('A');
    expect(body.total_phases).toBe(3);
    expect(body.tasks).toHaveLength(8);
    expect(body.tasks[0].primary_skill).toBe('S1');
  });

  it('201 — session created with IN_PROGRESS status and PHASE_A', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue(null);
    ALL_SKILLS.forEach((s) => mockTaskFindFirst.mockResolvedValueOnce(fakeTask(s)));
    mockSessionCreate.mockResolvedValue({ id: SESSION_ID });

    await postStart({ learner_id: LEARNER_ID });

    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          learner_id: LEARNER_ID,
          status: 'IN_PROGRESS',
          current_phase: 'PHASE_A',
        }),
      }),
    );
  });

  it('409 — duplicate start when session already IN_PROGRESS', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue({ id: 'existing-session' });

    const res = await postStart({ learner_id: LEARNER_ID });
    const body = await json(res);

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('403 — learner belongs to a different parent', async () => {
    mockLearnerFind.mockResolvedValue(fakeLearner({ parent_id: 'other-parent' }));

    const res = await postStart({ learner_id: LEARNER_ID });

    expect(res.status).toBe(403);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('404 — learner not found', async () => {
    mockLearnerFind.mockResolvedValue(null);

    const res = await postStart({ learner_id: LEARNER_ID });

    expect(res.status).toBe(404);
  });

  it('400 — missing learner_id', async () => {
    const res = await postStart({});

    expect(res.status).toBe(400);
    expect(mockSessionCreate).not.toHaveBeenCalled();
  });

  it('401 — no auth token', async () => {
    const res = await diagnosticRouter.request('/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ learner_id: LEARNER_ID }),
    });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/diagnostic/submit ─────────────────────────────────────────────

describe('POST /diagnostic/submit', () => {
  const VALID_SUBMIT = {
    session_id: SESSION_ID,
    task_id: 'task-S1',
    input_text: 'нар',
    time_seconds: 12,
  };

  function setupSubmit(processResult: Partial<Awaited<ReturnType<typeof processAttempt>>> = {}) {
    mockSessionFindUnique.mockResolvedValue(fakeSession());
    mockAttemptFindFirst.mockResolvedValue(null);
    mockAttemptCount.mockResolvedValue(1);
    mockProcessAttempt.mockResolvedValue({
      score: 1.0,
      isCorrect: true,
      errorCodes: [],
      errorsDetail: [],
      feedback: 'Зөв бичлээ! Баяр хүргэе!',
      selfCorrected: false,
      ...processResult,
    });
  }

  it('200 — returns score, is_correct, error_codes, feedback and phase_progress', async () => {
    setupSubmit();

    const res = await postSubmit(VALID_SUBMIT);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.score).toBe(1.0);
    expect(body.is_correct).toBe(true);
    expect(body.error_codes).toEqual([]);
    expect(body.feedback).toBe('Зөв бичлээ! Баяр хүргэе!');
    expect(body.phase_progress).toEqual({ completed: 1, total: 8 });
  });

  it('200 — incorrect answer returns error codes and lower score', async () => {
    setupSubmit({ score: 0.5, isCorrect: false, errorCodes: ['C1'], feedback: 'Урт эгшгийг анзаар.' });

    const res = await postSubmit(VALID_SUBMIT);
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.score).toBe(0.5);
    expect(body.is_correct).toBe(false);
    expect(body.error_codes).toContain('C1');
  });

  it('200 — phase_progress reflects completed count', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession());
    mockAttemptFindFirst.mockResolvedValue(null);
    mockAttemptCount.mockResolvedValue(5);
    mockProcessAttempt.mockResolvedValue({
      score: 1.0, isCorrect: true, errorCodes: [],
      errorsDetail: [], feedback: 'Зөв!', selfCorrected: false,
    });

    const res = await postSubmit(VALID_SUBMIT);
    const body = await json(res);

    expect(body.phase_progress.completed).toBe(5);
    expect(body.phase_progress.total).toBe(8);
  });

  it('200 — processAttempt called with correct DIAGNOSTIC context params', async () => {
    setupSubmit();

    await postSubmit(VALID_SUBMIT);

    expect(mockProcessAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        learnerId: LEARNER_ID,
        taskId: 'task-S1',
        diagnosticSessionId: SESSION_ID,
        inputText: 'нар',
        timeSeconds: 12,
      }),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it('409 — duplicate submit for same task in the same session', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession());
    mockAttemptFindFirst.mockResolvedValue({ id: 'existing-attempt' });

    const res = await postSubmit(VALID_SUBMIT);
    const body = await json(res);

    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
    expect(mockProcessAttempt).not.toHaveBeenCalled();
  });

  it('422 — session not IN_PROGRESS', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession({ status: 'COMPLETED' }));

    const res = await postSubmit(VALID_SUBMIT);
    const body = await json(res);

    expect(res.status).toBe(422);
    expect(body.error.code).toBe('UNPROCESSABLE');
  });

  it('403 — session belongs to a different parent', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ learner: fakeLearner({ parent_id: 'other-parent' }) }),
    );

    const res = await postSubmit(VALID_SUBMIT);

    expect(res.status).toBe(403);
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const res = await postSubmit(VALID_SUBMIT);

    expect(res.status).toBe(404);
  });

  it('400 — missing session_id', async () => {
    const res = await postSubmit({ task_id: 'task-S1', input_text: 'нар', time_seconds: 10 });

    expect(res.status).toBe(400);
  });

  it('400 — negative time_seconds', async () => {
    const res = await postSubmit({ ...VALID_SUBMIT, time_seconds: -1 });

    expect(res.status).toBe(400);
  });

  it('401 — no auth token', async () => {
    const res = await diagnosticRouter.request('/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_SUBMIT),
    });

    expect(res.status).toBe(401);
  });
});

// ─── POST /api/diagnostic/next-phase ─────────────────────────────────────────

const SKILLS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

function fakeAttempt(skill: string, idx: number, score = 0.8) {
  return {
    task_id: `task-${skill}-${idx}`,
    score,
    error_codes: [],
    task: { primary_skill: skill },
  };
}

function phaseAAttempts() {
  return SKILLS.map((s, i) => fakeAttempt(s, i));
}

function phaseBAttempts() {
  return ['S7', 'S7', 'S7', 'S2', 'S2', 'S2', 'S7', 'S2'].map((s, i) =>
    fakeAttempt(s, i + 8, 0.4),
  );
}

function phaseCAttempts() {
  return ['S1', 'S2', 'S3', 'S4'].map((s, i) => fakeAttempt(s, i + 16));
}

function fakePhaseTask(id: string, type = 'TT1_CHOICE') {
  return {
    id,
    task_type: type,
    title: `Task ${id}`,
    prompt_text: 'prompt',
    options: {},
    audio_url: null,
    image_url: null,
    primary_skill: 'S1',
    estimated_time_seconds: 30,
  };
}

describe('POST /diagnostic/next-phase', () => {
  function setupSession(phase: string, overrides: Record<string, unknown> = {}) {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ current_phase: phase, ...overrides }),
    );
    mockSessionUpdate.mockResolvedValue({});
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops as any));
    mockSkillStateUpsert.mockResolvedValue({});
  }

  // ── A → B ────────────────────────────────────────────────────────────────

  describe('PHASE_A → PHASE_B', () => {
    it('200 — returns phase B tasks and detected weak skills', async () => {
      setupSession('PHASE_A');
      mockAttemptFindMany.mockResolvedValue(phaseAAttempts());
      mockTaskFindMany
        .mockResolvedValueOnce([fakePhaseTask('pb-1'), fakePhaseTask('pb-2'), fakePhaseTask('pb-3')])
        .mockResolvedValueOnce([fakePhaseTask('pb-4'), fakePhaseTask('pb-5'), fakePhaseTask('pb-6')])
        .mockResolvedValueOnce([fakePhaseTask('pb-7'), fakePhaseTask('pb-8')])
        .mockResolvedValueOnce([
          fakePhaseTask('pb-1'), fakePhaseTask('pb-2'), fakePhaseTask('pb-3'),
          fakePhaseTask('pb-4'), fakePhaseTask('pb-5'), fakePhaseTask('pb-6'),
          fakePhaseTask('pb-7'), fakePhaseTask('pb-8'),
        ]);

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.phase).toBe('B');
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(Array.isArray(body.weak_skills)).toBe(true);
    });

    it('transitions session to PHASE_B with correct weak_skills_detected', async () => {
      setupSession('PHASE_A');
      const weakAttempts = SKILLS.map((s, i) =>
        fakeAttempt(s, i, s === 'S7' || s === 'S2' ? 0.4 : 0.8),
      );
      mockAttemptFindMany.mockResolvedValue(weakAttempts);
      mockTaskFindMany
        .mockResolvedValueOnce([fakePhaseTask('pb-1'), fakePhaseTask('pb-2'), fakePhaseTask('pb-3')])
        .mockResolvedValueOnce([fakePhaseTask('pb-4'), fakePhaseTask('pb-5'), fakePhaseTask('pb-6')])
        .mockResolvedValueOnce([fakePhaseTask('pb-7'), fakePhaseTask('pb-8')])
        .mockResolvedValueOnce([fakePhaseTask('pb-1')]);

      await postNextPhase({ session_id: SESSION_ID });

      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phase_a_completed: true,
            current_phase: 'PHASE_B',
            weak_skills_detected: expect.arrayContaining(['S7', 'S2']),
          }),
        }),
      );
    });

    it('422 — fewer than 8 Phase A attempts', async () => {
      setupSession('PHASE_A');
      mockAttemptFindMany.mockResolvedValue(phaseAAttempts().slice(0, 5));

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(422);
      expect(body.error.code).toBe('UNPROCESSABLE');
      expect(mockSessionUpdate).not.toHaveBeenCalled();
    });
  });

  // ── B → C ────────────────────────────────────────────────────────────────

  describe('PHASE_B → PHASE_C', () => {
    it('200 — returns 4 phase C tasks and estimated_level', async () => {
      setupSession('PHASE_B', { weak_skills_detected: ['S7', 'S2'] });
      mockAttemptFindMany.mockResolvedValue([...phaseAAttempts(), ...phaseBAttempts()]);
      mockTaskFindFirst
        .mockResolvedValueOnce(fakePhaseTask('pc-1', 'TT4_DICTATION'))
        .mockResolvedValueOnce(fakePhaseTask('pc-2', 'TT5_MINI_TEXT'))
        .mockResolvedValueOnce(fakePhaseTask('pc-3', 'TT3_CORRECTION'))
        .mockResolvedValueOnce(fakePhaseTask('pc-4', 'TT1_CHOICE'));

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.phase).toBe('C');
      expect(body.tasks).toHaveLength(4);
      expect(typeof body.estimated_level).toBe('string');
    });

    it('transitions session to PHASE_C', async () => {
      setupSession('PHASE_B', { weak_skills_detected: ['S7', 'S2'] });
      mockAttemptFindMany.mockResolvedValue([...phaseAAttempts(), ...phaseBAttempts()]);
      mockTaskFindFirst
        .mockResolvedValueOnce(fakePhaseTask('pc-1', 'TT4_DICTATION'))
        .mockResolvedValueOnce(fakePhaseTask('pc-2', 'TT5_MINI_TEXT'))
        .mockResolvedValueOnce(fakePhaseTask('pc-3', 'TT3_CORRECTION'))
        .mockResolvedValueOnce(fakePhaseTask('pc-4', 'TT1_CHOICE'));

      await postNextPhase({ session_id: SESSION_ID });

      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phase_b_completed: true,
            current_phase: 'PHASE_C',
          }),
        }),
      );
    });

    it('422 — fewer than 16 total attempts', async () => {
      setupSession('PHASE_B', { weak_skills_detected: [] });
      mockAttemptFindMany.mockResolvedValue(phaseAAttempts()); // only 8

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(422);
      expect(body.error.code).toBe('UNPROCESSABLE');
      expect(mockSessionUpdate).not.toHaveBeenCalled();
    });
  });

  // ── C → COMPLETED ────────────────────────────────────────────────────────

  describe('PHASE_C → COMPLETED', () => {
    it('200 — returns completed=true and a full result object', async () => {
      setupSession('PHASE_C');
      mockAttemptFindMany.mockResolvedValue([
        ...phaseAAttempts(),
        ...phaseBAttempts(),
        ...phaseCAttempts(),
      ]);

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.completed).toBe(true);
      expect(body.result).toHaveProperty('general_level');
      expect(body.result).toHaveProperty('skill_levels');
      expect(body.result).toHaveProperty('skill_scores');
      expect(body.result).toHaveProperty('priority_skills');
      expect(body.result).toHaveProperty('top_error_codes');
    });

    it('upserts LearnerSkillState and marks session COMPLETED', async () => {
      setupSession('PHASE_C');
      mockAttemptFindMany.mockResolvedValue([
        ...phaseAAttempts(),
        ...phaseBAttempts(),
        ...phaseCAttempts(),
      ]);

      await postNextPhase({ session_id: SESSION_ID });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockSessionUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
      expect(mockSkillStateUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { learner_id: LEARNER_ID },
          create: expect.objectContaining({ learner_id: LEARNER_ID }),
          update: expect.objectContaining({ general_level: expect.any(String) }),
        }),
      );
    });

    it('422 — fewer than 20 total attempts', async () => {
      setupSession('PHASE_C');
      mockAttemptFindMany.mockResolvedValue([...phaseAAttempts(), ...phaseBAttempts()]); // 16 only

      const res = await postNextPhase({ session_id: SESSION_ID });
      const body = await json(res);

      expect(res.status).toBe(422);
      expect(body.error.code).toBe('UNPROCESSABLE');
      expect(mockTransaction).not.toHaveBeenCalled();
    });
  });

  // ── Common guards ────────────────────────────────────────────────────────

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValue(null);
    const res = await postNextPhase({ session_id: SESSION_ID });
    expect(res.status).toBe(404);
  });

  it('403 — session belongs to a different parent', async () => {
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ learner: fakeLearner({ parent_id: 'other-parent' }) }),
    );
    const res = await postNextPhase({ session_id: SESSION_ID });
    expect(res.status).toBe(403);
  });

  it('422 — session already COMPLETED', async () => {
    mockSessionFindUnique.mockResolvedValue(fakeSession({ status: 'COMPLETED' }));
    const res = await postNextPhase({ session_id: SESSION_ID });
    expect(res.status).toBe(422);
  });

  it('400 — missing session_id', async () => {
    const res = await postNextPhase({});
    expect(res.status).toBe(400);
  });

  it('401 — no auth token', async () => {
    const res = await diagnosticRouter.request('/next-phase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/diagnostic/result/:sessionId ────────────────────────────────────

describe('GET /diagnostic/result/:sessionId', () => {
  it('200 — returns stored result for a COMPLETED session', async () => {
    const storedResult = {
      general_level: 'M1',
      confidence: 'HIGH',
      skill_levels: { S1: 'M3', S2: 'M3', S3: 'M0', S4: 'M3', S5: 'M0', S6: 'M3', S7: 'M3', S8: 'M3' },
      skill_scores: { S1: 0.875, S2: 0.875, S3: 0.08, S4: 1.0, S5: 0.08, S6: 1.0, S7: 1.0, S8: 1.0 },
      top_error_codes: ['C1', 'E2'],
      priority_skills: ['S3', 'S5'],
      recommended_daily_minutes: 10,
    };
    mockSessionFindUnique.mockResolvedValueOnce(
      fakeSession({ status: 'COMPLETED', result: storedResult }),
    );

    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.result.general_level).toBe('M1');
    expect(body.result.priority_skills).toEqual(['S3', 'S5']);
    expect(body.result.top_error_codes).toContain('C1');
  });

  it('422 — session is IN_PROGRESS', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(fakeSession({ status: 'IN_PROGRESS' }));
    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    expect(res.status).toBe(422);
  });

  it('403 — session belongs to a different parent', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(
      fakeSession({ learner: fakeLearner({ parent_id: 'other-parent' }) }),
    );
    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    expect(res.status).toBe(403);
  });

  it('404 — session not found', async () => {
    mockSessionFindUnique.mockResolvedValueOnce(null);
    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    expect(res.status).toBe(404);
  });

  it('401 — no auth token', async () => {
    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
    });
    expect(res.status).toBe(401);
  });
});

// ─── Full flow: start → 8A (S3,S5 wrong) → next-phase → 8B → next-phase → 4C → next-phase → result ───

describe('Full diagnostic flow — S3 & S5 weak in Phase A', () => {
  const PHASE_A_SCORES: Record<string, number> = {
    S1: 1.0, S2: 1.0, S3: 0.0, S4: 1.0, S5: 0.0, S6: 1.0, S7: 1.0, S8: 1.0,
  };
  const PHASE_A_ERRORS: Record<string, string[]> = { S3: ['C1'], S5: ['E2'] };

  const PB_TASK_IDS = [
    'pb-s3-1', 'pb-s3-2', 'pb-s3-3',
    'pb-s5-1', 'pb-s5-2', 'pb-s5-3',
    'pb-cross-1', 'pb-cross-2',
  ];
  const PB_SKILLS   = ['S3','S3','S3', 'S5','S5','S5', 'S3','S5'];
  const PB_SCORES   = [0.0, 0.0, 0.0,  0.0, 0.0, 0.0,  0.0, 0.0];
  const PB_ERRORS   = [['C1'],['C1'],['C1'], ['E2'],['E2'],['E2'], ['C1'],['E2']];

  const PC_TASK_IDS = ['pc-1','pc-2','pc-3','pc-4'];
  const PC_SKILLS   = ['S1','S2','S3','S5'];
  const PC_SCORES   = [0.75, 0.75, 0.5, 0.5];
  const PC_ERRORS   = [[], [], ['C1'], ['E2']];

  it('flows through all 3 phases and produces correct final result', async () => {
    // clearAllMocks doesn't flush mockResolvedValueOnce queues; reset the
    // mocks that accumulate leftover items from the PHASE_A→B unit tests.
    mockTaskFindMany.mockReset();
    mockTaskFindFirst.mockReset();

    // ── Start ──────────────────────────────────────────────────────────────
    mockLearnerFind.mockResolvedValue(fakeLearner());
    mockSessionFindFirst.mockResolvedValue(null);
    ALL_SKILLS.forEach((s) => mockTaskFindFirst.mockResolvedValueOnce(fakeTask(s)));
    mockSessionCreate.mockResolvedValue({ id: SESSION_ID });
    mockAttemptFindFirst.mockResolvedValue(null);

    const startRes = await postStart({ learner_id: LEARNER_ID });
    expect(startRes.status).toBe(201);
    const startBody = await json(startRes);
    expect(startBody.session_id).toBe(SESSION_ID);
    expect(startBody.tasks).toHaveLength(8);

    // ── Phase A — 8 submissions ────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(fakeSession({ current_phase: 'PHASE_A' }));

    for (let i = 0; i < 8; i++) {
      const skill = ALL_SKILLS[i];
      mockProcessAttempt.mockResolvedValueOnce({
        score: PHASE_A_SCORES[skill],
        isCorrect: PHASE_A_SCORES[skill] > 0.5,
        errorCodes: PHASE_A_ERRORS[skill] ?? [],
        errorsDetail: [],
        feedback: 'ok',
        selfCorrected: false,
      });
      mockAttemptCount.mockResolvedValueOnce(i + 1);

      const res = await postSubmit({
        session_id: SESSION_ID,
        task_id: `task-${skill}-A`,
        input_text: 'тест',
        time_seconds: 10,
      });
      expect(res.status).toBe(200);
      const b = await json(res);
      expect(b.phase_progress.total).toBe(8);
    }

    // ── Next-phase A → B ───────────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(fakeSession({ current_phase: 'PHASE_A' }));
    mockSessionUpdate.mockResolvedValue({});

    const phaseAAttemptData = ALL_SKILLS.map((s, i) => ({
      task_id: `task-${s}-A`,
      score: PHASE_A_SCORES[s],
      error_codes: PHASE_A_ERRORS[s] ?? [],
      task: { primary_skill: s },
    }));
    mockAttemptFindMany.mockResolvedValueOnce(phaseAAttemptData);

    mockTaskFindMany
      .mockResolvedValueOnce([
        { id: 'pb-s3-1', level_target: 'M2' },
        { id: 'pb-s3-2', level_target: 'M2' },
        { id: 'pb-s3-3', level_target: 'M2' },
      ])
      .mockResolvedValueOnce([
        { id: 'pb-s5-1', level_target: 'M2' },
        { id: 'pb-s5-2', level_target: 'M2' },
        { id: 'pb-s5-3', level_target: 'M2' },
      ])
      .mockResolvedValueOnce([
        { id: 'pb-cross-1' },
        { id: 'pb-cross-2' },
      ])
      .mockResolvedValueOnce(PB_TASK_IDS.map((id) => fakePhaseTask(id)));

    const nextARes = await postNextPhase({ session_id: SESSION_ID });
    expect(nextARes.status).toBe(200);
    const nextABody = await json(nextARes);
    expect(nextABody.phase).toBe('B');
    expect(nextABody.tasks).toHaveLength(8);
    expect(nextABody.weak_skills).toContain('S3');
    expect(nextABody.weak_skills).toContain('S5');

    // ── Phase B — 8 submissions ────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ current_phase: 'PHASE_B', weak_skills_detected: ['S3', 'S5'] }),
    );

    for (let i = 0; i < 8; i++) {
      mockProcessAttempt.mockResolvedValueOnce({
        score: PB_SCORES[i],
        isCorrect: false,
        errorCodes: PB_ERRORS[i],
        errorsDetail: [],
        feedback: 'ok',
        selfCorrected: false,
      });
      mockAttemptCount.mockResolvedValueOnce(9 + i);

      const res = await postSubmit({
        session_id: SESSION_ID,
        task_id: PB_TASK_IDS[i],
        input_text: 'тест',
        time_seconds: 10,
      });
      expect(res.status).toBe(200);
    }

    // ── Next-phase B → C ───────────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(
      fakeSession({ current_phase: 'PHASE_B', weak_skills_detected: ['S3', 'S5'] }),
    );
    mockSessionUpdate.mockResolvedValue({});

    const phaseABAttemptData = [
      ...phaseAAttemptData,
      ...PB_TASK_IDS.map((id, i) => ({
        task_id: id,
        score: PB_SCORES[i],
        error_codes: PB_ERRORS[i],
        task: { primary_skill: PB_SKILLS[i] },
      })),
    ];
    mockAttemptFindMany.mockResolvedValueOnce(phaseABAttemptData);

    mockTaskFindFirst
      .mockResolvedValueOnce(fakePhaseTask('pc-1', 'TT4_DICTATION'))
      .mockResolvedValueOnce(fakePhaseTask('pc-2', 'TT5_MINI_TEXT'))
      .mockResolvedValueOnce(fakePhaseTask('pc-3', 'TT3_CORRECTION'))
      .mockResolvedValueOnce(fakePhaseTask('pc-4', 'TT1_CHOICE'));

    const nextBRes = await postNextPhase({ session_id: SESSION_ID });
    expect(nextBRes.status).toBe(200);
    const nextBBody = await json(nextBRes);
    expect(nextBBody.phase).toBe('C');
    expect(nextBBody.tasks).toHaveLength(4);
    expect(typeof nextBBody.estimated_level).toBe('string');

    // ── Phase C — 4 submissions ────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(fakeSession({ current_phase: 'PHASE_C' }));

    for (let i = 0; i < 4; i++) {
      mockProcessAttempt.mockResolvedValueOnce({
        score: PC_SCORES[i],
        isCorrect: PC_SCORES[i] >= 0.75,
        errorCodes: PC_ERRORS[i],
        errorsDetail: [],
        feedback: 'ok',
        selfCorrected: false,
      });
      mockAttemptCount.mockResolvedValueOnce(17 + i);

      const res = await postSubmit({
        session_id: SESSION_ID,
        task_id: PC_TASK_IDS[i],
        input_text: 'тест',
        time_seconds: 10,
      });
      expect(res.status).toBe(200);
    }

    // ── Next-phase C → COMPLETED ───────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValue(fakeSession({ current_phase: 'PHASE_C' }));
    mockTransaction.mockImplementation((ops: unknown[]) => Promise.all(ops as any));
    mockSessionUpdate.mockResolvedValue({});
    mockSkillStateUpsert.mockResolvedValue({});

    const allAttemptData = [
      ...phaseABAttemptData,
      ...PC_TASK_IDS.map((id, i) => ({
        task_id: id,
        score: PC_SCORES[i],
        error_codes: PC_ERRORS[i],
        task: { primary_skill: PC_SKILLS[i] },
      })),
    ];
    mockAttemptFindMany.mockResolvedValueOnce(allAttemptData);

    const completedRes = await postNextPhase({ session_id: SESSION_ID });
    expect(completedRes.status).toBe(200);
    const completedBody = await json(completedRes);

    expect(completedBody.completed).toBe(true);
    expect(completedBody.result.general_level).toMatch(/^M[0-5]$/);
    expect(completedBody.result.priority_skills).toContain('S3');
    expect(completedBody.result.priority_skills).toContain('S5');
    expect(completedBody.result.top_error_codes).toContain('C1');

    // ── GET /result/:sessionId ─────────────────────────────────────────────
    mockSessionFindUnique.mockResolvedValueOnce(
      fakeSession({ status: 'COMPLETED', result: completedBody.result }),
    );

    const resultRes = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    expect(resultRes.status).toBe(200);
    const resultBody = await json(resultRes);

    expect(resultBody.result.general_level).toMatch(/^M[0-5]$/);
    expect(resultBody.result.priority_skills).toContain('S3');
    expect(resultBody.result.priority_skills).toContain('S5');
    expect(resultBody.result.top_error_codes).toContain('C1');
  });
});
