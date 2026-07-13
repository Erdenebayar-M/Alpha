/**
 * Tests for POST /api/admin/content/edit — the draft-edit route.
 *
 * Regression coverage for a bug in the same family as the live-tasks PATCH
 * gap: the `updates` bag was unvalidated, so an edit could write a
 * grade_levels value inconsistent with grade_band straight to the DB. Unlike
 * live tasks, a draft's grade_band is NOT immutable, so the check here must
 * validate against whichever grade_band applies AFTER the edit (updated or
 * existing), not a frozen one. A bad draft edit like this, if later
 * approved, silently disappears from the diagnostic pool query.
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
    taskDraft: { findUnique: jest.fn(), update: jest.fn() },
    taskDraftAuditLog: { create: jest.fn() },
    $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn({
      taskDraft: { update: (...args: unknown[]) => (prisma.taskDraft.update as jest.Mock)(...args) },
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

const mockDraftFindUnique = prisma.taskDraft.findUnique as jest.MockedFunction<any>;
const mockDraftUpdate     = prisma.taskDraft.update      as jest.MockedFunction<any>;
const mockAuditCreate     = prisma.taskDraftAuditLog.create as jest.MockedFunction<any>;

const BEARER    = 'Bearer test-admin-secret-that-is-32chars-ok';
const VARIANT_ID = 'G12-001-v1';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function editDraft(updates: Record<string, unknown>) {
  return contentRouter.request('/edit', {
    method: 'POST',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify({ variant_id: VARIANT_ID, updates }),
  });
}

function fakeDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    stage: 'STAGE2',
    task_type: 'TT_2_1',
    grade_band: ['G1', 'G2'],
    grade_levels: ['G1:M1', 'G2:M1'],
    prompt_text: 'existing prompt',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDraftFindUnique.mockResolvedValue(fakeDraft());
  mockDraftUpdate.mockResolvedValue({});
  mockAuditCreate.mockResolvedValue({});
});

describe('POST /edit — grade_band/grade_levels validation', () => {
  it('rejects a malformed grade_levels cell (the AI-task regression: ["G2"] instead of ["G2:M1"])', async () => {
    const res = await editDraft({ grade_levels: ['G2'] });
    expect(res.status).toBe(400);
    expect((await body(res)).error.code).toBe('VALIDATION_ERROR');
    expect(mockDraftUpdate).not.toHaveBeenCalled();
  });

  it('rejects grade_levels that drops coverage for an existing grade_band grade', async () => {
    const res = await editDraft({ grade_levels: ['G1:M2'] }); // drops G2
    expect(res.status).toBe(400);
    expect(mockDraftUpdate).not.toHaveBeenCalled();
  });

  it('rejects widening grade_band without adding matching grade_levels coverage', async () => {
    const res = await editDraft({ grade_band: ['G1', 'G2', 'G3'] }); // grade_levels still only covers G1/G2
    expect(res.status).toBe(400);
    expect(mockDraftUpdate).not.toHaveBeenCalled();
  });

  it('rejects an invalid grade_band value', async () => {
    const res = await editDraft({ grade_band: ['G9'] });
    expect(res.status).toBe(400);
    expect(mockDraftUpdate).not.toHaveBeenCalled();
  });

  it('accepts grade_band + grade_levels edited together consistently', async () => {
    const res = await editDraft({ grade_band: ['G1'], grade_levels: ['G1:M2'] });
    expect(res.status).toBe(200);
    expect(mockDraftUpdate).toHaveBeenCalledWith({
      where: { id: VARIANT_ID },
      data: { grade_band: ['G1'], grade_levels: ['G1:M2'] },
    });
  });

  it('accepts edits that do not touch grade_band or grade_levels, unaffected by the new check', async () => {
    const res = await editDraft({ prompt_text: 'updated prompt' });
    expect(res.status).toBe(200);
    expect(mockDraftUpdate).toHaveBeenCalledWith({
      where: { id: VARIANT_ID },
      data: { prompt_text: 'updated prompt' },
    });
  });
});
