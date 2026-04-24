import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import learnerRouter from '../learner';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    learnerSkillState: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

const mockFindUnique  = prisma.learner.findUnique  as jest.MockedFunction<typeof prisma.learner.findUnique>;
const mockFindMany    = prisma.learner.findMany    as jest.MockedFunction<typeof prisma.learner.findMany>;
const mockTransaction = prisma.$transaction        as jest.MockedFunction<typeof prisma.$transaction>;
const mockVerify      = verifyToken                as jest.MockedFunction<typeof verifyToken>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PARENT_ID   = 'parent-uuid-1';
const BEARER      = 'Bearer test-token';

interface LearnerData {
  id?: string;
  name?: string;
  grade?: number;
  daily_minutes?: number;
  variant?: string;
  skill_state?: Record<string, unknown> | null;
}

interface LearnerBody {
  success?: boolean;
  data?: LearnerData;
  error?: { code: string; message: string };
}

async function json(res: Response): Promise<LearnerBody> {
  return res.json() as Promise<LearnerBody>;
}

function post(body: unknown) {
  return learnerRouter.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: BEARER },
    body: JSON.stringify(body),
  });
}

function get(id: string) {
  return learnerRouter.request(`/${id}`, {
    headers: { Authorization: BEARER },
  });
}

function getAll() {
  return learnerRouter.request('/', {
    headers: { Authorization: BEARER },
  });
}

// Build an interactive-transaction mock that executes the callback with a
// fresh set of jest.fn() stubs and exposes them for assertions.
type MockTx = {
  learner: { create: jest.MockedFunction<any> };
  learnerSkillState: { create: jest.MockedFunction<any> };
};

function setupTransaction(learnerResult: unknown, skillResult: unknown = {}): MockTx {
  const tx: MockTx = {
    learner: { create: jest.fn().mockResolvedValue(learnerResult) },
    learnerSkillState: { create: jest.fn().mockResolvedValue(skillResult) },
  };
  mockTransaction.mockImplementation((fn: any) => fn(tx));
  return tx;
}

function fakeLearner(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'learner-uuid-1',
    parent_id: PARENT_ID,
    name: 'Bat',
    grade: 1,
    daily_minutes: 10,
    variant: 'A',
    created_at: new Date(),
    ...overrides,
  };
}

function fakeSkillState() {
  return {
    id: 'skill-uuid-1',
    learner_id: 'learner-uuid-1',
    general_level: 'M0',
    s1_score: 0, s2_score: 0, s3_score: 0, s4_score: 0,
    s5_score: 0, s6_score: 0, s7_score: 0, s8_score: 0,
    s1_level: 'M0', s2_level: 'M0', s3_level: 'M0', s4_level: 'M0',
    s5_level: 'M0', s6_level: 'M0', s7_level: 'M0', s8_level: 'M0',
    s1_confidence: 'LOW', s2_confidence: 'LOW', s3_confidence: 'LOW',
    s4_confidence: 'LOW', s5_confidence: 'LOW', s6_confidence: 'LOW',
    s7_confidence: 'LOW', s8_confidence: 'LOW',
    top_error_codes: [], weak_skills: [],
    recent_error_codes: [], recent_task_ids: [],
    preferred_session_length: 10,
    current_streak: 0, longest_streak: 0,
    updated_at: new Date(),
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── POST /api/learner ────────────────────────────────────────────────────────

describe('POST /learner', () => {
  it('201 — grade 1 learner gets variant A', async () => {
    const learnerData = fakeLearner({ grade: 1, variant: 'A' });
    const tx = setupTransaction(learnerData);

    const res = await post({ name: 'Bat', grade: 1, daily_minutes: 10 });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data!.variant).toBe('A');
    expect(body.data!.grade).toBe(1);

    expect(tx.learner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grade: 1, variant: 'A', parent_id: PARENT_ID }),
      }),
    );
  });

  it('201 — grade 2 learner gets variant A (Grades 1–2 = Variant A)', async () => {
    const learnerData = fakeLearner({ grade: 2, variant: 'A' });
    const tx = setupTransaction(learnerData);

    const res = await post({ name: 'Nomin', grade: 2 });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data!.variant).toBe('A');

    expect(tx.learner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grade: 2, variant: 'A' }),
      }),
    );
  });

  it('201 — grade 4 learner gets variant B', async () => {
    const learnerData = fakeLearner({ grade: 4, variant: 'B' });
    const tx = setupTransaction(learnerData);

    const res = await post({ name: 'Enkh', grade: 4, daily_minutes: 15 });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data!.variant).toBe('B');
    expect(body.data!.grade).toBe(4);

    expect(tx.learner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grade: 4, variant: 'B' }),
      }),
    );
  });

  it('201 — LearnerSkillState created in same transaction with zero defaults', async () => {
    const learnerData = fakeLearner();
    const tx = setupTransaction(learnerData);

    const res = await post({ name: 'Bat', grade: 1, daily_minutes: 10 });

    expect(res.status).toBe(201);

    // Both creates must fire inside the same $transaction call
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    expect(tx.learnerSkillState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        learner_id: learnerData.id,
        top_error_codes: [],
        weak_skills: [],
        recent_error_codes: [],
        recent_task_ids: [],
        preferred_session_length: 10,
      }),
    });
  });

  it('201 — preferred_session_length mirrors daily_minutes', async () => {
    const learnerData = fakeLearner({ daily_minutes: 15, grade: 3, variant: 'B' });
    const tx = setupTransaction(learnerData);

    await post({ name: 'Enkh', grade: 3, daily_minutes: 15 });

    expect(tx.learnerSkillState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ preferred_session_length: 15 }),
    });
  });

  it('201 — daily_minutes defaults to 10 when omitted', async () => {
    const learnerData = fakeLearner({ daily_minutes: 10 });
    const tx = setupTransaction(learnerData);

    const res = await post({ name: 'Bat', grade: 1 });

    expect(res.status).toBe(201);
    expect(tx.learner.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ daily_minutes: 10 }),
      }),
    );
  });

  it('400 — grade 0 is invalid', async () => {
    const res = await post({ name: 'Bat', grade: 0 });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('400 — grade 5 is invalid', async () => {
    const res = await post({ name: 'Bat', grade: 5 });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('400 — missing name', async () => {
    const res = await post({ grade: 2 });

    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.error!.code).toBe('VALIDATION_ERROR');
  });

  it('401 — no auth token', async () => {
    const res = await learnerRouter.request('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bat', grade: 1 }),
    });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/learner/:id ─────────────────────────────────────────────────────

describe('GET /learner/:id', () => {
  it('200 — returns learner profile with full skill state', async () => {
    const skillState = fakeSkillState();
    mockFindUnique.mockResolvedValue({ ...fakeLearner(), skill_state: skillState } as never);

    const res = await get('learner-uuid-1');

    expect(res.status).toBe(200);
    const body = await json(res);

    expect(body.data!.id).toBe('learner-uuid-1');
    expect(body.data!.name).toBe('Bat');
    expect(body.data!.skill_state).not.toBeNull();
    expect(body.data!.skill_state!.general_level).toBe('M0');
    expect(body.data!.skill_state!.s1_score).toBe(0);
    expect(body.data!.skill_state!.s8_level).toBe('M0');
    expect(body.data!.skill_state!.top_error_codes).toEqual([]);
    expect(body.data!.skill_state!.weak_skills).toEqual([]);
    expect(body.data!.skill_state!.current_streak).toBe(0);
    expect(body.data!.skill_state!.longest_streak).toBe(0);
  });

  it("404 — cannot access another parent's learner", async () => {
    // Learner belongs to a different parent
    mockFindUnique.mockResolvedValue({
      ...fakeLearner({ parent_id: 'other-parent-uuid' }),
      skill_state: fakeSkillState(),
    } as never);

    const res = await get('learner-uuid-1');

    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error!.code).toBe('NOT_FOUND');
  });

  it('404 — learner not found', async () => {
    mockFindUnique.mockResolvedValue(null);

    const res = await get('nonexistent-uuid');

    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error!.code).toBe('NOT_FOUND');
  });

  it('401 — no auth token', async () => {
    const res = await learnerRouter.request('/learner-uuid-1');

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/learner ─────────────────────────────────────────────────────────

interface LearnersBody {
  success?: boolean;
  data?: { learners: LearnerData[] };
  error?: { code: string; message: string };
}

async function jsonList(res: Response): Promise<LearnersBody> {
  return res.json() as Promise<LearnersBody>;
}

describe('GET /learner', () => {
  it('200 — returns learners belonging to the authenticated parent', async () => {
    const skillState = fakeSkillState();
    const learner1 = { ...fakeLearner(), skill_state: skillState };
    mockFindMany.mockResolvedValue([learner1] as never);

    const res = await getAll();

    expect(res.status).toBe(200);
    const body = await jsonList(res);
    expect(body.success).toBe(true);
    expect(body.data!.learners).toHaveLength(1);
    expect(body.data!.learners[0].id).toBe('learner-uuid-1');
    expect(body.data!.learners[0].name).toBe('Bat');
    expect(body.data!.learners[0].skill_state).not.toBeNull();
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parent_id: PARENT_ID } }),
    );
  });

  it('200 — returns empty array when parent has no learners', async () => {
    mockFindMany.mockResolvedValue([] as never);

    const res = await getAll();

    expect(res.status).toBe(200);
    const body = await jsonList(res);
    expect(body.data!.learners).toEqual([]);
  });

  it('200 — returns correct count when parent has 2 learners', async () => {
    const skillState = fakeSkillState();
    const learner1 = { ...fakeLearner({ id: 'learner-uuid-1', name: 'Bat' }), skill_state: skillState };
    const learner2 = { ...fakeLearner({ id: 'learner-uuid-2', name: 'Nomin' }), skill_state: skillState };
    mockFindMany.mockResolvedValue([learner1, learner2] as never);

    const res = await getAll();

    expect(res.status).toBe(200);
    const body = await jsonList(res);
    expect(body.data!.learners).toHaveLength(2);
    expect(body.data!.learners[0].name).toBe('Bat');
    expect(body.data!.learners[1].name).toBe('Nomin');
  });

  it('200 — does not return learners belonging to a different parent', async () => {
    // DB enforces the filter; verify findMany is called with the correct parent_id
    mockFindMany.mockResolvedValue([] as never);

    const res = await getAll();

    expect(res.status).toBe(200);
    const body = await jsonList(res);
    expect(body.data!.learners).toHaveLength(0);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parent_id: PARENT_ID } }),
    );
    expect(mockFindMany).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { parent_id: 'other-parent-uuid' } }),
    );
  });
});
