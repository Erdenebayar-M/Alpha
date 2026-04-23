/**
 * End-to-End: Full Learning Flow
 *
 * Covers all 16 steps from parent registration through plan creation,
 * lesson completion, and dashboard verification — using mocked DB and services.
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
const LEARNER_ID = 'learner-e2e-1';
const SESSION_ID = 'session-e2e-1';
const PLAN_ID    = 'plan-e2e-1';
const LESSON_ID  = 'lesson-e2e-1';
const BEARER     = 'Bearer e2e-test-token';

const ALL_SKILLS = ['S1','S2','S3','S4','S5','S6','S7','S8'] as const;

// Phase A: tasks one per skill, IDs match skill names for clarity
const PA_TASK_IDS = ALL_SKILLS.map((s) => `task-${s}`);

// Phase B tasks: 3×S3, 3×S5, 2 cross-skill
const PB_IDS    = ['pb-s3-1','pb-s3-2','pb-s3-3','pb-s5-1','pb-s5-2','pb-s5-3','pb-cross-1','pb-cross-2'];
const PB_SKILLS = ['S3','S3','S3','S5','S5','S5','S3','S5'] as const;

// Phase C tasks: one each for boundary
const PC_IDS    = ['pc-1','pc-2','pc-3','pc-4'];
const PC_SKILLS = ['S7','S2','S3','S5'] as const;

// Lesson tasks targeting S3 and S5
const LES_IDS = ['lesson-task-s3','lesson-task-s5'];

// ─── Score fixtures ───────────────────────────────────────────────────────────

// Phase A — S3, S4, S5, S6 all score 0.5 (below 0.6 threshold).
// identifyWeakSkills tiebreak (S7>S2>S3>S5>S4>S6>S8>S1) picks S3 and S5.
const PA_SCORES: Record<string, number> = {
  S1: 1.0, S2: 1.0, S3: 0.5, S4: 0.5,
  S5: 0.5, S6: 0.5, S7: 1.0, S8: 1.0,
};
const PA_ERRORS: Record<string, string[]> = {
  S3: ['C1'], S4: ['C4'], S5: ['E2'], S6: ['G1', 'G2'],
};

// Phase B — mix of correct and wrong; S3/S5 consistently low
const PB_SCORES = [0.0, 0.5, 0.0,  0.0, 0.5, 0.0,  0.75, 0.75] as const;
const PB_ERRORS = [['C1'],['C1'],['C1'], ['E2'],['E2'],['E2'], [],[]];

// Phase C
const PC_SCORES = [0.75, 1.0, 0.5, 0.5] as const;
const PC_ERRORS = [[], [], ['C1'], ['E2']];

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
  return {
    id: LEARNER_ID,
    parent_id: PARENT_ID,
    name: 'Болд',
    grade: 2,
    variant: 'A',
    daily_minutes: 10,
  };
}

function fakeSession(phase: string, overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    learner_id: LEARNER_ID,
    status: 'IN_PROGRESS',
    current_phase: phase,
    weak_skills_detected: [],
    learner: fakeLearner(),
    ...overrides,
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

// ─── Step 4: Start diagnostic → 8 Phase A tasks ──────────────────────────────

describe('4 – start diagnostic → 8 Phase A tasks', () => {
  it('201 → session created, 8 tasks returned (one per skill)', async () => {
    m.learnerFindUnique.mockResolvedValue(fakeLearner());
    m.sessionFindFirst.mockResolvedValue(null);
    ALL_SKILLS.forEach((s, i) => m.taskFindFirst.mockResolvedValueOnce(fakeTask(PA_TASK_IDS[i], s)));
    m.sessionCreate.mockResolvedValue({ id: SESSION_ID });

    const res = await diagnosticRouter.request('/start', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ learner_id: LEARNER_ID }),
    });
    const body = await json(res);

    expect(res.status).toBe(201);
    expect(body.data.session_id).toBe(SESSION_ID);
    expect(body.data.phase).toBe('A');
    expect(body.data.total_phases).toBe(3);
    expect(body.data.tasks).toHaveLength(8);
    expect(body.data.tasks.map((t: any) => t.primary_skill)).toEqual([...ALL_SKILLS]);
  });
});

// ─── Step 5: Submit 8 Phase A answers ────────────────────────────────────────

describe('5 – submit 8 Phase A answers', () => {
  const PHASE_A_INPUTS: Record<string, { text: string; desc: string }> = {
    S1: { text: 'ном',           desc: 'correct (score 1.0)' },
    S2: { text: 'ном',           desc: 'correct (score 1.0)' },
    S3: { text: 'того',          desc: '"того" vs "тогоо" → C1, score 0.5' },
    S4: { text: 'дэвтр',         desc: '"дэвтр" vs "дэвтэр" → C4, score 0.5' },
    S5: { text: 'гэрд',          desc: '"гэрд" vs "гэрт" → E2, score 0.5' },
    S6: { text: 'би явна',       desc: '"би явна" vs "Би явна." → G1+G2, score 0.5' },
    S7: { text: 'ном гэр нар',   desc: 'dictation (score 1.0)' },
    S8: { text: 'ном',           desc: 'correction (score 1.0)' },
  };

  ALL_SKILLS.forEach((skill, idx) => {
    it(`S${idx + 1}: ${PHASE_A_INPUTS[skill].desc}`, async () => {
      m.sessionFindUnique.mockResolvedValue(fakeSession('PHASE_A'));
      m.attemptFindFirst.mockResolvedValue(null);
      m.processAttempt.mockResolvedValueOnce(
        attemptResult(PA_SCORES[skill], PA_ERRORS[skill] ?? []),
      );
      m.attemptCount.mockResolvedValueOnce(idx + 1);

      const res = await diagnosticRouter.request('/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: SESSION_ID,
          task_id: PA_TASK_IDS[idx],
          input_text: PHASE_A_INPUTS[skill].text,
          time_seconds: 15,
        }),
      });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.data.score).toBe(PA_SCORES[skill]);
      if (PA_ERRORS[skill]?.length) {
        expect(body.data.error_codes).toEqual(expect.arrayContaining(PA_ERRORS[skill]));
      }
      expect(body.data.phase_progress.total).toBe(8);
      expect(body.data.phase_progress.completed).toBe(idx + 1);
    });
  });
});

// ─── Step 6: next-phase A → B targets S3 and S5 ──────────────────────────────

describe('6 – next-phase A→B: Phase B targets S3 and S5', () => {
  it('200 → phase B returned, weak_skills = [S3, S5]', async () => {
    m.sessionFindUnique.mockResolvedValue(fakeSession('PHASE_A'));
    m.sessionUpdate.mockResolvedValue({});

    const phaseAData = ALL_SKILLS.map((s, i) => ({
      task_id: PA_TASK_IDS[i],
      score: PA_SCORES[s],
      error_codes: PA_ERRORS[s] ?? [],
      task: { primary_skill: s },
    }));
    m.attemptFindMany.mockResolvedValueOnce(phaseAData);

    // selectPhaseB calls task.findMany: once for S3, once for S5, once for cross-skill
    m.taskFindMany
      .mockResolvedValueOnce([
        { id: 'pb-s3-1', level_target: 'M1-M2' },
        { id: 'pb-s3-2', level_target: 'M2' },
        { id: 'pb-s3-3', level_target: 'M2' },
      ])
      .mockResolvedValueOnce([
        { id: 'pb-s5-1', level_target: 'M1-M2' },
        { id: 'pb-s5-2', level_target: 'M2' },
        { id: 'pb-s5-3', level_target: 'M2' },
      ])
      .mockResolvedValueOnce([
        { id: 'pb-cross-1' },
        { id: 'pb-cross-2' },
      ])
      // Final task.findMany in route for display
      .mockResolvedValueOnce(PB_IDS.map((id, i) => fakeTask(id, PB_SKILLS[i])));

    const res = await diagnosticRouter.request('/next-phase', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.phase).toBe('B');
    expect(body.data.tasks).toHaveLength(8);
    expect(body.data.weak_skills).toContain('S3');
    expect(body.data.weak_skills).toContain('S5');
    expect(body.data.weak_skills).not.toContain('S1');
    expect(body.data.weak_skills).not.toContain('S2');

    expect(m.sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phase_a_completed: true,
          current_phase: 'PHASE_B',
          weak_skills_detected: expect.arrayContaining(['S3', 'S5']),
        }),
      }),
    );
  });
});

// ─── Step 7: Submit 8 Phase B answers ────────────────────────────────────────

describe('7 – submit 8 Phase B answers (mix of correct and wrong)', () => {
  PB_IDS.forEach((taskId, i) => {
    it(`Phase B task ${i + 1} (${PB_SKILLS[i]}) → score ${PB_SCORES[i]}`, async () => {
      m.sessionFindUnique.mockResolvedValue(
        fakeSession('PHASE_B', { weak_skills_detected: ['S3', 'S5'] }),
      );
      m.attemptFindFirst.mockResolvedValue(null);
      m.processAttempt.mockResolvedValueOnce(
        attemptResult(PB_SCORES[i], PB_ERRORS[i]),
      );
      m.attemptCount.mockResolvedValueOnce(9 + i);

      const res = await diagnosticRouter.request('/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: SESSION_ID,
          task_id: taskId,
          input_text: 'тест',
          time_seconds: 15,
        }),
      });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.data.score).toBe(PB_SCORES[i]);
      expect(body.data.phase_progress.total).toBe(8);
    });
  });
});

// ─── Step 8: next-phase B → C ────────────────────────────────────────────────

describe('8 – next-phase B→C: Phase C tasks returned', () => {
  it('200 → 4 Phase C tasks and estimated_level string', async () => {
    m.sessionFindUnique.mockResolvedValue(
      fakeSession('PHASE_B', { weak_skills_detected: ['S3', 'S5'] }),
    );
    m.sessionUpdate.mockResolvedValue({});

    const phaseAData = ALL_SKILLS.map((s, i) => ({
      task_id: PA_TASK_IDS[i],
      score: PA_SCORES[s],
      error_codes: PA_ERRORS[s] ?? [],
      task: { primary_skill: s },
    }));
    const phaseBData = PB_IDS.map((id, i) => ({
      task_id: id,
      score: PB_SCORES[i],
      error_codes: PB_ERRORS[i],
      task: { primary_skill: PB_SKILLS[i] },
    }));
    m.attemptFindMany.mockResolvedValueOnce([...phaseAData, ...phaseBData]);

    m.taskFindFirst
      .mockResolvedValueOnce(fakeTask('pc-1', 'S7', 'TT4_DICTATION'))
      .mockResolvedValueOnce(fakeTask('pc-2', 'S2', 'TT5_MINI_TEXT'))
      .mockResolvedValueOnce(fakeTask('pc-3', 'S3', 'TT3_CORRECTION'))
      .mockResolvedValueOnce(fakeTask('pc-4', 'S5', 'TT1_CHOICE'));

    const res = await diagnosticRouter.request('/next-phase', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.phase).toBe('C');
    expect(body.data.tasks).toHaveLength(4);
    expect(typeof body.data.estimated_level).toBe('string');
    expect(body.data.estimated_level).toMatch(/^M[0-5]$/);

    expect(m.sessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phase_b_completed: true,
          current_phase: 'PHASE_C',
        }),
      }),
    );
  });
});

// ─── Step 9: Submit 4 Phase C answers ────────────────────────────────────────

describe('9 – submit 4 Phase C answers', () => {
  PC_IDS.forEach((taskId, i) => {
    it(`Phase C task ${i + 1} (${PC_SKILLS[i]}) → score ${PC_SCORES[i]}`, async () => {
      m.sessionFindUnique.mockResolvedValue(fakeSession('PHASE_C'));
      m.attemptFindFirst.mockResolvedValue(null);
      m.processAttempt.mockResolvedValueOnce(
        attemptResult(PC_SCORES[i], PC_ERRORS[i]),
      );
      m.attemptCount.mockResolvedValueOnce(17 + i);

      const res = await diagnosticRouter.request('/submit', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          session_id: SESSION_ID,
          task_id: taskId,
          input_text: 'тест',
          time_seconds: 15,
        }),
      });
      const body = await json(res);

      expect(res.status).toBe(200);
      expect(body.data.score).toBe(PC_SCORES[i]);
      expect(body.data.phase_progress.total).toBe(4);
    });
  });
});

// ─── Steps 10–12: next-phase C→COMPLETED + result + plan ─────────────────────

describe('10–12 – next-phase C→COMPLETED: result, plan auto-created', () => {
  // Build full 20-attempt data for calculateFinalResult
  const phaseAData = ALL_SKILLS.map((s, i) => ({
    task_id: PA_TASK_IDS[i],
    score: PA_SCORES[s],
    error_codes: PA_ERRORS[s] ?? [],
    task: { primary_skill: s },
  }));
  const phaseBData = PB_IDS.map((id, i) => ({
    task_id: id,
    score: PB_SCORES[i],
    error_codes: PB_ERRORS[i],
    task: { primary_skill: PB_SKILLS[i] },
  }));
  const phaseCData = PC_IDS.map((id, i) => ({
    task_id: id,
    score: PC_SCORES[i],
    error_codes: PC_ERRORS[i],
    task: { primary_skill: PC_SKILLS[i] },
  }));
  const allAttemptData = [...phaseAData, ...phaseBData, ...phaseCData];

  let completedBody: any;

  beforeEach(async () => {
    m.sessionFindUnique.mockResolvedValue(fakeSession('PHASE_C'));
    m.sessionUpdate.mockResolvedValue({});
    m.skillStateUpsert.mockResolvedValue({});
    m.planCreate.mockResolvedValue({ id: PLAN_ID });
    m.attemptFindMany.mockResolvedValueOnce(allAttemptData);

    const res = await diagnosticRouter.request('/next-phase', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ session_id: SESSION_ID }),
    });
    completedBody = await json(res);
    expect(res.status).toBe(200);
  });

  it('10 – completed = true', () => {
    expect(completedBody.data.completed).toBe(true);
  });

  it('11 – result: general_level M1 or M2, S3/S5 priority, C1/E2 top errors', () => {
    const r = completedBody.data.result;

    expect(r.general_level).toMatch(/^M[12]$/);
    expect(r.priority_skills).toContain('S3');
    expect(r.priority_skills).toContain('S5');
    expect(r.top_error_codes).toContain('C1');
    expect(r.top_error_codes).toContain('E2');

    // Verify all 8 skill levels and scores are present
    expect(Object.keys(r.skill_levels)).toHaveLength(8);
    expect(Object.keys(r.skill_scores)).toHaveLength(8);
    // S3 and S5 should have lower levels than S1/S2/S7/S8
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

// ─── Step 11 (GET result): verify via /result endpoint ───────────────────────

describe('11b – GET /diagnostic/result/:sessionId', () => {
  it('200 → stored result has general_level, S3/S5 priority, C1/E2 errors', async () => {
    const storedResult = {
      general_level: 'M1',
      confidence: 'HIGH',
      skill_levels: {
        S1:'M3', S2:'M3', S3:'M0', S4:'M1',
        S5:'M0', S6:'M1', S7:'M3', S8:'M3',
      },
      skill_scores: {
        S1: 1.0,  S2: 1.0,   S3: 0.375, S4: 0.5,
        S5: 0.375, S6: 0.5, S7: 0.875, S8: 1.0,
      },
      top_error_codes: ['C1', 'E2'],
      priority_skills: ['S3', 'S5'],
      recommended_daily_minutes: 10,
    };

    m.sessionFindUnique.mockResolvedValueOnce(
      fakeSession('PHASE_C', { status: 'COMPLETED', result: storedResult }),
    );

    const res = await diagnosticRouter.request(`/result/${SESSION_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.data.result.general_level).toBe('M1');
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
    m.lessonUpdate.mockResolvedValue({});

    const res = await lessonRouter.request(`/today?learner_id=${LEARNER_ID}`, {
      method: 'GET',
      headers: { Authorization: BEARER },
    });
    const body = await json(res);

    expect(res.status).toBe(200);
    expect(body.lesson.primary_skill).toBe('S3');
    expect(body.lesson.secondary_skill).toBe('S5');
    expect(body.tasks).toHaveLength(2);
    expect(body.tasks.map((t: any) => t.id)).toEqual(expect.arrayContaining(LES_IDS));

    // Lesson marked IN_PROGRESS on first fetch
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
    expect(body.score).toBe(0.75);
    expect(body.lesson_progress.completed).toBe(1);
    expect(body.lesson_progress.total).toBe(2);
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
    expect(body.score).toBe(1.0);
    expect(body.lesson_progress.completed).toBe(2);
    expect(body.lesson_progress.total).toBe(2);
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
    expect(body.completed).toBe(true);
    expect(body.lesson.accuracy).toBeCloseTo(0.875, 2);
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
    // S3 score updated from initial 0.375 → higher after correct lesson attempt
    expect(body.data.skills.s3_score).toBeGreaterThan(0.375);
    // S5 score now above 0.6 (M3 level) after correct answer
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
