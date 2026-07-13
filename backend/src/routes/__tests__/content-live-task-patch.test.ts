/**
 * Tests for PATCH /api/admin/content/live-tasks/:id — focused on the
 * grade_levels validation gap: this route used to accept an unvalidated
 * `updates` bag and could drop grade_levels cells needed by the (immutable)
 * grade_band, silently removing the task from the diagnostic pool query
 * (backend/src/routes/diagnostic.ts filters strictly on grade_levels).
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
    task: { findUnique: jest.fn(), update: jest.fn() },
    taskDraftAuditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({
      task: { update: (...args: unknown[]) => (prisma.task.update as jest.Mock)(...args) },
      taskDraftAuditLog: { create: (...args: unknown[]) => (prisma.taskDraftAuditLog.create as jest.Mock)(...args) },
    })),
  },
}));

jest.mock('../../lib/pipeline/generator', () => ({
  generateForSpec: jest.fn(), TASK_SPECS: [], AVAILABLE_TASK_IDS: [],
}));
jest.mock('../../lib/pipeline/aiReviewer', () => ({ reviewTaskDraft: jest.fn() }));

import { prisma } from '../../lib/db/client';
import contentRouter from '../content';

const mockTaskFindUnique = prisma.task.findUnique as jest.MockedFunction<any>;
const mockTaskUpdate     = prisma.task.update      as jest.MockedFunction<any>;
const mockAuditCreate    = prisma.taskDraftAuditLog.create as jest.MockedFunction<any>;

const BEARER  = 'Bearer test-admin-secret-that-is-32chars-ok';
const TASK_ID = 'G12-001-v1';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function patchLiveTask(id: string, updates: Record<string, unknown>) {
  return contentRouter.request(`/live-tasks/${id}`, {
    method: 'PATCH',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ updates }),
  });
}

function fakeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: TASK_ID,
    task_type: 'TT_2_1',
    grade_band: ['G1', 'G2'],
    grade_levels: ['G1:M1', 'G2:M1'],
    prompt_text: 'existing prompt',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTaskFindUnique.mockResolvedValue(fakeTask());
  mockTaskUpdate.mockResolvedValue({});
  mockAuditCreate.mockResolvedValue({});
});

describe('PATCH /live-tasks/:id — grade_levels validation', () => {
  it('rejects an empty grade_levels array and does not write', async () => {
    const res = await patchLiveTask(TASK_ID, { grade_levels: [] });
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects grade_levels that drops coverage for a grade in the immutable grade_band', async () => {
    // grade_band is frozen at ["G1","G2"]; this update only covers G1.
    const res = await patchLiveTask(TASK_ID, { grade_levels: ['G1:M2'] });
    expect(res.status).toBe(400);
    const errBody = await body(res);
    expect(errBody.error.code).toBe('VALIDATION_ERROR');
    expect(JSON.stringify(errBody.error.details)).toMatch(/G2/);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects a malformed grade_levels cell', async () => {
    const res = await patchLiveTask(TASK_ID, { grade_levels: ['G2'] });
    expect(res.status).toBe(400);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('accepts a valid grade_levels update covering every grade_band grade', async () => {
    const res = await patchLiveTask(TASK_ID, { grade_levels: ['G1:M2', 'G2:M2'] });
    expect(res.status).toBe(200);
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: TASK_ID },
      data: { grade_levels: ['G1:M2', 'G2:M2'] },
    });
  });

  it('accepts edits that do not touch grade_levels, unaffected by the new check', async () => {
    const res = await patchLiveTask(TASK_ID, { prompt_text: 'updated prompt' });
    expect(res.status).toBe(200);
    expect(mockTaskUpdate).toHaveBeenCalledWith({
      where: { id: TASK_ID },
      data: { prompt_text: 'updated prompt' },
    });
  });
});
