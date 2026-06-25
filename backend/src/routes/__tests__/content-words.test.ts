/**
 * Unit tests for the admin word-bank routes:
 *   GET /api/admin/content/words          (list + grade_band filter)
 *   GET /api/admin/content/words/facets   (grade facet via unnest)
 *
 * Key invariant under test: the grade filter uses grade_band containment
 * ({ grade_band: { has: 'G1' } }) rather than integer equality. This means
 * a word with grade_band ['G1','G2'] is eligible under BOTH grade=G1 and
 * grade=G2 queries — the multi-grade path that real data (all G1) never
 * exercises in production.
 */

// Must be hoisted before any imports so transitive env/r2/pipeline deps don't
// call process.exit or instantiate API clients.
jest.mock('../../config/env', () => ({
  env: {
    ADMIN_SECRET:         'test-admin-secret-that-is-32chars-ok',
    GEMINI_API_KEY:       'AIzaFake',
    OPENROUTER_API_KEY:   'sk-or-fake',
    OPENAI_API_KEY:       undefined,
    NODE_ENV:             'test',
    DATABASE_URL:         'postgresql://localhost/test',
    JWT_SECRET:           'x'.repeat(64),
    JWT_EXPIRES_IN:       '7d',
    BCRYPT_ROUNDS:        12,
    CORS_ORIGIN:          'http://localhost:3000',
    PORT:                 3001,
    RATE_LIMIT_DISABLED:  'true',
    R2_ACCOUNT_ID:        undefined,
    R2_ACCESS_KEY_ID:     undefined,
    R2_SECRET_ACCESS_KEY: undefined,
    R2_BUCKET_NAME:       undefined,
    R2_PUBLIC_URL:        undefined,
    ALLOW_PROD_SEED:      undefined,
  },
}));

jest.mock('../../lib/auth/adminMiddleware', () => ({
  withAdmin: jest.fn((_c: unknown, next: () => Promise<void>) => next()),
}));

jest.mock('../../lib/db/client', () => ({
  prisma: {
    word:       { findMany: jest.fn(), count: jest.fn() },
    $queryRaw:  jest.fn(),
  },
}));

jest.mock('../../lib/pipeline/generator', () => ({
  generateForSpec:    jest.fn(),
  TASK_SPECS:         [],
  AVAILABLE_TASK_IDS: [],
}));

jest.mock('../../lib/pipeline/aiReviewer', () => ({
  reviewTaskDraft: jest.fn(),
}));

import { prisma } from '../../lib/db/client';
import contentRouter from '../content';

const mockFindMany  = prisma.word.findMany as jest.MockedFunction<any>;
const mockCount     = prisma.word.count   as jest.MockedFunction<any>;
const mockQueryRaw  = prisma.$queryRaw    as jest.MockedFunction<any>;

const BEARER = 'Bearer test-admin-secret-that-is-32chars-ok';

function get(path: string) {
  return contentRouter.request(path, { headers: { Authorization: BEARER } });
}

// ─── A word that belongs to two grades ───────────────────────────────────────

const MULTI_GRADE_WORD = {
  id:                   'WG1-TEST-0001',
  word:                 'тест',
  category:             'Тест',
  grade_band:           ['G1', 'G2'],
  char_count:           4,
  syllable_count:       1,
  skill_tags:           [],
  error_tags:           [],
  image_ok:             false,
  audio_ok:             false,
  image_prompt:         null,
  audio_text:           null,
  sample_sentence:      null,
  distractors:          [],
  blank_hint:           null,
  app_level:            'M1',
  meaning_complexity:   1,
  spelling_complexity:  1,
  morph_complexity:     1,
  suggested_exercises:  null,
  spelling_tag:         null,
  part_of_speech:       'нэр үг',
  meaning_type:         null,
  skills_possible:      [],
  errors_possible:      [],
  task_types_possible:  [],
  primary_feature:      null,
  primary_skill:        null,
  balarhai_unknown:     false,
};

// ─── GET /words — grade_band containment filter ───────────────────────────────

describe('GET /words — grade_band filter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([MULTI_GRADE_WORD]);
    mockCount.mockResolvedValue(1);
  });

  it('passes grade_band containment clause for grade=G1', async () => {
    const res = await get('/words?grade=G1');
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ grade_band: { has: 'G1' } }),
      }),
    );
  });

  it('passes grade_band containment clause for grade=G2', async () => {
    const res = await get('/words?grade=G2');
    expect(res.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ grade_band: { has: 'G2' } }),
      }),
    );
  });

  it('a word with grade_band [G1,G2] is returned under both grade=G1 and grade=G2', async () => {
    const resG1 = await get('/words?grade=G1');
    const bodyG1 = (await resG1.json()) as any;
    expect(bodyG1.success).toBe(true);
    expect(bodyG1.data.words).toHaveLength(1);
    expect(bodyG1.data.words[0].grade_band).toContain('G1');
    expect(bodyG1.data.words[0].grade_band).toContain('G2');

    jest.clearAllMocks();
    mockFindMany.mockResolvedValue([MULTI_GRADE_WORD]);
    mockCount.mockResolvedValue(1);

    const resG2 = await get('/words?grade=G2');
    const bodyG2 = (await resG2.json()) as any;
    expect(bodyG2.success).toBe(true);
    expect(bodyG2.data.words).toHaveLength(1);
    expect(bodyG2.data.words[0].grade_band).toContain('G1');
    expect(bodyG2.data.words[0].grade_band).toContain('G2');
  });

  it('returns 400 for a non-enum grade value (old integer format)', async () => {
    const res = await get('/words?grade=1');
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('omits the grade_band clause when grade param is absent', async () => {
    const res = await get('/words');
    expect(res.status).toBe(200);
    // findMany called, but where should have no grade_band key
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty('grade_band');
  });
});

// ─── GET /words/facets — grades from unnest(grade_band) ──────────────────────

describe('GET /words/facets — grade facet uses grade_band', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryRaw.mockResolvedValue([{ grade: 'G1' }, { grade: 'G2' }]);
    mockFindMany.mockResolvedValue([]);
  });

  it('returns grades sourced from $queryRaw unnest', async () => {
    const res = await get('/words/facets');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.grades).toEqual(['G1', 'G2']);
    expect(mockQueryRaw).toHaveBeenCalled();
  });

  it('includes G1 and G2 when a multi-grade word is present in the DB', async () => {
    // Simulates a DB with one word whose grade_band = ['G1','G2']:
    // the unnest returns two rows, one per grade.
    mockQueryRaw.mockResolvedValue([{ grade: 'G1' }, { grade: 'G2' }]);
    const res = await get('/words/facets');
    const body = (await res.json()) as any;
    expect(body.data.grades).toContain('G1');
    expect(body.data.grades).toContain('G2');
  });
});
