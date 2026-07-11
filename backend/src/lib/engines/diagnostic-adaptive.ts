// Single-Phase Adaptive Diagnostic — pure climb logic.
//
// See design/diagnostic-single-phase-adaptive.md for the spec this implements.
//
// This module is DB-FREE by design. The route feeds it the served-item history
// plus an already-fetched candidate pool; these functions decide the next rung,
// pick the next item, decide when to stop, and estimate the final level. That
// keeps every decision unit-testable against synthetic banks with no content.
//
// Skill/error aggregation is NOT done here — the route reuses the existing
// `calculateFinalResult` for that and only sources `general_level` (and the new
// confidence / bank_coverage signals) from `estimateLevel` below.

// ─── Types ───────────────────────────────────────────────────────────────────

export type Verdict = 'PASS' | 'FAIL' | 'HOLD';

/** One item already served + answered this session, in chronological order. */
export interface ServedItem {
  task_id: string;
  rung: number; // M-index (0..5) of the item that was served
  primary_skill: string;
  score: number; // 0 | 0.25 | 0.5 | 0.75 | 1
  error_codes: string[];
  time_seconds: number;
  estimated_time_seconds: number;
}

/** A candidate task the route fetched for the target rung (not yet served). */
export interface CandidateTask {
  id: string;
  primary_skill: string;
  task_type: string;
  difficulty: number; // 1..5 — within-rung ordering proxy (Task has no spelling_complexity)
}

export interface ClimbConfig {
  warmupRung: number; // 1 — gentle first item
  startRung: number; // 2 — climb begins here (grade-independent)
  minItems: number; // 6
  maxItems: number; // 12
  passThreshold: number; // 0.75 — score ≥ → PASS
  failThreshold: number; // 0.25 — score ≤ → FAIL (between = HOLD)
  fatigueFactor: number; // 3 — time_seconds > factor×estimated on 2 in a row → stop
  consecutiveFailStop: number; // 3
}

export const DEFAULT_CONFIG: ClimbConfig = {
  warmupRung: 1,
  startRung: 2,
  minItems: 6,
  maxItems: 12,
  passThreshold: 0.75,
  failThreshold: 0.25,
  fatigueFactor: 3,
  consecutiveFailStop: 3,
};

export type StopReason =
  | 'bracketed'
  | 'floor'
  | 'ceiling'
  | 'fatigue'
  | 'cap'
  | 'exhausted';

export interface StopResult {
  stop: boolean;
  reason?: StopReason;
}

export interface LevelEstimate {
  level: string; // "M0".."M5"
  level_index: number; // 0..5
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  capped_by_bank: boolean; // passed the top rung the bank actually has, true ceiling unknown
  bank_coverage: number; // distinct rungs available for this grade
}

const MIN_RUNG = 0;
const MAX_RUNG = 5;

// ─── Verdict ─────────────────────────────────────────────────────────────────

export function verdictOf(score: number, config: ClimbConfig): Verdict {
  if (score >= config.passThreshold) return 'PASS';
  if (score <= config.failThreshold) return 'FAIL';
  return 'HOLD';
}

function clampRung(r: number): number {
  return Math.max(MIN_RUNG, Math.min(MAX_RUNG, r));
}

// ─── Per-rung verdict tally ──────────────────────────────────────────────────

interface RungTally {
  pass: number;
  fail: number;
  hold: number;
}

function tallyByRung(
  history: ServedItem[],
  config: ClimbConfig,
): Record<number, RungTally> {
  const byRung: Record<number, RungTally> = {};
  for (const item of history) {
    const t = (byRung[item.rung] ??= { pass: 0, fail: 0, hold: 0 });
    const v = verdictOf(item.score, config);
    if (v === 'PASS') t.pass++;
    else if (v === 'FAIL') t.fail++;
    else t.hold++;
  }
  return byRung;
}

/**
 * Highest rung r that is bracketed: ≥1 PASS at r and ≥1 FAIL at r+1, confirmed
 * by a second PASS at r OR a second FAIL at r+1. Returns null if no bracket.
 */
function findBracket(history: ServedItem[], config: ClimbConfig): number | null {
  const byRung = tallyByRung(history, config);
  for (let r = MAX_RUNG; r >= MIN_RUNG; r--) {
    const cur = byRung[r];
    const up = byRung[r + 1];
    if (
      cur &&
      up &&
      cur.pass >= 1 &&
      up.fail >= 1 &&
      (cur.pass >= 2 || up.fail >= 2)
    ) {
      return r;
    }
  }
  return null;
}

// ─── Next rung (staircase) ───────────────────────────────────────────────────

/**
 * The *ideal* rung to probe next, ignoring bank availability. PASS → +1,
 * FAIL → −1, HOLD → re-probe once, second consecutive HOLD on the same rung → −1.
 * Use `resolveRung` afterwards to snap this onto a rung the bank actually has.
 */
export function planNextRung(history: ServedItem[], config: ClimbConfig): number {
  if (history.length === 0) return config.warmupRung;
  if (history.length === 1) return config.startRung;

  const last = history[history.length - 1];
  const v = verdictOf(last.score, config);
  if (v === 'PASS') return clampRung(last.rung + 1);
  if (v === 'FAIL') return clampRung(last.rung - 1);

  // HOLD: re-probe the same rung once; a second HOLD at that rung → step down.
  const prev = history[history.length - 2];
  if (prev && prev.rung === last.rung && verdictOf(prev.score, config) === 'HOLD') {
    return clampRung(last.rung - 1);
  }
  return last.rung;
}

/**
 * Available rungs ordered by preference for a target: nearest first, and on a
 * distance tie the higher rung first (up-first-then-down, per spec §6). The
 * route walks this list, skipping rungs whose pool is exhausted by dedup.
 */
export function orderRungsByPreference(target: number, availableRungs: number[]): number[] {
  return [...new Set(availableRungs)].sort((a, b) => {
    const da = Math.abs(a - target);
    const db = Math.abs(b - target);
    if (da !== db) return da - db;
    return b - a; // tie → higher rung first
  });
}

/**
 * Snap a target rung onto the nearest rung the bank actually has (the first of
 * `orderRungsByPreference`). Returns null if the bank is empty.
 */
export function resolveRung(target: number, availableRungs: number[]): number | null {
  return orderRungsByPreference(target, availableRungs)[0] ?? null;
}

// ─── Item selection ──────────────────────────────────────────────────────────

/**
 * Pick the next task from a pool already scoped to the resolved rung and
 * de-duplicated against served IDs. Order of preference:
 *   1. rich items (TT_7_* dictation / TT_8_* correction) — multi-skill signal
 *   2. least-tested primary_skill so far (coverage sweep)
 *   3. lowest difficulty (smooth within-rung climb)
 *   4. uniformly at random among the items tied on the above — so two learners
 *      who answer identically don't get an identical diagnostic
 * `rng` is injectable for deterministic tests; production uses `Math.random`.
 * Returns null when the pool is empty (route treats this as `exhausted`).
 */
export function selectNextItem(
  pool: CandidateTask[],
  history: ServedItem[],
  _config: ClimbConfig,
  rng: () => number = Math.random,
): CandidateTask | null {
  if (pool.length === 0) return null;

  const isRich = (t: CandidateTask) =>
    t.task_type.startsWith('TT_7') || t.task_type.startsWith('TT_8');
  const rich = pool.filter(isRich);
  const candidates = rich.length > 0 ? rich : pool;

  const skillCounts: Record<string, number> = {};
  for (const h of history) skillCounts[h.primary_skill] = (skillCounts[h.primary_skill] ?? 0) + 1;
  const cov = (t: CandidateTask) => skillCounts[t.primary_skill] ?? 0;

  // Keep the pedagogical priorities (coverage, then difficulty), then break the
  // final tie at random instead of by id, so the pick varies across learners.
  const minCov = Math.min(...candidates.map(cov));
  const leastTested = candidates.filter((t) => cov(t) === minCov);
  const minDiff = Math.min(...leastTested.map((t) => t.difficulty));
  const tied = leastTested.filter((t) => t.difficulty === minDiff);

  return tied[Math.floor(rng() * tied.length)];
}

// ─── Stop rule ───────────────────────────────────────────────────────────────

function lastKAreFail(history: ServedItem[], config: ClimbConfig, k: number): boolean {
  if (history.length < k) return false;
  return history
    .slice(-k)
    .every((h) => verdictOf(h.score, config) === 'FAIL');
}

/**
 * Decide whether the climb is done. `maxItems` cap and pool exhaustion (handled
 * by the route via a null selection) are the only stops allowed before
 * `minItems`; everything else waits until `minItems` items have been answered.
 */
export function shouldStop(
  history: ServedItem[],
  config: ClimbConfig,
  availableRungs: number[],
): StopResult {
  const n = history.length;
  if (n >= config.maxItems) return { stop: true, reason: 'cap' };
  if (n < config.minItems) return { stop: false };

  // Consecutive-fail: floor when it happens at M0, otherwise fatigue.
  if (lastKAreFail(history, config, config.consecutiveFailStop)) {
    const lastRung = history[n - 1].rung;
    return { stop: true, reason: lastRung === MIN_RUNG ? 'floor' : 'fatigue' };
  }

  // Slow on two consecutive items → fatigue.
  const a = history[n - 1];
  const b = history[n - 2];
  if (
    a.time_seconds > config.fatigueFactor * a.estimated_time_seconds &&
    b.time_seconds > config.fatigueFactor * b.estimated_time_seconds
  ) {
    return { stop: true, reason: 'fatigue' };
  }

  // Ceiling: passed the top rung the bank has — nothing higher to probe.
  const topRung = Math.max(...availableRungs);
  const passedTop = history.some(
    (h) => h.rung === topRung && verdictOf(h.score, config) === 'PASS',
  );
  if (passedTop) return { stop: true, reason: 'ceiling' };

  if (findBracket(history, config) !== null) return { stop: true, reason: 'bracketed' };

  return { stop: false };
}

// ─── Final level estimate ────────────────────────────────────────────────────

/**
 * Highest rung the learner reliably passed (pass-rate ≥ 0.5, ≥1 pass), with
 * bank-aware confidence and a `capped_by_bank` flag when the top passed rung is
 * simply the top rung the bank has.
 */
export function estimateLevel(
  history: ServedItem[],
  availableRungs: number[],
  config: ClimbConfig,
): LevelEstimate {
  const bank_coverage = new Set(availableRungs).size;
  const byRung = tallyByRung(history, config);

  let level = 0;
  for (let r = MIN_RUNG; r <= MAX_RUNG; r++) {
    const g = byRung[r];
    if (!g) continue;
    const attempts = g.pass + g.fail;
    if (g.pass >= 1 && attempts > 0 && g.pass / attempts >= 0.5) level = r;
  }

  const topAvail = availableRungs.length > 0 ? Math.max(...availableRungs) : MAX_RUNG;
  const passedTop = (byRung[topAvail]?.pass ?? 0) >= 1;
  const capped_by_bank = passedTop && topAvail < MAX_RUNG && level === topAvail;

  let confidence: LevelEstimate['confidence'];
  if (bank_coverage <= 2) confidence = 'LOW';
  else if (findBracket(history, config) !== null) confidence = 'HIGH';
  else confidence = 'MEDIUM';

  return {
    level: `M${level}`,
    level_index: level,
    confidence,
    capped_by_bank,
    bank_coverage,
  };
}
