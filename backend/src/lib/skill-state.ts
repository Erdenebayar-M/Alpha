/**
 * Helpers for the LearnerSkillState wide-column layout — the 8×3 fan-out of
 * s{1..8}_score / s{1..8}_level / s{1..8}_confidence columns (see
 * schema.prisma `LearnerSkillState`).
 *
 * Centralizes the column fan-out that was otherwise hand-written at every
 * read/write site (diagnostic completion, learner responses, admin responses,
 * checkpoint delta math), so adding or renaming a skill touches one place.
 * `skill-engine.ts` already builds these columns with the same loop pattern.
 *
 * NOTE: this does not normalize the schema — that remains a wide-column
 * anti-pattern pending a `SkillScore` child table. These helpers only remove
 * the duplicated literal column lists.
 */

export const SKILL_INDICES = [1, 2, 3, 4, 5, 6, 7, 8] as const;

interface FinalSkillResult {
  skill_scores: Record<string, number>;
  skill_levels: Record<string, string>;
  skill_confidence: Record<string, string>;
}

/**
 * Builds the 24 skill columns for a Prisma create/update from per-code records
 * (keyed 'S1'..'S8', as produced by `calculateFinalResult`). Callers spread the
 * result into their upsert `data`.
 */
export function buildSkillColumns(r: FinalSkillResult): Record<string, number | string> {
  const cols: Record<string, number | string> = {};
  for (const i of SKILL_INDICES) {
    const code = `S${i}`;
    cols[`s${i}_score`] = r.skill_scores[code] ?? 0;
    cols[`s${i}_level`] = r.skill_levels[code] ?? 'M0';
    cols[`s${i}_confidence`] = r.skill_confidence[code] ?? 'LOW';
  }
  return cols;
}

/**
 * Projects the skill columns off a LearnerSkillState row for an API response.
 * By default returns score + level per skill (16 columns); pass
 * `{ confidence: true }` to also include the per-skill confidence (24 columns).
 */
export function pickSkillColumns(
  s: Record<string, unknown>,
  opts: { confidence?: boolean } = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const i of SKILL_INDICES) {
    out[`s${i}_score`] = s[`s${i}_score`];
    out[`s${i}_level`] = s[`s${i}_level`];
    if (opts.confidence) out[`s${i}_confidence`] = s[`s${i}_confidence`];
  }
  return out;
}

/**
 * Extracts per-skill scores into a compact `{ s1: number, … s8: number }`
 * record for delta/aggregate math. Missing rows and columns read as 0.
 */
export function extractSkillScores(s: Record<string, unknown> | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of SKILL_INDICES) {
    out[`s${i}`] = s ? ((s[`s${i}_score`] as number) ?? 0) : 0;
  }
  return out;
}
