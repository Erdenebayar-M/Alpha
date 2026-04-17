/**
 * Skill Engine — updates LearnerSkillState after each attempt.
 *
 * Updates:
 *   - s{1..8}_score   : exponential moving average of attempt scores
 *   - s{1..8}_level   : M0–M5 derived from score thresholds
 *   - s{1..8}_confidence : LOW/MEDIUM/HIGH derived from per-skill attempt count
 *   - general_level   : level of the overall weighted-average score
 *   - weak_skills     : 2–3 lowest-scoring skills below M3 threshold
 *   - top_error_codes : top-3 most frequent error codes (last 50 attempts)
 *   - recent_error_codes : unique error codes from last 7 days
 *   - recent_task_ids : rolling last-20 task IDs (dedup guard)
 *   - current_streak / longest_streak : daily streak
 */

import type { PrismaClient } from '../../../generated/prisma';

// ─── Constants ────────────────────────────────────────────────────────────────

const EMA_ALPHA = 0.3; // weight of the newest observation

const LEVEL_THRESHOLDS = [
  { min: 0.90, level: 'M5' },
  { min: 0.75, level: 'M4' },
  { min: 0.60, level: 'M3' },
  { min: 0.40, level: 'M2' },
  { min: 0.20, level: 'M1' },
  { min: 0.0,  level: 'M0' },
] as const;

// Minimum score to NOT be considered "weak" (below M3 = weak)
const WEAK_SKILL_THRESHOLD = 0.60;
const MAX_RECENT_TASK_IDS = 20;
const TOP_ERROR_CODE_COUNT = 3;
const RECENT_ERRORS_DAYS = 7;
const ATTEMPT_HISTORY_LIMIT = 50; // attempts to scan for top_error_codes

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreToLevel(score: number): string {
  for (const { min, level } of LEVEL_THRESHOLDS) {
    if (score >= min) return level;
  }
  return 'M0';
}

function countToConfidence(count: number): string {
  if (count >= 15) return 'HIGH';
  if (count >= 5) return 'MEDIUM';
  return 'LOW';
}

function ema(current: number, newObs: number): number {
  return EMA_ALPHA * newObs + (1 - EMA_ALPHA) * current;
}

/** 'S3' → 3 */
function skillNum(skill: string): number {
  return parseInt(skill.slice(1), 10);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(earlier: Date, later: Date): boolean {
  const d = new Date(later);
  d.setDate(d.getDate() - 1);
  return isSameDay(earlier, d);
}

// ─── Public interface ─────────────────────────────────────────────────────────

export interface SkillUpdateInput {
  learnerId: string;
  primarySkill: string;  // 'S1'–'S8'
  score: number;         // 0 | 0.25 | 0.5 | 0.75 | 1.0
  errorCodes: string[];  // from the attempt
  taskId: string;
  attemptedAt?: Date;    // defaults to now()
}

/**
 * Update LearnerSkillState for one learner after a single attempt.
 * Creates the row if it doesn't exist yet.
 */
export async function updateSkillState(
  input: SkillUpdateInput,
  db: PrismaClient,
): Promise<void> {
  const now = input.attemptedAt ?? new Date();
  const n = skillNum(input.primarySkill);
  if (n < 1 || n > 8) throw new Error(`Invalid skill code: ${input.primarySkill}`);

  // ── 1. Load or create the state row ────────────────────────────────────────
  let state = await db.learnerSkillState.findUnique({
    where: { learner_id: input.learnerId },
  });

  if (!state) {
    state = await db.learnerSkillState.create({
      data: {
        learner_id: input.learnerId,
        top_error_codes: [],
        weak_skills: [],
        recent_error_codes: [],
        recent_task_ids: [],
      },
    });
  }

  // ── 2. Update score for the exercised skill via EMA ─────────────────────────
  const scoreKey = `s${n}_score` as keyof typeof state;
  const oldScore = state[scoreKey] as number;
  const newScore = ema(oldScore, input.score);

  // ── 3. Count per-skill attempts for confidence ───────────────────────────────
  const skillAttemptCount = await db.attempt.count({
    where: {
      learner_id: input.learnerId,
      task: { primary_skill: input.primarySkill as never },
    },
  });
  const newConfidence = countToConfidence(skillAttemptCount + 1); // +1 = this attempt

  // ── 4. Build updated score/level/confidence objects ─────────────────────────
  const scores: Record<string, number> = {};
  const levels: Record<string, string> = {};
  const confidences: Record<string, string> = {};

  for (let i = 1; i <= 8; i++) {
    const sk = `s${i}_score` as keyof typeof state;
    scores[`s${i}_score`] = i === n ? newScore : (state[sk] as number);
    levels[`s${i}_level`] = scoreToLevel(scores[`s${i}_score`]);
    if (i === n) {
      confidences[`s${i}_confidence`] = newConfidence;
    } else {
      const ck = `s${i}_confidence` as keyof typeof state;
      confidences[`s${i}_confidence`] = state[ck] as string;
    }
  }

  // ── 5. Derive general_level from mean of all skill scores ───────────────────
  const meanScore =
    Object.values(scores).reduce((sum, v) => sum + v, 0) / 8;
  const generalLevel = scoreToLevel(meanScore);

  // ── 6. Compute weak_skills (bottom skills below WEAK_SKILL_THRESHOLD) ────────
  const skillScoreList = Array.from({ length: 8 }, (_, i) => ({
    skill: `S${i + 1}`,
    score: scores[`s${i + 1}_score`],
  }));
  const weakSkills = skillScoreList
    .filter((s) => s.score < WEAK_SKILL_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((s) => s.skill);

  // ── 7. Fetch recent attempts for error code analytics ───────────────────────
  const recentAttempts = await db.attempt.findMany({
    where: { learner_id: input.learnerId },
    orderBy: { created_at: 'desc' },
    take: ATTEMPT_HISTORY_LIMIT,
    select: { error_codes: true, created_at: true },
  });

  // top_error_codes — most frequent across last 50 attempts (including current)
  const codeCounts = new Map<string, number>();
  const allCodes = [
    ...input.errorCodes,
    ...recentAttempts.flatMap((a) => a.error_codes),
  ];
  for (const code of allCodes) {
    codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
  }
  const topErrorCodes = [...codeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_ERROR_CODE_COUNT)
    .map(([code]) => code);

  // recent_error_codes — unique codes from last 7 days + this attempt
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - RECENT_ERRORS_DAYS);
  const recentCodes = new Set<string>(input.errorCodes);
  for (const a of recentAttempts) {
    if (a.created_at >= sevenDaysAgo) {
      for (const code of a.error_codes) recentCodes.add(code);
    }
  }

  // ── 8. Update recent_task_ids (prepend, dedup, cap at 20) ───────────────────
  const taskIdSet = new Set([input.taskId, ...state.recent_task_ids]);
  const recentTaskIds = [...taskIdSet].slice(0, MAX_RECENT_TASK_IDS);

  // ── 9. Streak logic ──────────────────────────────────────────────────────────
  // Find the most recent attempt before this one to determine last active day.
  const prevAttempt = await db.attempt.findFirst({
    where: {
      learner_id: input.learnerId,
      created_at: { lt: now },
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });

  let { current_streak, longest_streak } = state;

  if (!prevAttempt) {
    // First ever attempt
    current_streak = 1;
  } else if (isSameDay(prevAttempt.created_at, now)) {
    // Already did something today — streak unchanged
  } else if (isYesterday(prevAttempt.created_at, now)) {
    // Consecutive day — extend streak
    current_streak += 1;
  } else {
    // Gap — reset
    current_streak = 1;
  }

  if (current_streak > longest_streak) longest_streak = current_streak;

  // ── 10. Write all updates in one DB call ─────────────────────────────────────
  await db.learnerSkillState.update({
    where: { learner_id: input.learnerId },
    data: {
      ...scores,
      ...levels,
      ...confidences,
      general_level: generalLevel as never,
      weak_skills: weakSkills,
      top_error_codes: topErrorCodes,
      recent_error_codes: [...recentCodes],
      recent_task_ids: recentTaskIds,
      current_streak,
      longest_streak,
    },
  });
}
