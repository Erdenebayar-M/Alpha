import {
  verdictOf,
  planNextRung,
  resolveRung,
  selectNextItem,
  shouldStop,
  estimateLevel,
  DEFAULT_CONFIG,
  type ServedItem,
  type CandidateTask,
} from '../diagnostic-adaptive';

const cfg = DEFAULT_CONFIG;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function item(rung: number, score: number, over: Partial<ServedItem> = {}): ServedItem {
  return {
    task_id: over.task_id ?? `t-${rung}-${score}-${Math.random().toString(36).slice(2, 6)}`,
    rung,
    primary_skill: over.primary_skill ?? 'S2',
    score,
    error_codes: over.error_codes ?? [],
    time_seconds: over.time_seconds ?? 20,
    estimated_time_seconds: over.estimated_time_seconds ?? 30,
  };
}

const PASS = 1;
const FAIL = 0;
const HOLD = 0.5;

function cand(id: string, over: Partial<CandidateTask> = {}): CandidateTask {
  return {
    id,
    primary_skill: over.primary_skill ?? 'S2',
    task_type: over.task_type ?? 'TT_1_1',
    difficulty: over.difficulty ?? 3,
  };
}

// ─── verdictOf ───────────────────────────────────────────────────────────────

describe('verdictOf', () => {
  test('≥0.75 PASS, ≤0.25 FAIL, middle HOLD', () => {
    expect(verdictOf(1, cfg)).toBe('PASS');
    expect(verdictOf(0.75, cfg)).toBe('PASS');
    expect(verdictOf(0.5, cfg)).toBe('HOLD');
    expect(verdictOf(0.25, cfg)).toBe('FAIL');
    expect(verdictOf(0, cfg)).toBe('FAIL');
  });
});

// ─── planNextRung (staircase) ────────────────────────────────────────────────

describe('planNextRung', () => {
  test('first item is the warm-up rung (M1)', () => {
    expect(planNextRung([], cfg)).toBe(1);
  });

  test('second item jumps to the start rung (M2)', () => {
    expect(planNextRung([item(1, PASS)], cfg)).toBe(2);
  });

  test('PASS steps up, FAIL steps down', () => {
    expect(planNextRung([item(1, PASS), item(2, PASS)], cfg)).toBe(3);
    expect(planNextRung([item(1, PASS), item(2, FAIL)], cfg)).toBe(1);
  });

  test('clamps at M5 ceiling and M0 floor', () => {
    expect(planNextRung([item(1, PASS), item(5, PASS)], cfg)).toBe(5);
    expect(planNextRung([item(1, PASS), item(0, FAIL)], cfg)).toBe(0);
  });

  test('single HOLD re-probes the same rung; second HOLD steps down', () => {
    expect(planNextRung([item(1, PASS), item(3, HOLD)], cfg)).toBe(3);
    expect(planNextRung([item(1, PASS), item(3, HOLD), item(3, HOLD)], cfg)).toBe(2);
  });
});

// ─── resolveRung (bank widening) ─────────────────────────────────────────────

describe('resolveRung', () => {
  test('returns target when the bank has it', () => {
    expect(resolveRung(3, [1, 2, 3, 4])).toBe(3);
  });

  test('widens up first, then down', () => {
    expect(resolveRung(3, [0, 1, 4, 5])).toBe(4); // up wins over down
    expect(resolveRung(5, [0, 1, 2])).toBe(2); // only down available
  });

  test('empty bank → null', () => {
    expect(resolveRung(3, [])).toBeNull();
  });
});

// ─── selectNextItem ──────────────────────────────────────────────────────────

describe('selectNextItem', () => {
  test('empty pool → null (exhausted)', () => {
    expect(selectNextItem([], [], cfg)).toBeNull();
  });

  test('prefers rich items (TT_7/TT_8) over plain', () => {
    const pool = [cand('plain', { task_type: 'TT_1_1' }), cand('rich', { task_type: 'TT_7_3' })];
    expect(selectNextItem(pool, [], cfg)?.id).toBe('rich');
  });

  test('coverage tiebreak favors the least-tested skill', () => {
    const pool = [cand('a', { primary_skill: 'S2' }), cand('b', { primary_skill: 'S4' })];
    const history = [item(2, PASS, { primary_skill: 'S2' })];
    expect(selectNextItem(pool, history, cfg)?.id).toBe('b'); // S4 untested
  });

  test('within same coverage, lower difficulty wins', () => {
    const pool = [cand('hard', { difficulty: 5 }), cand('easy', { difficulty: 1 })];
    expect(selectNextItem(pool, [], cfg)?.id).toBe('easy');
  });

  test('breaks a full tie at random (rng), not by id', () => {
    // Two candidates tie on rich/coverage/difficulty → only rng decides.
    const pool = [cand('a'), cand('b')];
    expect(selectNextItem(pool, [], cfg, () => 0)?.id).toBe('a');
    expect(selectNextItem(pool, [], cfg, () => 0.99)?.id).toBe('b');
  });
});

// ─── shouldStop ──────────────────────────────────────────────────────────────

describe('shouldStop', () => {
  const rungs = [0, 1, 2, 3, 4, 5];

  test('never stops before minItems', () => {
    const h = [item(1, PASS), item(2, PASS), item(3, FAIL)];
    expect(shouldStop(h, cfg, rungs).stop).toBe(false);
  });

  test('hard cap at maxItems', () => {
    const h = Array.from({ length: cfg.maxItems }, () => item(2, HOLD));
    expect(shouldStop(h, cfg, rungs)).toEqual({ stop: true, reason: 'cap' });
  });

  test('bracket: pass at r, fail at r+1, confirmed → bracketed', () => {
    const h = [
      item(1, PASS), item(2, PASS), item(2, PASS), // rung 2 passed twice
      item(3, FAIL), item(2, PASS), item(3, FAIL), // rung 3 failed
    ];
    const res = shouldStop(h, cfg, rungs);
    expect(res).toEqual({ stop: true, reason: 'bracketed' });
  });

  test('three consecutive fails at M0 → floor', () => {
    const h = [item(2, FAIL), item(1, FAIL), item(0, FAIL), item(0, FAIL), item(0, FAIL), item(0, FAIL)];
    expect(shouldStop(h, cfg, rungs)).toEqual({ stop: true, reason: 'floor' });
  });

  test('three consecutive fails above M0 → fatigue', () => {
    const h = [item(3, PASS), item(4, PASS), item(5, FAIL), item(4, FAIL), item(3, FAIL), item(2, FAIL)];
    expect(shouldStop(h, cfg, rungs)).toEqual({ stop: true, reason: 'fatigue' });
  });

  test('two slow items in a row → fatigue', () => {
    const h = [
      item(1, PASS), item(2, PASS), item(2, PASS), item(2, HOLD),
      item(2, PASS, { time_seconds: 200, estimated_time_seconds: 30 }),
      item(2, PASS, { time_seconds: 200, estimated_time_seconds: 30 }),
    ];
    expect(shouldStop(h, cfg, rungs)).toEqual({ stop: true, reason: 'fatigue' });
  });

  test('passing the top rung the bank has → ceiling', () => {
    const bank = [0, 1, 2]; // no M3+
    const h = [item(1, PASS), item(2, PASS), item(2, PASS), item(2, PASS), item(2, PASS), item(2, PASS)];
    expect(shouldStop(h, cfg, bank)).toEqual({ stop: true, reason: 'ceiling' });
  });
});

// ─── estimateLevel ───────────────────────────────────────────────────────────

describe('estimateLevel', () => {
  const fullBank = [0, 1, 2, 3, 4, 5];

  test('boundary kid: passes M3, fails M4 → M3 HIGH', () => {
    const h = [
      item(1, PASS), item(2, PASS), item(3, PASS), item(3, PASS),
      item(4, FAIL), item(4, FAIL),
    ];
    const est = estimateLevel(h, fullBank, cfg);
    expect(est.level).toBe('M3');
    expect(est.confidence).toBe('HIGH');
    expect(est.capped_by_bank).toBe(false);
  });

  test('all-fail kid → M0', () => {
    const h = [item(2, FAIL), item(1, FAIL), item(0, FAIL), item(0, FAIL), item(0, FAIL), item(0, FAIL)];
    expect(estimateLevel(h, fullBank, cfg).level).toBe('M0');
  });

  test('thin bank (≤2 rungs) → confidence LOW regardless of clean answers', () => {
    const bank = [0, 1];
    const h = [item(1, PASS), item(1, PASS), item(1, PASS), item(0, PASS), item(1, PASS), item(1, PASS)];
    const est = estimateLevel(h, bank, cfg);
    expect(est.confidence).toBe('LOW');
    expect(est.bank_coverage).toBe(2);
  });

  test('capped_by_bank when the top available rung is passed and it is below M5', () => {
    const bank = [0, 1, 2]; // top is M2
    const h = [item(1, PASS), item(2, PASS), item(2, PASS), item(2, PASS), item(0, PASS), item(1, PASS)];
    const est = estimateLevel(h, bank, cfg);
    expect(est.level).toBe('M2');
    expect(est.capped_by_bank).toBe(true);
  });

  test('mastery at real M5 is not flagged capped_by_bank', () => {
    const h = [item(3, PASS), item(4, PASS), item(5, PASS), item(5, PASS), item(5, PASS), item(5, PASS)];
    const est = estimateLevel(h, fullBank, cfg);
    expect(est.level).toBe('M5');
    expect(est.capped_by_bank).toBe(false);
  });
});
