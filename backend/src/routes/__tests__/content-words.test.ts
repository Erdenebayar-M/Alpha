/**
 * Unit tests for the admin word-bank routes:
 *   GET /api/admin/content/words          (list + grade_band filter)
 *   GET /api/admin/content/words/facets   (grade facet flattened from grade_band)
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
    word: {
      findMany:   jest.fn(),
      count:      jest.fn(),
      findUnique: jest.fn(),
      findFirst:  jest.fn(),
      update:     jest.fn(),
      updateMany: jest.fn(),
      create:     jest.fn(),
    },
    $transaction: jest.fn(),
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

const mockFindMany   = prisma.word.findMany   as jest.MockedFunction<any>;
const mockCount      = prisma.word.count      as jest.MockedFunction<any>;
const mockFindUnique = prisma.word.findUnique as jest.MockedFunction<any>;
const mockFindFirst  = prisma.word.findFirst  as jest.MockedFunction<any>;
const mockUpdate     = prisma.word.update     as jest.MockedFunction<any>;
const mockUpdateMany = prisma.word.updateMany as jest.MockedFunction<any>;
const mockCreate     = prisma.word.create     as jest.MockedFunction<any>;
const mockTx         = prisma.$transaction    as jest.MockedFunction<any>;

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

  it('defaults to roots-only (root_word_id: null)', async () => {
    const res = await get('/words');
    expect(res.status).toBe(200);
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).toEqual(expect.objectContaining({ root_word_id: null }));
  });

  it('scope=all drops the root_word_id filter so forms are included too', async () => {
    const res = await get('/words?scope=all');
    expect(res.status).toBe(200);
    const call = mockFindMany.mock.calls[0][0];
    expect(call.where).not.toHaveProperty('root_word_id');
  });
});

// ─── GET /words/facets — grades flattened from grade_band ────────────────────

describe('GET /words/facets — grade facet uses grade_band', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Promise.all call order: grade_band select, categories, app_levels, part_of_speech, meaning_type.
    mockFindMany
      .mockResolvedValueOnce([{ grade_band: ['G1'] }, { grade_band: ['G2'] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
  });

  it('returns grades flattened from grade_band', async () => {
    const res = await get('/words/facets');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.grades).toEqual(['G1', 'G2']);
  });

  it('includes G1 and G2 when a multi-grade word is present in the DB', async () => {
    mockFindMany
      .mockReset()
      .mockResolvedValueOnce([{ grade_band: ['G1', 'G2'] }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const res = await get('/words/facets');
    const body = (await res.json()) as any;
    expect(body.data.grades).toContain('G1');
    expect(body.data.grades).toContain('G2');
  });

  it('returns distinct part_of_speech and meaning_type values', async () => {
    mockFindMany
      .mockReset()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ part_of_speech: 'нэр үг' }, { part_of_speech: 'үйл үг' }])
      .mockResolvedValueOnce([{ meaning_type: 'бодит/зурагтай холбож болно' }]);
    const res = await get('/words/facets');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.part_of_speech).toEqual(['нэр үг', 'үйл үг']);
    expect(body.data.meaning_type).toEqual(['бодит/зурагтай холбож болно']);
  });
});

// ─── POST /words — create ──────────────────────────────────────────────────────

describe('POST /words', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindFirst.mockResolvedValue(null); // no existing duplicate by default
    mockCreate.mockImplementation((args: any) => Promise.resolve({ id: args.data.id, word: args.data.word }));
  });

  it('creates a word with derived char_count/syllable_count and capability', async () => {
    const res = await post('/words', { word: 'явах', category: 'Үйл ажиллагаа' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.action).toBe('created');
    expect(body.data.word).toBe('явах');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          word: 'явах',
          category: 'Үйл ажиллагаа',
          char_count: 4,
          skills_possible: expect.any(Array),
        }),
      }),
    );
  });

  it('rejects a missing word', async () => {
    const res = await post('/words', { category: 'Амьтад' });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates a word already linked to a root when root_id is given, with zeroed capability', async () => {
    mockFindUnique.mockResolvedValue({ id: 'WG9-ROOT', word: 'унтах', root_word_id: null });
    const res = await post('/words', { word: 'унтахаас', category: 'Амьтад', root_id: 'WG9-ROOT' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.root_id).toBe('WG9-ROOT');
    expect(body.data.root_word).toBe('унтах');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          root_word_id: 'WG9-ROOT',
          skills_possible: [],
          errors_possible: [],
          task_types_possible: [],
          primary_feature: null,
          primary_skill: null,
        }),
      }),
    );
  });

  it('rejects root_id that does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await post('/words', { word: 'унтахаас', category: 'Амьтад', root_id: 'WG9-MISSING' });
    expect(res.status).toBe(404);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects root_id that is itself a form, not a root', async () => {
    mockFindUnique.mockResolvedValue({ id: 'WG9-FORM', word: 'унтахаас', root_word_id: 'WG9-ROOT' });
    const res = await post('/words', { word: 'унтахгүй', category: 'Амьтад', root_id: 'WG9-FORM' });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a word with embedded space', async () => {
    const res = await post('/words', { word: 'муур сарлаг', category: 'Амьтад' });
    expect(res.status).toBe(400);
  });

  it('rejects non-Mongolian characters', async () => {
    const res = await post('/words', { word: 'cat', category: 'Амьтад' });
    expect(res.status).toBe(400);
  });

  it('rejects when an active root with the same word already exists', async () => {
    mockFindFirst.mockResolvedValue({ id: 'WG1-TEST-0001', word: 'явах' });
    const res = await post('/words', { word: 'явах', category: 'Амьтад' });
    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── GET /words/:id ───────────────────────────────────────────────────────────

describe('GET /words/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when word does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await get('/words/WG1-TEST-0001');
    expect(res.status).toBe(404);
  });

  it('returns the full word record by id', async () => {
    mockFindUnique.mockResolvedValue(MULTI_GRADE_WORD);
    const res = await get('/words/WG1-TEST-0001');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.word.id).toBe('WG1-TEST-0001');
  });
});

// ─── PATCH /words/:id ─────────────────────────────────────────────────────────

function patch(path: string, body: unknown) {
  return contentRouter.request(path, {
    method: 'PATCH',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function del(path: string) {
  return contentRouter.request(path, {
    method: 'DELETE',
    headers: { Authorization: BEARER },
  });
}

function post(path: string, body: unknown) {
  return contentRouter.request(path, {
    method: 'POST',
    headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const EXISTING_WORD = { ...MULTI_GRADE_WORD, is_active: true };

describe('PATCH /words/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(EXISTING_WORD);
    mockTx.mockImplementation((fn: (tx: any) => Promise<unknown>) =>
      fn({
        word: { update: mockUpdate },
      }),
    );
    mockUpdate.mockResolvedValue(EXISTING_WORD);
  });

  it('returns 404 when word does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await patch('/words/WG1-TEST-0001', { category: 'Амьтад' });
    expect(res.status).toBe(404);
  });

  it('rejects body with no editable fields', async () => {
    const res = await patch('/words/WG1-TEST-0001', {});
    expect(res.status).toBe(400);
  });

  it('rejects attempt to set a derived field (skills_possible)', async () => {
    const res = await patch('/words/WG1-TEST-0001', { skills_possible: ['S1'] });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.message).toMatch(/derived/i);
  });

  it('rejects attempt to set id', async () => {
    const res = await patch('/words/WG1-TEST-0001', { id: 'WG1-HACK' });
    expect(res.status).toBe(400);
  });

  it('rejects word with embedded space (phrase guard)', async () => {
    const res = await patch('/words/WG1-TEST-0001', { word: 'авах гэх' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.message).toMatch(/single token/i);
  });

  it('rejects word with non-Mongolian characters', async () => {
    const res = await patch('/words/WG1-TEST-0001', { word: 'hello' });
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.message).toMatch(/mongolian cyrillic/i);
  });

  it('editing only category does NOT trigger re-derivation', async () => {
    const res = await patch('/words/WG1-TEST-0001', { category: 'Амьтад' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.rederived).toBe(false);
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('skills_possible');
  });

  it('editing word triggers re-derivation and overwrites derived columns', async () => {
    // 'ном' = noun, ends in consonant → FINAL_CONSONANT + TAKES_SUFFIX features.
    // Universal skills S1/S2/S7 always present; TAKES_SUFFIX (noun) adds S5, E4, E5.
    // EXISTING_WORD has part_of_speech 'нэр үг' (noun) and meaning_type null (not imageable).
    const res = await patch('/words/WG1-TEST-0001', { word: 'ном' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.rederived).toBe(true);
    const { data: d } = mockUpdate.mock.calls[0][0];
    expect(d.skills_possible).toEqual(expect.arrayContaining(['S1', 'S2', 'S5', 'S7']));
    expect(d.errors_possible).toEqual(expect.arrayContaining(['D5', 'E4', 'E5']));
    expect(d.primary_skill).toBe('S5');           // TAKES_SUFFIX is highest-ranked for a noun
    expect(d.balarhai_unknown).toBe(false);
  });

  it('editing part_of_speech to verb adds verb suffix task types', async () => {
    // Existing word is 'тест' (noun). Changing to verb → TAKES_SUFFIX still fires but
    // verb branch: adds E6 (conjugation error) instead of E4/E5, and TT_5_4 instead of noun tasks.
    const res = await patch('/words/WG1-TEST-0001', { part_of_speech: 'үйл үг' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.rederived).toBe(true);
    const { data: d } = mockUpdate.mock.calls[0][0];
    expect(d.errors_possible).toEqual(expect.arrayContaining(['E6']));
    expect(d.task_types_possible).toEqual(expect.arrayContaining(['TT_5_4']));
    expect(d.errors_possible).not.toEqual(expect.arrayContaining(['E4']));
  });

  it('editing meaning_type triggers re-derivation', async () => {
    const res = await patch('/words/WG1-TEST-0001', { meaning_type: 'бодит/зурагтай холбож болно' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.rederived).toBe(true);
    const updateCall = mockUpdate.mock.calls[0][0];
    // imageable=true for this meaning_type, so picture task types should be included
    expect(updateCall.data.task_types_possible).toEqual(
      expect.arrayContaining(['TT_1_2', 'TT_1_3']),
    );
  });

  it('is_active can be set to true (reactivation)', async () => {
    const res = await patch('/words/WG1-TEST-0001', { is_active: true });
    expect(res.status).toBe(200);
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.is_active).toBe(true);
  });

  it('a content-field edit sets is_edited: true', async () => {
    const res = await patch('/words/WG1-TEST-0001', { category: 'Амьтад' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.updated_fields).toContain('is_edited');
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data.is_edited).toBe(true);
  });

  it('a bare is_active toggle does NOT set is_edited', async () => {
    const res = await patch('/words/WG1-TEST-0001', { is_active: false });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.updated_fields).not.toContain('is_edited');
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.data).not.toHaveProperty('is_edited');
  });
});

// ─── DELETE /words/:id (soft-delete) ─────────────────────────────────────────

describe('DELETE /words/:id', () => {
  const mockUpdateMany = jest.fn();
  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(EXISTING_WORD);
    mockTx.mockImplementation((fn: (tx: any) => Promise<unknown>) =>
      fn({ word: { update: mockUpdate, updateMany: mockUpdateMany } }),
    );
    mockUpdate.mockResolvedValue({ ...EXISTING_WORD, is_active: false });
    mockUpdateMany.mockResolvedValue({ count: 3 });
  });

  it('returns 404 when word does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await del('/words/WG1-TEST-0001');
    expect(res.status).toBe(404);
  });

  it('sets is_active=false and the row still exists (soft-delete)', async () => {
    const res = await del('/words/WG1-TEST-0001');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.action).toBe('deactivated');
    expect(body.data.id).toBe('WG1-TEST-0001');
    // update was called (not delete) — the row is preserved
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { is_active: false } }),
    );
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('mode=detach unlinks the forms (root_word_id → null)', async () => {
    const res = await del('/words/WG1-TEST-0001?mode=detach');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.mode).toBe('detach');
    expect(body.data.forms_detached).toBe(3);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { root_word_id: 'WG1-TEST-0001' }, data: { root_word_id: null } }),
    );
  });

  it('mode=cascade deactivates the forms too', async () => {
    const res = await del('/words/WG1-TEST-0001?mode=cascade');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.forms_deactivated).toBe(3);
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { root_word_id: 'WG1-TEST-0001' }, data: { is_active: false } }),
    );
  });

  it('rejects an invalid mode', async () => {
    const res = await del('/words/WG1-TEST-0001?mode=bogus');
    expect(res.status).toBe(400);
  });
});

// ─── POST /words/bulk-deactivate ───────────────────────────────────────────────

describe('POST /words/bulk-deactivate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('deactivates exactly the given ids and nothing else', async () => {
    const res = await post('/words/bulk-deactivate', { ids: ['WG1-TEST-0001', 'WG1-TEST-0002'] });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.action).toBe('bulk_deactivated');
    expect(body.data.requested).toBe(2);
    expect(body.data.deactivated).toBe(2);
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ['WG1-TEST-0001', 'WG1-TEST-0002'] } },
      data: { is_active: false },
    });
  });

  it('rejects an empty ids array', async () => {
    const res = await post('/words/bulk-deactivate', { ids: [] });
    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects a missing body', async () => {
    const res = await post('/words/bulk-deactivate', {});
    expect(res.status).toBe(400);
  });
});

// ─── POST /words/:id/connect ──────────────────────────────────────────────────

describe('POST /words/:id/connect', () => {
  const mockUpdateMany = jest.fn();
  const mockFindFirst = jest.fn();
  const mockCreate = jest.fn();

  function connect(id: string, body: unknown) {
    return contentRouter.request(`/words/${id}/connect`, {
      method: 'POST',
      headers: { Authorization: BEARER, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockFindUnique.mockResolvedValue(EXISTING_WORD); // word being connected (word: 'тест')
    mockTx.mockImplementation((fn: (tx: any) => Promise<unknown>) =>
      fn({ word: { update: mockUpdate, updateMany: mockUpdateMany, findFirst: mockFindFirst, create: mockCreate } }),
    );
    mockUpdate.mockResolvedValue({});
    mockUpdateMany.mockResolvedValue({ count: 0 });
  });

  it('links to an existing root', async () => {
    mockFindFirst.mockResolvedValue({ id: 'WG9-ROOT', word: 'авах' });
    const res = await connect('WG1-TEST-0001', { root: 'авах' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.root_id).toBe('WG9-ROOT');
    expect(body.data.root_created).toBe(false);
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'WG1-TEST-0001' }, data: expect.objectContaining({ root_word_id: 'WG9-ROOT' }) }),
    );
  });

  it('creates a new root when none exists', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'WLEM-C-abcd1234', word: 'явах' });
    const res = await connect('WG1-TEST-0001', { root: 'явах' });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.root_created).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
  });

  it('rejects connecting a word to itself', async () => {
    const res = await connect('WG1-TEST-0001', { root: 'тест' });
    expect(res.status).toBe(400);
  });
});

// ─── POST /words/:id/disconnect ────────────────────────────────────────────────

describe('POST /words/:id/disconnect', () => {
  const FORM_WORD = { ...EXISTING_WORD, root_word_id: 'WG9-ROOT' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 404 when word does not exist', async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await post('/words/WG1-TEST-0001/disconnect', {});
    expect(res.status).toBe(404);
  });

  it('rejects a word that is not linked to a root', async () => {
    mockFindUnique.mockResolvedValue(EXISTING_WORD); // no root_word_id
    const res = await post('/words/WG1-TEST-0001/disconnect', {});
    expect(res.status).toBe(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('unlinks the word and re-derives its capability', async () => {
    mockFindUnique.mockResolvedValue(FORM_WORD);
    mockUpdate.mockResolvedValue({ ...FORM_WORD, root_word_id: null });
    const res = await post('/words/WG1-TEST-0001/disconnect', {});
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.data.action).toBe('disconnected');
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'WG1-TEST-0001' },
        data: expect.objectContaining({
          root_word_id: null,
          skills_possible: expect.any(Array),
          errors_possible: expect.any(Array),
          task_types_possible: expect.any(Array),
        }),
      }),
    );
  });
});

