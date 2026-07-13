/**
 * Tests for POST /api/admin/content/upload-audio.
 *
 * The endpoint sniffs the uploaded bytes (not the filename or declared type),
 * rejects anything iOS cannot decode (WebM/Ogg), stores the file to R2 with the
 * correct Content-Type, and points the task at it. The magic-byte sniffer runs
 * for real; R2 and Prisma are mocked.
 */

// Hoisted before imports so transitive env/pipeline deps don't process.exit.
jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET:         'test-admin-secret-that-is-32chars-ok',
    GEMINI_API_KEY:       'AIzaFake',
    OPENROUTER_API_KEY:   'sk-or-fake',
    NODE_ENV:             'test',
    DATABASE_URL:         'postgresql://localhost/test',
    JWT_SECRET:           'x'.repeat(64),
    CORS_ORIGIN:          'http://localhost:3000',
    RATE_LIMIT_DISABLED:  'true',
    R2_PUBLIC_URL:        'https://cdn.example.dev',
  },
}));

jest.mock('../../lib/auth/adminMiddleware', () => ({
  withAdmin: jest.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

jest.mock('../../lib/r2', () => ({
  r2Enabled: jest.fn(() => true),
  r2Upload:  jest.fn((key: string) => Promise.resolve(`https://cdn.example.dev/${key}`)),
  r2Move:    jest.fn(),
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
import { r2Upload } from '../../lib/r2';
import contentRouter from '../content';

const mockTaskUpdate  = prisma.task.updateMany      as jest.MockedFunction<any>;
const mockDraftUpdate = prisma.taskDraft.updateMany as jest.MockedFunction<any>;
const mockR2Upload    = r2Upload                    as jest.MockedFunction<any>;

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';

function pad(bytes: number[], len = 64): Buffer {
  const b = Buffer.alloc(len);
  Buffer.from(bytes).copy(b, 0);
  return b;
}
const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));

const WAV_BYTES  = pad([...ascii('RIFF'), 0x24, 0x08, 0, 0, ...ascii('WAVE')]);
const M4A_BYTES  = pad([0, 0, 0, 0x18, ...ascii('ftypM4A ')]);
const WEBM_BYTES = pad([0x1a, 0x45, 0xdf, 0xa3]);
const JUNK_BYTES = pad([0x00, 0x01, 0x02, 0x03]);

const body = (res: Response): Promise<any> => res.json() as Promise<any>;

function upload(fields: Record<string, string>, fileBytes?: Buffer, filename = 'rec.m4a') {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (fileBytes) fd.append('file', new Blob([new Uint8Array(fileBytes)]), filename);
  return contentRouter.request('/upload-audio', {
    method: 'POST',
    headers: { Authorization: BEARER },
    body: fd,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockTaskUpdate.mockResolvedValue({ count: 1 });
  mockDraftUpdate.mockResolvedValue({ count: 1 });
});

describe('POST /upload-audio', () => {
  it('stores a valid m4a and updates the live task (dictation/validated)', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' }, M4A_BYTES);
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.content_type).toBe('audio/mp4');
    expect(json.data.audio_url).toBe('https://cdn.example.dev/audio/dict_G12-001-v1.m4a');
    expect(mockR2Upload).toHaveBeenCalledWith('audio/dict_G12-001-v1.m4a', expect.any(Buffer), 'audio/mp4');
    expect(mockTaskUpdate).toHaveBeenCalledWith({ where: { id: 'G12-001-v1' }, data: { audio_url: expect.any(String) } });
  });

  it('accepts WAV and derives the .wav extension from the bytes, not the filename', async () => {
    const res = await upload({ variant_id: 'G12-002-v1', slot: 'dictation', stage: 'validated' }, WAV_BYTES, 'whatever.m4a');
    expect(res.status).toBe(200);
    const json = await body(res);
    expect(json.data.content_type).toBe('audio/wav');
    expect(json.data.audio_url).toContain('dict_G12-002-v1.wav');
  });

  it('writes prompt_audio_url on a draft for the prompt slot', async () => {
    const res = await upload({ variant_id: 'G12-003-v1', slot: 'prompt', stage: 'stage2' }, WAV_BYTES);
    expect(res.status).toBe(200);
    expect(mockDraftUpdate).toHaveBeenCalledWith({
      where: { id: 'G12-003-v1' },
      data:  { prompt_audio_url: expect.stringContaining('prompt_G12-003-v1.wav') },
    });
  });

  it('rejects WebM/Opus audio (iOS cannot decode it)', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' }, WEBM_BYTES);
    expect(res.status).toBe(400);
    const json = await body(res);
    expect(json.error.message).toMatch(/iOS cannot play/i);
    expect(mockR2Upload).not.toHaveBeenCalled();
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects unrecognized bytes', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' }, JUNK_BYTES);
    expect(res.status).toBe(400);
    expect((await body(res)).error.message).toMatch(/Unrecognized audio/i);
  });

  it('rejects the prompt slot on a validated live task (no prompt_audio_url column)', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'prompt', stage: 'validated' }, WAV_BYTES);
    expect(res.status).toBe(400);
    expect((await body(res)).error.message).toMatch(/no prompt audio slot/i);
    expect(mockTaskUpdate).not.toHaveBeenCalled();
  });

  it('rejects a request with no file', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'dictation', stage: 'validated' });
    expect(res.status).toBe(400);
    expect((await body(res)).error.message).toMatch(/file/i);
  });

  it('rejects invalid fields (bad slot)', async () => {
    const res = await upload({ variant_id: 'G12-001-v1', slot: 'bogus', stage: 'validated' }, WAV_BYTES);
    expect(res.status).toBe(400);
  });

  it('returns 404 when the task does not exist', async () => {
    mockTaskUpdate.mockResolvedValue({ count: 0 });
    const res = await upload({ variant_id: 'ghost', slot: 'dictation', stage: 'validated' }, WAV_BYTES);
    expect(res.status).toBe(404);
  });
});
