import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import dashboardRouter from '../dashboard';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner: { findUnique: jest.fn() },
    learnerSkillState: { findUnique: jest.fn() },
    lesson: { findMany: jest.fn() },
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

const mockLearnerFindUnique = prisma.learner.findUnique           as jest.MockedFunction<typeof prisma.learner.findUnique>;
const mockStateFindUnique   = prisma.learnerSkillState.findUnique as jest.MockedFunction<typeof prisma.learnerSkillState.findUnique>;
const mockLessonFindMany    = prisma.lesson.findMany               as jest.MockedFunction<typeof prisma.lesson.findMany>;
const mockVerify            = verifyToken                          as jest.MockedFunction<typeof verifyToken>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-uuid-1';
const LEARNER_ID = '11111111-1111-4111-8111-111111111111';
const BEARER     = 'Bearer test-token';

function get(path: string) {
  return dashboardRouter.request(`${path}?learner_id=${LEARNER_ID}`, {
    headers: { Authorization: BEARER },
  });
}

function fakeSkillState() {
  return {
    general_level: 'M1',
    s1_score: 0.8, s1_level: 'M2', s1_confidence: 'HIGH',
    s2_score: 0.5, s2_level: 'M1', s2_confidence: 'MEDIUM',
    s3_score: 0.3, s3_level: 'M0', s3_confidence: 'LOW',
    s4_score: 0.6, s4_level: 'M1', s4_confidence: 'MEDIUM',
    s5_score: 0.4, s5_level: 'M0', s5_confidence: 'LOW',
    s6_score: 0.7, s6_level: 'M1', s6_confidence: 'HIGH',
    s7_score: 0.9, s7_level: 'M2', s7_confidence: 'HIGH',
    s8_score: 0.2, s8_level: 'M0', s8_confidence: 'LOW',
    weak_skills: ['S3', 'S5'],
    top_error_codes: ['C1', 'C4'],
    current_streak: 3,
    longest_streak: 5,
    updated_at: new Date('2026-05-01T00:00:00Z'),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── GET /dashboard/skills ─────────────────────────────────────────────────

describe('GET /dashboard/skills', () => {
  it('200 — returns trimmed skill-state fields for the learner', async () => {
    mockLearnerFindUnique.mockResolvedValue({ parent_id: PARENT_ID } as never);
    mockStateFindUnique.mockResolvedValue(fakeSkillState() as never);

    const res = await get('/skills');

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.data.skills.general_level).toBe('M1');
    expect(body.data.skills.weak_skills).toEqual(['S3', 'S5']);
    expect(body.data.skills.s1_score).toBe(0.8);
    // internal-only fields must not leak
    expect(body.data.skills.recent_task_ids).toBeUndefined();
    expect(body.data.skills.recent_error_codes).toBeUndefined();
    expect(body.data.skills.id).toBeUndefined();
    expect(body.data.skills.learner_id).toBeUndefined();
  });

  it('404 — returns NOT_FOUND (not FORBIDDEN) when learner belongs to a different parent', async () => {
    mockLearnerFindUnique.mockResolvedValue({ parent_id: 'other-parent-uuid' } as never);

    const res = await get('/skills');

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockStateFindUnique).not.toHaveBeenCalled();
  });

  it('404 — returns NOT_FOUND when learner does not exist', async () => {
    mockLearnerFindUnique.mockResolvedValue(null);

    const res = await get('/skills');

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('404 — returns NOT_FOUND when skill state has not been created yet', async () => {
    mockLearnerFindUnique.mockResolvedValue({ parent_id: PARENT_ID } as never);
    mockStateFindUnique.mockResolvedValue(null);

    const res = await get('/skills');

    expect(res.status).toBe(404);
  });
});

// ─── GET /dashboard/progress ───────────────────────────────────────────────

describe('GET /dashboard/progress', () => {
  it('200 — returns streaks and recent lessons', async () => {
    mockLearnerFindUnique.mockResolvedValue({ parent_id: PARENT_ID } as never);
    mockStateFindUnique.mockResolvedValue({ current_streak: 3, longest_streak: 5 } as never);
    mockLessonFindMany.mockResolvedValue([
      { id: 'lesson-1', day_number: 1, accuracy: 0.9, completed_at: new Date('2026-05-01') },
    ] as never);

    const res = await get('/progress');

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.current_streak).toBe(3);
    expect(body.data.longest_streak).toBe(5);
    expect(body.data.recent_lessons).toHaveLength(1);
  });

  it('404 — returns NOT_FOUND (not FORBIDDEN) when learner belongs to a different parent', async () => {
    mockLearnerFindUnique.mockResolvedValue({ parent_id: 'other-parent-uuid' } as never);

    const res = await get('/progress');

    expect(res.status).toBe(404);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockLessonFindMany).not.toHaveBeenCalled();
  });
});
