/**
 * Word selection for task generation — single source of truth.
 *
 * Used by both the runtime API generator (backend/src/lib/pipeline/generator.ts)
 * and the CLI (content-pipeline/scripts/llmGenerate.ts).
 *
 * Two-tier selection:
 *   word  — HARD-filter: task_types_possible ⊇ taskType + grade + level + skill
 *   sentence — SOFT-filter: grade + level + skill (no task_types_possible constraint)
 *
 * Fallback ladder (never silently widens across grade):
 *   1. exact:  grade + app_level + skill (+ task_type for word tier)
 *   2. relax:  grade + skill only (drop level constraint)
 *   3. floor:  grade only
 *   Beyond this, log a warning and return whatever exists — never cross grades.
 */

import { randomUUID } from 'crypto';
import type { PrismaClient, Prisma } from '../../../generated/prisma';
import { tierFor } from './task-tier';

type WordWhereInput = Prisma.WordWhereInput;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SelectTarget {
  taskType: string;
  skill: string;
  errorTargets: string[];
  grade: number;
  levels?: string[]; // M0–M5, one or more; undefined/empty = any level
}

export interface TargetWord {
  id: string;
  word: string;
  image_url: string | null;
  part_of_speech: string | null;
  meaning_type: string | null;
  sample_sentence: string | null;
  errors_possible: string[];
  balarhai_unknown: boolean | null;
  app_level: string | null;
  grade: number | null;
}

// ─── LCG deterministic shuffle (same algorithm as generator.ts) ───────────────

function lcgShuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = seedStr.split('').reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) & 0xffffffff;
    return Math.abs(seed) / 0x7fffffff;
  };
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── C4/C5 widening helper ────────────────────────────────────────────────────

function needsBalarhaiWidening(errorTargets: string[]): boolean {
  return errorTargets.some((e) => e === 'C4' || e === 'C5');
}

// ─── Query builders ───────────────────────────────────────────────────────────

function baseWhere(grade: number, skill: string): WordWhereInput {
  return {
    is_active: true,
    root_word_id: null, // roots only — inflected-form rows are never exercise targets
    grade,
    skills_possible: { has: skill },
  };
}

function withLevels(where: WordWhereInput, levels: string[]): WordWhereInput {
  return levels.length === 1
    ? { ...where, app_level: levels[0] }
    : { ...where, app_level: { in: levels } };
}

function withTaskType(where: WordWhereInput, taskType: string): WordWhereInput {
  return { ...where, task_types_possible: { has: taskType } };
}

function withBalarhaiWidening(where: WordWhereInput, errorTargets: string[]): WordWhereInput {
  if (!needsBalarhaiWidening(errorTargets)) return where;
  // Widen the pool: words that have C4/C5 in errors_possible OR are flagged balarhai_unknown
  return {
    OR: [
      where,
      { ...where, balarhai_unknown: true },
    ],
  };
}

const WORD_SELECT = {
  id: true,
  word: true,
  image_url: true,
  part_of_speech: true,
  meaning_type: true,
  sample_sentence: true,
  errors_possible: true,
  balarhai_unknown: true,
  app_level: true,
  grade: true,
} as const;

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Selects up to `count` eligible words for the given target, shuffled
 * with an LCG seeded by taskType+grade+levels+salt.
 *
 * `seedSalt` defaults to a fresh random value per call, so repeated
 * requests with identical targets draw a different word subset/order.
 * Pass an explicit `seedSalt` for reproducible selection (e.g. tests).
 *
 * Falls back progressively:
 *   exact (grade+level+skill[+taskType]) → grade+skill → grade → []
 *
 * Never crosses grade boundaries. Logs a warning when falling back.
 */
export async function selectTargetWords(
  db: PrismaClient,
  target: SelectTarget,
  count: number,
  seedSalt: string = randomUUID(),
): Promise<TargetWord[]> {
  const { taskType, skill, errorTargets, grade, levels } = target;
  const hasLevels = !!levels && levels.length > 0;
  const tier = tierFor(taskType);
  const isWord = tier === 'word';
  const levelsKey = hasLevels ? [...levels].sort().join(',') : 'any';
  const seedStr = `${taskType}:${grade}:${levelsKey}:${seedSalt}`;

  async function query(where: WordWhereInput): Promise<TargetWord[]> {
    const rows = await db.word.findMany({ where, select: WORD_SELECT });
    return rows as TargetWord[];
  }

  // ── Tier-specific base filter ──
  function buildWhere(opts: { withLvl: boolean; withType: boolean }): WordWhereInput {
    let w: WordWhereInput = baseWhere(grade, skill);
    if (opts.withLvl && hasLevels) w = withLevels(w, levels);
    if (opts.withType && isWord) w = withTaskType(w, taskType);
    if (needsBalarhaiWidening(errorTargets)) w = withBalarhaiWidening(w, errorTargets);
    return w;
  }

  // Fallback ladder
  const ladderSteps: Array<{ label: string; where: WordWhereInput }> = [];

  if (hasLevels) {
    ladderSteps.push({
      label: `grade=${grade} levels=${levelsKey} skill=${skill}${isWord ? ` type=${taskType}` : ''}`,
      where: buildWhere({ withLvl: true, withType: true }),
    });
    ladderSteps.push({
      label: `grade=${grade} skill=${skill} (any level)${isWord ? ` type=${taskType}` : ''}`,
      where: buildWhere({ withLvl: false, withType: true }),
    });
  } else {
    ladderSteps.push({
      label: `grade=${grade} skill=${skill}${isWord ? ` type=${taskType}` : ''}`,
      where: buildWhere({ withLvl: false, withType: true }),
    });
  }

  // floor: grade + skill only (no level, no task type filter)
  ladderSteps.push({
    label: `grade=${grade} skill=${skill} (floor)`,
    where: baseWhere(grade, skill),
  });

  // absolute floor: grade only (still roots-only — forms are never targets)
  ladderSteps.push({
    label: `grade=${grade} (absolute floor)`,
    where: { is_active: true, root_word_id: null, grade },
  });

  for (const step of ladderSteps) {
    const rows = await query(step.where);
    if (rows.length >= count) {
      const shuffled = lcgShuffle(rows, seedStr);
      return shuffled.slice(0, count);
    }
    if (rows.length > 0) {
      // Not enough for the full count but better than nothing
      const shuffled = lcgShuffle(rows, seedStr);
      const nextStepIdx = ladderSteps.indexOf(step) + 1;
      if (nextStepIdx < ladderSteps.length) {
        // Try next step to fill up
        const nextRows = await query(ladderSteps[nextStepIdx].where);
        const combined = dedup([...shuffled, ...lcgShuffle(nextRows, seedStr + ':fill')]);
        if (combined.length >= count) return combined.slice(0, count);
        // Still not enough — warn and return all we have
      }
      console.warn(
        `[select-words] sparse pool for ${step.label}: found ${rows.length}, need ${count}. ` +
        `Returning all available.`,
      );
      return shuffled;
    }
    const nextStep = ladderSteps[ladderSteps.indexOf(step) + 1];
    if (nextStep) {
      console.warn(
        `[select-words] no words for ${step.label}, falling back to: ${nextStep.label}`,
      );
    }
  }

  console.warn(`[select-words] no words found for grade=${grade}, taskType=${taskType}, skill=${skill}`);
  return [];
}

function dedup(words: TargetWord[]): TargetWord[] {
  const seen = new Set<string>();
  return words.filter((w) => {
    if (seen.has(w.id)) return false;
    seen.add(w.id);
    return true;
  });
}
