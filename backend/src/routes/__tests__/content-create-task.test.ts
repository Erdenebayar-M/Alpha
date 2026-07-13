/**
 * Tests for POST /api/admin/content/tasks — hand-creating a draft task.
 *
 * Regression coverage for a bug where the request body was validated with
 * createTaskSchema (which requires grade_levels and checks it covers every
 * grade_band grade), but the Prisma taskDraft.create call never included
 * grade_levels in its data object — so a fully valid submission still
 * silently persisted an empty grade_levels, invisible to the diagnostic
 * pool query once the draft was later approved into a live Task.
 */

jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET:        'test-admin-secret-that-is-32chars-ok',
    GEMINI_API_KEY:      'AIzaFake',
    OPENROUTER_API_KEY:  'sk-or-fake',
    NODE_ENV:            'test',
    DATABASE_URL:        'postgresql://localhost/test',
    JWT_SECRET:          'x'.repeat(64),
    CORS_ORIGIN:         'http://localhost:3000',
    RATE_LIMIT_DISABLED: 'true',
    R2_PUBLIC_URL:       'https://cdn.example.dev',
  },
}));

jest.mock('../../lib/auth/adminMiddleware', () => ({
  withAdmin: jest.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

jest.mock('../../lib/r2', () => ({
  r2Enabled: jest.fn(() => true), r2Upload: jest.fn(), r2Move: jest.fn(),
}));

jest.mock('../../lib/db/client', () => ({
  prisma: {
    taskDraft: { create: jest.fn() },
  },
}));

jest.mock('../../lib/pipeline/generator', () => ({
  generateForSpec: jest.fn(), TASK_SPECS: [], AVAILABLE_TASK_IDS: [],
}));
jest.mock('../../lib/pipeline/aiReviewer', () => ({ reviewTaskDraft: jest.fn() }));

import { prisma } from '../../lib/db/client';
import contentRouter from '../content';

const mockDraftCreate = prisma.taskDraft.create as jest.MockedFunction<any>;

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function createTask(payload: Record<string, unknown>) {
  return contentRouter.request('/tasks', {
    method: 'POST',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

const VALID_BODY = {
  task_type: 'TT_2_1',
  prompt_text: 'Дутуу үсгийг нөхөж бичээрэй.',
  correct_answer: 'ном',
  options: {},
  primary_skill: 'S1',
  level_target: 'M1',
  grade_band: ['G1', 'G2'],
  grade_levels: ['G1:M1', 'G2:M1'],
  difficulty: 1,
  estimated_time_seconds: 30,
  lesson_slot_fit: 'WARM_UP',
  is_diagnostic: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockDraftCreate.mockResolvedValue({ id: 'new-draft-id' });
});

describe('POST /tasks', () => {
  it('persists grade_levels on the created draft', async () => {
    const res = await createTask(VALID_BODY);
    expect(res.status).toBe(200);
    expect(mockDraftCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          grade_band: ['G1', 'G2'],
          grade_levels: ['G1:M1', 'G2:M1'],
        }),
      }),
    );
  });

  it('rejects a body whose grade_levels omits coverage for a grade_band grade', async () => {
    const res = await createTask({ ...VALID_BODY, grade_levels: ['G1:M1'] });
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
    expect(mockDraftCreate).not.toHaveBeenCalled();
  });

  it('rejects a body with empty grade_levels', async () => {
    const res = await createTask({ ...VALID_BODY, grade_levels: [] });
    expect(res.status).toBe(400);
    expect(mockDraftCreate).not.toHaveBeenCalled();
  });
});
