/**
 * Error→Skill map — v3 "Код ↔ skill" sheet.
 *
 * Each error code has a primary skill (where scoring weakness is attributed)
 * and an optional secondary skill. H2/H3 are metric-derived (not classified
 * from text diff) and are flagged with metricOnly: true.
 *
 * This is the single authoritative source for skill attribution. It is used by:
 *   - diagnostic-branching: to credit per-skill scores from error codes
 *   - plan-generator: to resolve remediation target skills
 *   - error-classifier: to widen type coverage
 */

export type SkillCode = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';

export type ErrorCodeV3 =
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2' | 'B3' | 'B4'
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  | 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'E7'
  | 'F1' | 'F2' | 'F3' | 'F4'
  | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
  | 'H1' | 'H2' | 'H3' | 'H4';

export interface SkillEntry {
  primary: SkillCode;
  secondary?: SkillCode;
  /** H2/H3 are detected from timing/variance metrics, not text diff */
  metricOnly?: boolean;
}

export const ERROR_SKILL_MAP: Readonly<Record<ErrorCodeV3, SkillEntry>> = {
  // A — Үсэг-авиа зөрөөтэй алдаа
  A1: { primary: 'S1' },
  A2: { primary: 'S1', secondary: 'S2' },
  A3: { primary: 'S1', secondary: 'S2' },
  // B — Үсгийн бүтцийн алдаа
  B1: { primary: 'S2', secondary: 'S7' },
  B2: { primary: 'S2' },
  B3: { primary: 'S2' },
  B4: { primary: 'S2', secondary: 'S7' },
  // C — Эгшгийн алдаа
  C1: { primary: 'S3', secondary: 'S2' },
  C2: { primary: 'S3', secondary: 'S2' },
  C3: { primary: 'S3', secondary: 'S1' },
  C4: { primary: 'S3', secondary: 'S2' },
  C5: { primary: 'S3', secondary: 'S2' },
  C6: { primary: 'S3', secondary: 'S5' },
  // D — Гийгүүлэгчийн алдаа
  D1: { primary: 'S4', secondary: 'S2' },
  D2: { primary: 'S4', secondary: 'S2' },
  D3: { primary: 'S4', secondary: 'S1' },
  D4: { primary: 'S4', secondary: 'S2' },
  D5: { primary: 'S4', secondary: 'S2' },
  // E — Залгавар/нөхцөлийн алдаа
  E1: { primary: 'S5' },
  E2: { primary: 'S5' },
  E3: { primary: 'S5', secondary: 'S3' },
  E4: { primary: 'S5' },
  E5: { primary: 'S5' },
  E6: { primary: 'S5' },
  E7: { primary: 'S5', secondary: 'S2' },
  // F — Үгийн хэлбэр/бүтцийн алдаа
  F1: { primary: 'S2', secondary: 'S5' },
  F2: { primary: 'S2' },
  F3: { primary: 'S2', secondary: 'S5' },
  F4: { primary: 'S2', secondary: 'S8' },
  // G — Өгүүлбэрийн тэмдэглэгээний алдаа
  G1: { primary: 'S6' },
  G2: { primary: 'S6' },
  G3: { primary: 'S6' },
  G4: { primary: 'S6' },
  G5: { primary: 'S6', secondary: 'S7' },
  // H — Сонсгол/анхаарал/тогтвортой байдлын алдаа
  H1: { primary: 'S7' },
  H2: { primary: 'S8', metricOnly: true },
  H3: { primary: 'S8', metricOnly: true },
  H4: { primary: 'S8' },
};

/**
 * Returns the primary and secondary skills for an error code.
 * Returns null for unknown codes.
 */
export function skillsForError(code: string): SkillEntry | null {
  return (ERROR_SKILL_MAP as Record<string, SkillEntry>)[code] ?? null;
}

/**
 * Returns all skills touched by a set of error codes (primary first, then
 * secondary), deduped, preserving tiebreak order (S7>S2>S3>S5>S4>S6>S8>S1).
 */
const TIEBREAK_ORDER: SkillCode[] = ['S7', 'S2', 'S3', 'S5', 'S4', 'S6', 'S8', 'S1'];

export function skillsFromErrors(codes: string[]): SkillCode[] {
  const seen = new Set<SkillCode>();
  for (const code of codes) {
    const entry = skillsForError(code);
    if (!entry || entry.metricOnly) continue;
    seen.add(entry.primary);
    if (entry.secondary) seen.add(entry.secondary);
  }
  return TIEBREAK_ORDER.filter((s) => seen.has(s));
}

// ─── Metric-derived error detection ─────────────────────────────────────────

export interface MetricInput {
  timeSeconds: number;
  /** Expected / average time for this task type (seconds). Provide if known. */
  expectedTimeSeconds?: number;
  /**
   * Variance of error positions across a session's attempts (0–1 normalised).
   * High variance → errors scattered unpredictably → H3 attention variability.
   */
  errorPositionVariance?: number;
}

/** Time multiplier threshold above which H2 (speed) is flagged. */
const H2_SLOW_RATIO = 2.5;
/** Variance threshold above which H3 (attention variability) is flagged. */
const H3_VARIANCE_THRESHOLD = 0.6;

/**
 * Detects metric-only error codes H2 (speed) and H3 (attention variability).
 * Returns an array of zero to two codes to supplement the text-diff errors.
 */
export function detectMetricErrors(input: MetricInput): Array<'H2' | 'H3'> {
  const result: Array<'H2' | 'H3'> = [];

  if (
    input.expectedTimeSeconds !== undefined &&
    input.expectedTimeSeconds > 0 &&
    input.timeSeconds > input.expectedTimeSeconds * H2_SLOW_RATIO
  ) {
    result.push('H2');
  }

  if (
    input.errorPositionVariance !== undefined &&
    input.errorPositionVariance > H3_VARIANCE_THRESHOLD
  ) {
    result.push('H3');
  }

  return result;
}
