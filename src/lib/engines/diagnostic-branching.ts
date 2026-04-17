// Diagnostic Branching — drives the 3-phase adaptive assessment
// (PHASE_A → PHASE_B adaptive → PHASE_C boundary).

import type { PrismaClient } from '../../../generated/prisma';

// Tie-break priority: when skills are equally weak, pick in this order
const TIEBREAK_PRIORITY = ['S7', 'S2', 'S3', 'S5', 'S4', 'S6', 'S8', 'S1'] as const;
type SkillKey = (typeof TIEBREAK_PRIORITY)[number];

// Core skills cap: general_level ≤ min(S2,S3,S5,S7 levels) + 1
const CORE_SKILLS: SkillKey[] = ['S2', 'S3', 'S5', 'S7'];
const ALL_SKILLS: SkillKey[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];
const LEVEL_ORDER = ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'] as const;
type LevelCode = (typeof LEVEL_ORDER)[number];

export interface PhaseAAttempt {
  task_id: string;
  primary_skill: string;
  score: number;
  error_codes: string[];
}

export interface PhaseBResult {
  weakSkills: string[];
  phaseBTaskIds: string[];
}

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
  top_error_codes: string[];
  priority_skills: string[];
  recommended_daily_minutes: number;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

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

// Thresholds from "Scoring & Levels" sheet:
//   <50% → prev level (M0), 50–69% → start (M1),
//   70–84% → settled (M2),  85%+  → next level (M3)
function scoreToLevel(score: number): LevelCode {
  if (score >= 0.85) return 'M3';
  if (score >= 0.70) return 'M2';
  if (score >= 0.50) return 'M1';
  return 'M0';
}

// level_target strings: "M1", "M1-M2", "M2", "M2-M3", …
function includesM2Plus(levelTarget: string): boolean {
  return /M[2-5]/.test(levelTarget);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Pure function: returns up to 2 weak skills (<60% avg) from Phase A attempts,
 * ordered by tiebreak priority (S7 > S2 > S3 > S5 > S4 > S6 > S8 > S1).
 */
export function identifyWeakSkills(phaseAAttempts: PhaseAAttempt[]): string[] {
  const avg = avgPerSkill(phaseAAttempts);
  // Skills with no attempts are treated as not-weak (unknown ≠ weak)
  return TIEBREAK_PRIORITY.filter(
    (s) => s in avg && avg[s] < 0.6
  ).slice(0, 2);
}

/**
 * Selects 8 Phase B task IDs:
 *   3 × weak skill 1 (M2+ preferred)
 *   3 × weak skill 2 (M2+ preferred)
 *   2 × cross-skill tasks (primary ↔ secondary matching both weak skills)
 */
export async function selectPhaseB(
  phaseAAttempts: PhaseAAttempt[],
  prisma: PrismaClient
): Promise<PhaseBResult> {
  const weakSkills = identifyWeakSkills(phaseAAttempts);
  const seen = phaseAAttempts.map((a) => a.task_id);
  const taskIds: string[] = [];

  for (const skill of weakSkills) {
    const all = await prisma.task.findMany({
      where: { primary_skill: skill as any, id: { notIn: seen } },
      select: { id: true, level_target: true },
      orderBy: { difficulty: 'asc' },
    });
    const m2Plus = all.filter((t) => includesM2Plus(t.level_target));
    const pool = m2Plus.length >= 3 ? m2Plus : all;
    taskIds.push(...pool.slice(0, 3).map((t) => t.id));
  }

  if (weakSkills.length === 2) {
    const [a, b] = weakSkills;
    const cross = await prisma.task.findMany({
      where: {
        id: { notIn: [...seen, ...taskIds] },
        OR: [
          { primary_skill: a as any, secondary_skill: b as any },
          { primary_skill: b as any, secondary_skill: a as any },
        ],
      },
      select: { id: true },
      take: 2,
    });
    taskIds.push(...cross.map((t) => t.id));

    const stillNeeded = 2 - cross.length;
    if (stillNeeded > 0) {
      const fallback = await prisma.task.findMany({
        where: {
          id: { notIn: [...seen, ...taskIds] },
          primary_skill: { in: weakSkills as any[] },
        },
        select: { id: true },
        take: stillNeeded,
      });
      taskIds.push(...fallback.map((t) => t.id));
    }
  }

  return { weakSkills, phaseBTaskIds: taskIds.slice(0, 8) };
}

/**
 * Computes the final diagnostic result from all 20 attempts (Phases A+B+C).
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

  const skillScores: Record<string, number> = {};
  for (const s of ALL_SKILLS) skillScores[s] = avg[s] ?? 0;

  const skillLevels: Record<string, string> = {};
  for (const s of ALL_SKILLS) skillLevels[s] = scoreToLevel(skillScores[s]);

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

  // Overall confidence based on total item count
  // (<3 = LOW, 3–5 = MEDIUM, 6+ = HIGH)
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

  // Priority skills: 2 weakest by score; tiebreak by TIEBREAK_PRIORITY
  const priority_skills = [...ALL_SKILLS]
    .sort((a, b) => {
      const diff = skillScores[a] - skillScores[b];
      if (Math.abs(diff) > 0.001) return diff;
      return (
        TIEBREAK_PRIORITY.indexOf(a as SkillKey) -
        TIEBREAK_PRIORITY.indexOf(b as SkillKey)
      );
    })
    .slice(0, 2);

  const recommended_daily_minutes = learnerGrade <= 2 ? 10 : 15;

  return {
    general_level,
    confidence,
    skill_levels: skillLevels,
    skill_scores: skillScores,
    top_error_codes,
    priority_skills,
    recommended_daily_minutes,
  };
}
