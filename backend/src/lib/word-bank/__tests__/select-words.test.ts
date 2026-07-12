import { selectTargetWords } from '../select-words';
import type { SelectTarget, TargetWord } from '../select-words';
import type { PrismaClient } from '../../../../generated/prisma';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeWord(overrides: Partial<TargetWord> = {}): TargetWord {
  return {
    id: `w-${Math.random().toString(36).slice(2)}`,
    word: 'ном',
    image_url: null,
    part_of_speech: 'нэр үг',
    meaning_type: null,
    sample_sentence: null,
    errors_possible: ['B1', 'B2', 'A1', 'A2'],
    balarhai_unknown: false,
    app_level: 'M1',
    grade: 1,
    ...overrides,
  };
}

function makeDb(words: TargetWord[]): PrismaClient {
  const findMany = jest.fn().mockResolvedValue(words);
  return {
    word: { findMany },
  } as unknown as PrismaClient;
}

/** Returns the `where` clause from the first call to db.word.findMany */
function capturedWhere(db: PrismaClient): Record<string, unknown> {
  const mock = (db.word.findMany as jest.Mock);
  return mock.mock.calls[0]?.[0]?.where ?? {};
}

/** Returns the `where` clause from the Nth call (0-indexed) */
function capturedWhereN(db: PrismaClient, n: number): Record<string, unknown> {
  const mock = (db.word.findMany as jest.Mock);
  return mock.mock.calls[n]?.[0]?.where ?? {};
}

const BASE_TARGET: SelectTarget = {
  taskType: 'TT_2_1',   // word-anchored (fill)
  skill: 'S2',
  errorTargets: ['B1'],
  grade: 1,
  levels: ['M1'],
};

// Fixed salt so tests that care about determinism aren't at the mercy of
// the function's own random default.
const FIXED_SALT = 'test-salt';

// ─── Word-anchored query shape ────────────────────────────────────────────────

describe('selectTargetWords — word-anchored tier (TT_2_1)', () => {
  it('includes task_types_possible filter on first query', async () => {
    const words = Array.from({ length: 3 }, () => makeWord());
    const db = makeDb(words);

    await selectTargetWords(db, BASE_TARGET, 3);

    const where = capturedWhere(db);
    expect(where).toMatchObject({
      is_active: true,
      grade: 1,
      skills_possible: { has: 'S2' },
      app_level: 'M1',
      task_types_possible: { has: 'TT_2_1' },
    });
  });

  it('returns exactly count words when pool is large enough', async () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: `w-${i}` }));
    const db = makeDb(words);

    const result = await selectTargetWords(db, BASE_TARGET, 3);
    expect(result).toHaveLength(3);
  });

  it('uses an IN filter when multiple levels are selected', async () => {
    const words = Array.from({ length: 3 }, () => makeWord());
    const db = makeDb(words);

    await selectTargetWords(db, { ...BASE_TARGET, levels: ['M0', 'M1', 'M2'] }, 3);

    const where = capturedWhere(db);
    expect(where).toMatchObject({ app_level: { in: ['M0', 'M1', 'M2'] } });
  });

  it('result is a deterministic subset given the same explicit seedSalt', async () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: `w-${i}`, word: `үг${i}` }));
    const db1 = makeDb(words);
    const db2 = makeDb(words);

    const r1 = await selectTargetWords(db1, BASE_TARGET, 3, FIXED_SALT);
    const r2 = await selectTargetWords(db2, BASE_TARGET, 3, FIXED_SALT);
    expect(r1.map((w) => w.id)).toEqual(r2.map((w) => w.id));
  });

  it('different task type yields different shuffle order (same salt)', async () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: `w-${i}` }));
    const db1 = makeDb(words);
    const db2 = makeDb(words);

    const r1 = await selectTargetWords(db1, { ...BASE_TARGET, taskType: 'TT_2_1' }, 5, FIXED_SALT);
    const r2 = await selectTargetWords(db2, { ...BASE_TARGET, taskType: 'TT_3_2' }, 5, FIXED_SALT);
    // With 10 words shuffled differently, the full ordering should differ
    expect(r1.map((w) => w.id)).not.toEqual(r2.map((w) => w.id));
  });

  it('defaults to a fresh random salt — repeated calls with identical target vary', async () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: `w-${i}` }));
    const db1 = makeDb(words);
    const db2 = makeDb(words);

    const r1 = await selectTargetWords(db1, BASE_TARGET, 3);
    const r2 = await selectTargetWords(db2, BASE_TARGET, 3);
    // Astronomically unlikely to collide by chance with a 10-word pool
    expect(r1.map((w) => w.id)).not.toEqual(r2.map((w) => w.id));
  });

  it('different explicit seedSalt yields different selection/order', async () => {
    const words = Array.from({ length: 10 }, (_, i) => makeWord({ id: `w-${i}` }));
    const db1 = makeDb(words);
    const db2 = makeDb(words);

    const r1 = await selectTargetWords(db1, BASE_TARGET, 3, 'salt-a');
    const r2 = await selectTargetWords(db2, BASE_TARGET, 3, 'salt-b');
    expect(r1.map((w) => w.id)).not.toEqual(r2.map((w) => w.id));
  });
});

// ─── Sentence-level query shape ───────────────────────────────────────────────

describe('selectTargetWords — sentence-level tier (TT_6_1)', () => {
  it('omits task_types_possible filter', async () => {
    const words = Array.from({ length: 3 }, () => makeWord());
    const db = makeDb(words);

    await selectTargetWords(db, { ...BASE_TARGET, taskType: 'TT_6_1' }, 3);

    const where = capturedWhere(db);
    expect(where).not.toHaveProperty('task_types_possible');
    expect(where).toMatchObject({ is_active: true, grade: 1, skills_possible: { has: 'S2' } });
  });
});

// ─── C4/C5 balarhai widening ──────────────────────────────────────────────────

describe('selectTargetWords — C4/C5 widening', () => {
  it('wraps query in OR with balarhai_unknown when C4 in errorTargets', async () => {
    const words = [makeWord({ errors_possible: ['C4', 'C5'] })];
    const db = makeDb(words);

    await selectTargetWords(db, { ...BASE_TARGET, errorTargets: ['C4'] }, 1);

    const where = capturedWhere(db);
    expect(where).toHaveProperty('OR');
    const orClauses = (where as { OR: unknown[] }).OR;
    expect(orClauses).toHaveLength(2);
    const wideClause = orClauses[1] as Record<string, unknown>;
    expect(wideClause).toHaveProperty('balarhai_unknown', true);
  });

  it('wraps query in OR with balarhai_unknown when C5 in errorTargets', async () => {
    const db = makeDb([makeWord()]);

    await selectTargetWords(db, { ...BASE_TARGET, errorTargets: ['C5', 'B1'] }, 1);

    const where = capturedWhere(db);
    expect(where).toHaveProperty('OR');
  });

  it('does NOT widen when errorTargets has no C4/C5', async () => {
    const db = makeDb([makeWord()]);

    await selectTargetWords(db, { ...BASE_TARGET, errorTargets: ['B1', 'D4'] }, 1);

    const where = capturedWhere(db);
    expect(where).not.toHaveProperty('OR');
    expect(where).not.toHaveProperty('balarhai_unknown');
  });
});

// ─── Fallback ladder ──────────────────────────────────────────────────────────

describe('selectTargetWords — fallback ladder', () => {
  it('falls back to grade+skill when exact level query returns empty', async () => {
    // First call (exact) returns empty; second call (relax level) returns words
    const relaxWords = Array.from({ length: 3 }, () => makeWord({ app_level: 'M2' }));
    const findMany = jest.fn()
      .mockResolvedValueOnce([])       // exact: grade+level+skill+type → empty
      .mockResolvedValue(relaxWords);  // relax: grade+skill+type → 3 words

    const db = { word: { findMany } } as unknown as PrismaClient;
    const result = await selectTargetWords(db, BASE_TARGET, 3);

    expect(result).toHaveLength(3);
    expect(findMany).toHaveBeenCalledTimes(2);

    // Second call should NOT have app_level
    const relaxWhere = capturedWhereN(db, 1);
    expect(relaxWhere).not.toHaveProperty('app_level');
    expect(relaxWhere).toHaveProperty('task_types_possible');
  });

  it('falls back to grade-only floor after skill+type also returns empty', async () => {
    const floorWords = Array.from({ length: 3 }, () => makeWord());
    const findMany = jest.fn()
      .mockResolvedValueOnce([])       // exact
      .mockResolvedValueOnce([])       // relax level
      .mockResolvedValueOnce([])       // skill floor
      .mockResolvedValue(floorWords);  // absolute floor: grade only

    const db = { word: { findMany } } as unknown as PrismaClient;
    const result = await selectTargetWords(db, BASE_TARGET, 3);

    expect(result).toHaveLength(3);
    const absoluteFloorWhere = capturedWhereN(db, 3);
    expect(absoluteFloorWhere).toEqual({ is_active: true, root_word_id: null, grade: 1 });
  });

  it('returns empty array and does not throw when all ladder steps return empty', async () => {
    const db = makeDb([]);
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const result = await selectTargetWords(db, BASE_TARGET, 3);

    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });

  it('returns available words when pool is smaller than count', async () => {
    const twoWords = [makeWord({ id: 'w-1' }), makeWord({ id: 'w-2' })];
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const db = makeDb(twoWords);

    const result = await selectTargetWords(db, BASE_TARGET, 5);

    expect(result.length).toBeLessThanOrEqual(5);
    expect(result.length).toBeGreaterThan(0);
    consoleSpy.mockRestore();
  });

  it('does not query with a level filter when level is undefined', async () => {
    const words = Array.from({ length: 3 }, () => makeWord());
    const db = makeDb(words);

    await selectTargetWords(db, { ...BASE_TARGET, levels: undefined }, 3);

    const where = capturedWhere(db);
    expect(where).not.toHaveProperty('app_level');
  });
});

// ─── Deduplication ────────────────────────────────────────────────────────────

describe('selectTargetWords — deduplication', () => {
  it('deduplicates when fill-up step returns words already in first step', async () => {
    const shared = makeWord({ id: 'shared-1' });
    const extra1 = makeWord({ id: 'extra-1', app_level: 'M2' });
    const extra2 = makeWord({ id: 'extra-2', app_level: 'M2' });

    // First call: 1 word (sparse). Second call (fill): includes shared + extra
    const findMany = jest.fn()
      .mockResolvedValueOnce([shared])
      .mockResolvedValue([shared, extra1, extra2]);

    const db = { word: { findMany } } as unknown as PrismaClient;
    const result = await selectTargetWords(db, BASE_TARGET, 3);

    const ids = result.map((w) => w.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
    expect(ids).toContain('shared-1');
  });
});

// ─── No-level target ─────────────────────────────────────────────────────────

describe('selectTargetWords — no level specified', () => {
  it('builds a single query step without app_level and with task_types_possible', async () => {
    const words = Array.from({ length: 3 }, () => makeWord());
    const db = makeDb(words);

    await selectTargetWords(db, { ...BASE_TARGET, levels: undefined }, 3);

    expect((db.word.findMany as jest.Mock)).toHaveBeenCalledTimes(1);
    const where = capturedWhere(db);
    expect(where).not.toHaveProperty('app_level');
    expect(where).toHaveProperty('task_types_possible', { has: 'TT_2_1' });
  });
});
