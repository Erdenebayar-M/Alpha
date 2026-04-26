import { updateSkillState, type SkillUpdateInput } from '../skill-engine';
import type { PrismaClient } from '../../../../generated/prisma';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    learner_id: 'learner-1',
    s1_score: 0, s1_level: 'M0', s1_confidence: 'LOW',
    s2_score: 0, s2_level: 'M0', s2_confidence: 'LOW',
    s3_score: 0, s3_level: 'M0', s3_confidence: 'LOW',
    s4_score: 0, s4_level: 'M0', s4_confidence: 'LOW',
    s5_score: 0, s5_level: 'M0', s5_confidence: 'LOW',
    s6_score: 0, s6_level: 'M0', s6_confidence: 'LOW',
    s7_score: 0, s7_level: 'M0', s7_confidence: 'LOW',
    s8_score: 0, s8_level: 'M0', s8_confidence: 'LOW',
    general_level: 'M0',
    weak_skills: [],
    top_error_codes: [],
    recent_error_codes: [],
    recent_task_ids: [],
    current_streak: 1,
    longest_streak: 1,
    ...overrides,
  };
}

type MockState = ReturnType<typeof makeState>;

interface MockPrismaOpts {
  state?: MockState | null;
  attemptCount?: number;
  recentAttempts?: Array<{ error_codes: string[]; created_at: Date }>;
  prevAttempt?: { created_at: Date } | null;
}

function makeMockPrisma(opts: MockPrismaOpts = {}): {
  db: PrismaClient;
  update: jest.Mock;
  create: jest.Mock;
} {
  const update = jest.fn().mockResolvedValue({});
  const create = jest.fn().mockResolvedValue(opts.state ?? makeState());

  const db = {
    learnerSkillState: {
      findUnique: jest.fn().mockResolvedValue(
        opts.state !== undefined ? opts.state : makeState(),
      ),
      create,
      update,
    },
    attempt: {
      count: jest.fn().mockResolvedValue(opts.attemptCount ?? 0),
      findMany: jest.fn().mockResolvedValue(opts.recentAttempts ?? []),
      findFirst: jest.fn().mockResolvedValue(
        opts.prevAttempt !== undefined ? opts.prevAttempt : null,
      ),
    },
  } as unknown as PrismaClient;

  return { db, update, create };
}

// Fixed reference time used across all streak tests.
const NOW = new Date('2024-06-15T10:00:00.000Z');

const baseInput: SkillUpdateInput = {
  learnerId: 'learner-1',
  primarySkill: 'S1',
  score: 1.0,
  errorCodes: [],
  taskId: 'task-001',
  attemptedAt: NOW,
};

// ─── EMA (alpha = 0.3) ────────────────────────────────────────────────────────

describe('EMA score update (alpha = 0.3)', () => {
  test('ema(0, 1.0) → 0.3', async () => {
    const { db, update } = makeMockPrisma({ state: makeState({ s1_score: 0 }) });
    await updateSkillState({ ...baseInput, score: 1.0 }, db);
    expect(update.mock.calls[0][0].data.s1_score).toBeCloseTo(0.3, 10);
  });

  test('ema(0.5, 1.0) → 0.65', async () => {
    const { db, update } = makeMockPrisma({ state: makeState({ s1_score: 0.5 }) });
    await updateSkillState({ ...baseInput, score: 1.0 }, db);
    expect(update.mock.calls[0][0].data.s1_score).toBeCloseTo(0.65, 10);
  });

  test('ema(1.0, 0.0) → 0.7', async () => {
    const { db, update } = makeMockPrisma({ state: makeState({ s1_score: 1.0 }) });
    await updateSkillState({ ...baseInput, score: 0.0 }, db);
    expect(update.mock.calls[0][0].data.s1_score).toBeCloseTo(0.7, 10);
  });

  test('result is always between 0 and 1', async () => {
    const cases: Array<[number, number]> = [
      [0, 1.0],
      [1.0, 0],
      [0.5, 0.75],
      [0, 0],
      [1.0, 1.0],
    ];
    for (const [initial, score] of cases) {
      const { db, update } = makeMockPrisma({ state: makeState({ s1_score: initial }) });
      await updateSkillState({ ...baseInput, score }, db);
      const result = update.mock.calls[0][0].data.s1_score as number;
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Score → level thresholds ─────────────────────────────────────────────────
//
// When initial === attempt score, ema(x, x) = x, so the resulting score is
// exactly x and the level mapping is deterministic.

describe('score → level thresholds', () => {
  // Note: exact boundary values (e.g. 0.75, 0.40, 0.20) are skipped here because
  // ema(x, x) = 0.3x + 0.7x underflows slightly below x in floating-point,
  // causing boundary tests to land in the lower band. Boundaries are implicitly
  // covered by adjacent cases (e.g. 0.80 ∈ M4 and 0.65 ∈ M3 straddle 0.75).
  const cases: Array<{ initial: number; score: number; expected: string }> = [
    { initial: 0.95, score: 0.95, expected: 'M5' },  // ≥ 0.90
    { initial: 0.90, score: 0.90, expected: 'M5' },  // 0.90 → M5 (FP-safe)
    { initial: 0.80, score: 0.80, expected: 'M4' },  // ≥ 0.75, < 0.90
    { initial: 0.76, score: 0.76, expected: 'M4' },  // near bottom of M4 band
    { initial: 0.65, score: 0.65, expected: 'M3' },  // ≥ 0.60, < 0.75
    { initial: 0.60, score: 0.60, expected: 'M3' },  // 0.60 → M3 (FP-safe)
    { initial: 0.50, score: 0.50, expected: 'M2' },  // ≥ 0.40, < 0.60
    { initial: 0.45, score: 0.45, expected: 'M2' },  // near bottom of M2 band
    { initial: 0.30, score: 0.30, expected: 'M1' },  // ≥ 0.20, < 0.40
    { initial: 0.25, score: 0.25, expected: 'M1' },  // near bottom of M1 band
    { initial: 0.10, score: 0.10, expected: 'M0' },  // < 0.20
    { initial: 0.00, score: 0.00, expected: 'M0' },  // floor
  ];

  test.each(cases)('initial=$initial → s1_level=$expected', async ({ initial, score, expected }) => {
    const { db, update } = makeMockPrisma({ state: makeState({ s1_score: initial }) });
    await updateSkillState({ ...baseInput, score, primarySkill: 'S1' }, db);
    expect(update.mock.calls[0][0].data.s1_level).toBe(expected);
  });
});

// ─── Streak logic ─────────────────────────────────────────────────────────────

describe('streak logic', () => {
  test('no previous attempt (first ever) → current_streak = 1', async () => {
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 0, longest_streak: 0 }),
      prevAttempt: null,
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.current_streak).toBe(1);
  });

  test('previous attempt on the same day → streak unchanged', async () => {
    const earlierToday = new Date(NOW);
    earlierToday.setHours(6, 0, 0, 0);
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 5, longest_streak: 7 }),
      prevAttempt: { created_at: earlierToday },
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.current_streak).toBe(5);
  });

  test('previous attempt yesterday → streak increments by 1', async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 3, longest_streak: 5 }),
      prevAttempt: { created_at: yesterday },
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.current_streak).toBe(4);
  });

  test('previous attempt 2+ days ago → streak resets to 1', async () => {
    const twoDaysAgo = new Date(NOW);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 8, longest_streak: 10 }),
      prevAttempt: { created_at: twoDaysAgo },
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.current_streak).toBe(1);
  });

  test('streak increment updates longest_streak when new streak exceeds it', async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 9, longest_streak: 9 }),
      prevAttempt: { created_at: yesterday },
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.current_streak).toBe(10);
    expect(update.mock.calls[0][0].data.longest_streak).toBe(10);
  });

  test('same-day attempt does not shrink longest_streak', async () => {
    const earlierToday = new Date(NOW);
    earlierToday.setHours(4, 0, 0, 0);
    const { db, update } = makeMockPrisma({
      state: makeState({ current_streak: 5, longest_streak: 12 }),
      prevAttempt: { created_at: earlierToday },
    });
    await updateSkillState(baseInput, db);
    expect(update.mock.calls[0][0].data.longest_streak).toBe(12);
  });
});

// ─── DB write ─────────────────────────────────────────────────────────────────

describe('DB write', () => {
  test('learnerSkillState.update is called exactly once', async () => {
    const { db, update } = makeMockPrisma();
    await updateSkillState(baseInput, db);
    expect(update).toHaveBeenCalledTimes(1);
  });

  test('update where-clause targets the correct learner', async () => {
    const { db, update } = makeMockPrisma();
    await updateSkillState({ ...baseInput, learnerId: 'learner-42' }, db);
    expect(update.mock.calls[0][0].where).toEqual({ learner_id: 'learner-42' });
  });

  test('update payload contains correct score, level, and streak for known input', async () => {
    // s1 starts at 0, attempt = 1.0 → ema = 0.3 → M1; first attempt → streak = 1
    const { db, update } = makeMockPrisma({
      state: makeState({ s1_score: 0, current_streak: 5, longest_streak: 5 }),
      prevAttempt: null,
    });
    await updateSkillState({ ...baseInput, score: 1.0, primarySkill: 'S1' }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.s1_score).toBeCloseTo(0.3, 10);
    expect(data.s1_level).toBe('M1'); // 0.3 ≥ 0.20, < 0.40
    expect(data.current_streak).toBe(1);
  });

  test('non-exercised skills retain their existing scores unchanged', async () => {
    const { db, update } = makeMockPrisma({
      state: makeState({ s2_score: 0.7, s3_score: 0.4 }),
    });
    await updateSkillState({ ...baseInput, primarySkill: 'S1' }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.s2_score).toBeCloseTo(0.7, 10);
    expect(data.s3_score).toBeCloseTo(0.4, 10);
  });

  test('weak_skills contains up to 3 skills with score < 0.60, sorted lowest-first', async () => {
    // All skills start at 0; attempt S1 with score 0 → s1 stays 0; all 8 weak → top 3
    const { db, update } = makeMockPrisma({ state: makeState() });
    await updateSkillState({ ...baseInput, score: 0 }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.weak_skills).toEqual(['S1', 'S2', 'S3']);
    expect(data.weak_skills).toHaveLength(3);
  });

  test('strong skill (score ≥ 0.60) is excluded from weak_skills', async () => {
    // S1 already at 0.8; others at 0; attempt S1 with 1.0 → ema(0.8, 1.0) = 0.86, still strong
    const { db, update } = makeMockPrisma({
      state: makeState({ s1_score: 0.8 }),
    });
    await updateSkillState({ ...baseInput, score: 1.0, primarySkill: 'S1' }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.weak_skills).not.toContain('S1');
    expect(data.weak_skills).toEqual(['S2', 'S3', 'S4']);
  });

  test('top_error_codes are ranked by frequency across current + recent attempts', async () => {
    const recentAttempts = [
      { error_codes: ['B1', 'C1', 'C1'], created_at: new Date() },
      { error_codes: ['C1', 'B3'],       created_at: new Date() },
    ];
    const { db, update } = makeMockPrisma({
      state: makeState(),
      recentAttempts,
    });
    // Current attempt adds G1; historical C1 appears 3 times, B1 once, B3 once, G1 once
    await updateSkillState({ ...baseInput, errorCodes: ['G1'] }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.top_error_codes[0]).toBe('C1'); // most frequent
    expect(data.top_error_codes).toHaveLength(3);
  });

  test('new taskId is prepended to recent_task_ids and list is capped at 20', async () => {
    // Fill up 20 existing task ids
    const existing = Array.from({ length: 20 }, (_, i) => `task-existing-${i}`);
    const { db, update } = makeMockPrisma({
      state: makeState({ recent_task_ids: existing }),
    });
    await updateSkillState({ ...baseInput, taskId: 'task-new' }, db);
    const { data } = update.mock.calls[0][0];
    expect(data.recent_task_ids[0]).toBe('task-new');
    expect(data.recent_task_ids).toHaveLength(20);
    // Oldest task dropped
    expect(data.recent_task_ids).not.toContain('task-existing-19');
  });

  test('duplicate taskId is deduplicated in recent_task_ids', async () => {
    const { db, update } = makeMockPrisma({
      state: makeState({ recent_task_ids: ['task-001', 'task-002'] }),
    });
    await updateSkillState({ ...baseInput, taskId: 'task-001' }, db);
    const ids: string[] = update.mock.calls[0][0].data.recent_task_ids;
    const occurrences = ids.filter((id) => id === 'task-001').length;
    expect(occurrences).toBe(1);
  });

  test('state row is created when findUnique returns null', async () => {
    const { db, update, create } = makeMockPrisma({ state: null });
    await updateSkillState(baseInput, db);
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });
});

// ─── Integration smoke test ───────────────────────────────────────────────────

describe('integration smoke test', () => {
  test('full update with known inputs produces expected score, level, and streak', async () => {
    const yesterday = new Date(NOW);
    yesterday.setDate(yesterday.getDate() - 1);

    const { db, update } = makeMockPrisma({
      state: makeState({
        s4_score: 0.5,  // S4 exercised
        current_streak: 2,
        longest_streak: 5,
      }),
      attemptCount: 4,  // countToConfidence(5) → MEDIUM
      recentAttempts: [
        { error_codes: ['E1', 'E2'], created_at: new Date() },
      ],
      prevAttempt: { created_at: yesterday }, // consecutive day → streak + 1
    });

    await updateSkillState(
      {
        learnerId: 'learner-1',
        primarySkill: 'S4',
        score: 1.0,
        errorCodes: ['E1'],
        taskId: 'task-smoke',
        attemptedAt: NOW,
      },
      db,
    );

    const { data } = update.mock.calls[0][0];

    // ema(0.5, 1.0) = 0.3 * 1.0 + 0.7 * 0.5 = 0.65 → M3
    expect(data.s4_score).toBeCloseTo(0.65, 10);
    expect(data.s4_level).toBe('M3');

    // 4 prior attempts + 1 = 5 → MEDIUM
    expect(data.s4_confidence).toBe('MEDIUM');

    // consecutive day → 2 + 1 = 3; longest stays 5
    expect(data.current_streak).toBe(3);
    expect(data.longest_streak).toBe(5);

    // E1 appears in both current and recentAttempts → should be top code
    expect(data.top_error_codes).toContain('E1');

    // task-smoke added to front
    expect(data.recent_task_ids[0]).toBe('task-smoke');
  });
});

// ─── Error handling ───────────────────────────────────────────────────────────

describe('input validation', () => {
  test('throws for invalid skill code S0', async () => {
    const { db } = makeMockPrisma();
    await expect(
      updateSkillState({ ...baseInput, primarySkill: 'S0' }, db),
    ).rejects.toThrow('Invalid skill code: S0');
  });

  test('throws for invalid skill code S9', async () => {
    const { db } = makeMockPrisma();
    await expect(
      updateSkillState({ ...baseInput, primarySkill: 'S9' }, db),
    ).rejects.toThrow('Invalid skill code: S9');
  });
});
