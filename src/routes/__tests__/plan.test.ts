import { prisma } from '../../lib/db/client';
import { verifyToken } from '../../lib/auth/jwt';
import planRouter from '../plan';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner: { findUnique: jest.fn() },
    plan: { findFirst: jest.fn() },
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  verifyToken: jest.fn(),
  signToken: jest.fn(),
}));

const mockFindUnique = prisma.learner.findUnique as jest.MockedFunction<typeof prisma.learner.findUnique>;
const mockFindFirst  = prisma.plan.findFirst   as jest.MockedFunction<typeof prisma.plan.findFirst>;
const mockVerify     = verifyToken             as jest.MockedFunction<typeof verifyToken>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PARENT_ID  = 'parent-uuid-1';
const LEARNER_ID = '11111111-1111-4111-8111-111111111111';
const BEARER     = 'Bearer test-token';

function get(learnerId: string) {
  return planRouter.request(`/current?learner_id=${learnerId}`, {
    headers: { Authorization: BEARER },
  });
}

function fakePlan() {
  return {
    id: 'plan-uuid-1',
    template: 'BALANCED',
    status: 'ACTIVE',
    priority_skills: ['S3', 'S5'],
    target_errors: ['C1', 'C4'],
    daily_minutes: 10,
    duration_days: 14,
    source: 'DIAGNOSTIC',
    started_at: new Date('2026-04-24T00:00:00Z'),
    ended_at: null,
    lessons: [
      {
        id: 'lesson-uuid-1',
        day_number: 1,
        status: 'PENDING',
        scheduled_date: new Date('2026-04-24'),
        primary_skill: 'S3',
        total_tasks: 5,
        completed_tasks: 0,
      },
    ],
    checkpoints: [
      {
        id: 'checkpoint-uuid-1',
        scheduled_date: new Date('2026-05-01'),
        status: 'PENDING',
      },
    ],
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ parent_id: PARENT_ID });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /plan/current', () => {
  it('200 — returns active plan with lessons and checkpoints for valid learner', async () => {
    mockFindUnique.mockResolvedValue({ parent_id: PARENT_ID } as never);
    mockFindFirst.mockResolvedValue(fakePlan() as never);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(200);
    const body = await res.json() as any;
    expect(body.success).toBe(true);
    expect(body.data.plan.id).toBe('plan-uuid-1');
    expect(body.data.plan.status).toBe('ACTIVE');
    expect(body.data.plan.lessons).toHaveLength(1);
    expect(body.data.plan.lessons[0].day_number).toBe(1);
    expect(body.data.plan.lessons[0].primary_skill).toBe('S3');
    expect(body.data.plan.checkpoints).toHaveLength(1);
    expect(body.data.plan.checkpoints[0].status).toBe('PENDING');

    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { learner_id: LEARNER_ID, status: 'ACTIVE' },
      }),
    );
  });

  it('404 — returns NO_ACTIVE_PLAN when no active plan exists', async () => {
    mockFindUnique.mockResolvedValue({ parent_id: PARENT_ID } as never);
    mockFindFirst.mockResolvedValue(null);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('NO_ACTIVE_PLAN');
  });

  it('404 — returns NOT_FOUND when learner belongs to a different parent', async () => {
    mockFindUnique.mockResolvedValue({ parent_id: 'other-parent-uuid' } as never);

    const res = await get(LEARNER_ID);

    expect(res.status).toBe(404);
    const body = await res.json() as any;
    expect(body.error.code).toBe('NOT_FOUND');
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  it('401 — returns Unauthorized when no JWT provided', async () => {
    const res = await planRouter.request(`/current?learner_id=${LEARNER_ID}`);

    expect(res.status).toBe(401);
  });
});
