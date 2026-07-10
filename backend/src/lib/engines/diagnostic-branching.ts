// Diagnostic scoring — aggregates attempts into a final skill/error/level result.
// Consumed by the single-phase adaptive diagnostic (see diagnostic-adaptive.ts),
// which sources general_level from the climb and skills/errors from here.

// Tie-break priority: when skills are equally weak, pick in this order
const TIEBREAK_PRIORITY = ['S7', 'S2', 'S3', 'S5', 'S4', 'S6', 'S8', 'S1'] as const;
type SkillKey = (typeof TIEBREAK_PRIORITY)[number];

// Core skills cap: general_level ≤ min(S2,S3,S5,S7 levels) + 1
const CORE_SKILLS: SkillKey[] = ['S2', 'S3', 'S5', 'S7'];
const ALL_SKILLS: SkillKey[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const LEVEL_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'] as const;
type LevelCode = (typeof LEVEL_ORDER)[number];

export interface DiagnosticAttempt {
  task_id: string;
  primary_skill: string;
  score: number;
  error_codes: string[];
}

export interface FinalResult {
  general_level: string;
  confidence: string;
  skill_levels: Record<string, string>;
  skill_scores: Record<string, number>;
  skill_confidence: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'>;
  top_error_codes: string[];
  priority_skills: string[];
  recommended_daily_minutes: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Accumulate per-skill scores from task.primary_skill only.
 * Score computation stays clean and predictable; error→skill attribution
 * is used separately to expand priority_skills selection.
 */
function avgPerSkill(
  attempts: { primary_skill: string; score: number }[]
): Record<string, number> {
  const acc: Record<string, { total: number; count: number }> = {};
  for (const a of attempts) {
    if (!acc[a.primary_skill]) acc[a.primary_skill] = { total: 0, count: 0 };
    acc[a.primary_skill].total += a.score;
    acc[a.primary_skill].count++;
  }
  const result: Record<string, number> = {};
  for (const [k, v] of Object.entries(acc)) result[k] = v.total / v.count;
  return result;
}

/**
 * Count actual task attempts per skill (for confidence calculation).
 * Uses task.primary_skill only (not error-inferred).
 */
function countPerSkill(
  attempts: { primary_skill: string }[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of attempts) {
    counts[a.primary_skill] = (counts[a.primary_skill] ?? 0) + 1;
  }
  return counts;
}

function itemCountToConfidence(count: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (count < 3) return 'LOW';
  if (count <= 5) return 'MEDIUM';
  return 'HIGH';
}

// Thresholds from "Scoring & Levels" sheet:
//   <50% → prev level (M0), 50–69% → start (M1),
//   70–84% → settled (M2),  85%+  → next level (M3)
function scoreToLevel(score: number): LevelCode {
  if (score >= 0.85) return 'M3';
  if (score >= 0.70) return 'M2';
  if (score >= 0.50) return 'M1';
  return 'M0';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the final diagnostic result from all adaptive-climb attempts.
 *
 * Level mapping per skill:
 *   avg < 50%  → M0 (prev level)
 *   50–69%     → M1 (start of level)
 *   70–84%     → M2 (settled)
 *   85%+       → M3 (ready for next)
 *
 * General level = floor(avg skill-level index), then capped so that
 *   general_level ≤ weakest of (S2, S3, S5, S7) + 1.
 */
export function calculateFinalResult(
  allAttempts: DiagnosticAttempt[],
  learnerGrade: number
): FinalResult {
  const avg = avgPerSkill(allAttempts);
  const counts = countPerSkill(allAttempts);

  const skillScores: Record<string, number> = {};
  for (const s of ALL_SKILLS) skillScores[s] = avg[s] ?? 0;

  const skillLevels: Record<string, string> = {};
  for (const s of ALL_SKILLS) skillLevels[s] = scoreToLevel(skillScores[s]);

  // Per-skill confidence based on actual item counts (v3 spec)
  const skill_confidence: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {};
  for (const s of ALL_SKILLS) skill_confidence[s] = itemCountToConfidence(counts[s] ?? 0);

  // General level: floor of mean skill-level index, then apply core-skill cap
  const sumIdx = ALL_SKILLS.reduce(
    (sum, s) => sum + LEVEL_ORDER.indexOf(skillLevels[s] as LevelCode),
    0
  );
  const rawIdx = Math.floor(sumIdx / ALL_SKILLS.length);

  const coreMinIdx = Math.min(
    ...CORE_SKILLS.map((s) => LEVEL_ORDER.indexOf(skillLevels[s] as LevelCode))
  );
  const cappedIdx = Math.min(rawIdx, coreMinIdx + 1);
  const general_level = LEVEL_ORDER[Math.max(0, Math.min(cappedIdx, 5))];

  // Overall confidence: derived from total item count (kept for backward compat)
  const total = allAttempts.length;
  const confidence = total < 3 ? 'LOW' : total <= 5 ? 'MEDIUM' : 'HIGH';

  // Top 3 most frequent error codes
  const errorCount: Record<string, number> = {};
  for (const a of allAttempts) {
    for (const code of a.error_codes) {
      errorCount[code] = (errorCount[code] ?? 0) + 1;
    }
  }
  const top_error_codes = Object.entries(errorCount)
    .sort(([, x], [, y]) => y - x)
    .slice(0, 3)
    .map(([code]) => code);

  // Priority skills: 2 weakest by score; tiebreak by TIEBREAK_PRIORITY.
  // (Error-implied skills are not merged in here — they already re-enter the
  // learning path downstream via plan-generator's skillsFromErrors(target_errors).)
  const scoreSorted = [...ALL_SKILLS]
    .sort((a, b) => {
      const diff = skillScores[a] - skillScores[b];
      if (Math.abs(diff) > 0.001) return diff;
      return (
        TIEBREAK_PRIORITY.indexOf(a as SkillKey) -
        TIEBREAK_PRIORITY.indexOf(b as SkillKey)
      );
    });

  const priority_skills = scoreSorted.slice(0, 2);

  const recommended_daily_minutes = learnerGrade <= 2 ? 10 : 15;

  return {
    general_level,
    confidence,
    skill_levels: skillLevels,
    skill_scores: skillScores,
    skill_confidence,
    top_error_codes,
    priority_skills,
    recommended_daily_minutes,
  };
}
