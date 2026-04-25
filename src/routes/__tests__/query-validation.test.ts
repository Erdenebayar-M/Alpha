import { signToken } from '../../lib/auth/jwt';
import lessonRouter from '../lesson';
import planRouter from '../plan';
import dashboardRouter from '../dashboard';
import checkpointRouter from '../checkpoint';

jest.mock('../../lib/db/client', () => ({
  prisma: {
    learner: { findUnique: jest.fn() },
    lesson: { findFirst: jest.fn(), findMany: jest.fn() },
    plan: { findFirst: jest.fn() },
    learnerSkillState: { findUnique: jest.fn() },
    checkpoint: { findFirst: jest.fn() },
    task: { findMany: jest.fn() },
  },
}));

jest.mock('../../lib/auth/jwt', () => ({
  signToken: jest.fn(),
  verifyToken: jest.fn().mockResolvedValue({ parent_id: 'parent-1' }),
}));

const BEARER = 'Bearer test-token';

function get(router: { request: typeof lessonRouter.request }, path: string) {
  return router.request(path, { headers: { Authorization: BEARER } });
}

interface ErrBody {
  success: boolean;
  error: { code: string; details?: unknown };
}

describe('Query-param validation — invalid learner_id returns 400', () => {
  beforeAll(() => {
    (signToken as jest.Mock).mockResolvedValue('test-token');
  });

  it.each([
    ['lesson /today',     () => get(lessonRouter,     '/today?learner_id=not-a-uuid')],
    ['plan /current',     () => get(planRouter,       '/current?learner_id=not-a-uuid')],
    ['dashboard /skills', () => get(dashboardRouter,  '/skills?learner_id=not-a-uuid')],
    ['dashboard /progress', () => get(dashboardRouter,'/progress?learner_id=not-a-uuid')],
    ['checkpoint /',      () => get(checkpointRouter, '/?learner_id=not-a-uuid')],
  ])('%s', async (_label, exec) => {
    const res = await exec();
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('also rejects missing learner_id', async () => {
    const res = await get(lessonRouter, '/today');
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrBody;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
