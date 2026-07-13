/**
 * Tests for POST /api/admin/content/update-audio — pointing a task at an
 * existing (already-uploaded) audio URL. Focus: the prompt/dictation slot →
 * column mapping, especially that a validated live Task (which has no
 * prompt_audio_url column) rejects the prompt slot instead of issuing a bad
 * Prisma write.
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
    task:      { updateMany: jest.fn() },
    taskDraft: { updateMany: jest.fn() },
  },
}));

jest.mock('../../lib/pipeline/generator', () => ({
  generateForSpec: jest.fn(), TASK_SPECS: [], AVAILABLE_TASK_IDS: [],
}));
jest.mock('../../lib/pipeline/aiReviewer', () => ({ reviewTaskDraft: jest.fn() }));

import { prisma } from '../../lib/db/client';
import contentRouter from '../content';

const mockTaskUpdate  = prisma.task.updateMany      as jest.MockedFunction<any>;
const mockDraftUpdate = prisma.taskDraft.updateMany as jest.MockedFunction<any>;

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';
const CDN = 'https://cdn.example.dev';
const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function updateAudio(payload: Record<string, unknown>) {
  return contentRouter.request('/update-audio', {
    method: 'POST',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTaskUpdate.mockResolvedValue({ count: 1 });
  mockDraftUpdate.mockResolvedValue({ count: 1 });
});

describe('POST /update-audio', () => {
  it('writes audio_url on a validated live task (dictation)', async () => {
    const res = await updateAudio({ audio_url: `${CDN}/audio/dict_G12-001-v1.wav`, variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' });
    expect(res.status).toBe(200);
    expect(mockTaskUpdate).toHaveBeenCalledWith({ where: { id: 'G12-001-v1' }, data: { audio_url: `${CDN}/audio/dict_G12-001-v1.wav` } });
  });

  it('rejects the prompt slot on a validated live task (no prompt_audio_url column)', async () => {
    const res = await updateAudio({ audio_url: `${CDN}/audio/prompt_G12-001-v1.wav`, variant_id: 'G12-001-v1', slot: 'prompt', stage: 'validated' });
    expect(res.status).toBe(400);
    expect((await body(res)).error.message).toMatch(/no prompt audio slot/i);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('writes prompt_audio_url on a draft (prompt slot)', async () => {
    const res = await updateAudio({ audio_url: `${CDN}/audio/prompt_G12-001-v1.wav`, variant_id: 'G12-001-v1', slot: 'prompt', stage: 'stage2' });
    expect(res.status).toBe(200);
    expect(mockDraftUpdate).toHaveBeenCalledWith({ where: { id: 'G12-001-v1' }, data: { prompt_audio_url: `${CDN}/audio/prompt_G12-001-v1.wav` } });
  });

  it('rejects a URL outside the allowlist', async () => {
    const res = await updateAudio({ audio_url: 'https://evil.example.com/x.wav', variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' });
    expect(res.status).toBe(400);
  });
});
