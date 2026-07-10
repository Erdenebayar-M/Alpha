/**
 * Word Capability Derivation — pure, deterministic, no LLM.
 *
 * Reads a Mongolian word (+ its part_of_speech and imageability) and computes:
 *   - every structural feature it exhibits,
 *   - the single PRIMARY feature (by RANK),
 *   - the skills, errors, and eligible scheme-C task types implied,
 *   - and a balarhai_unknown review flag.
 *
 * This module is READ-ONLY: it returns a capability object. Storing it is a
 * separate step. It must not import from or modify the DB layer.
 *
 * All vowel/consonant/long-vowel/reduced-vowel phonology is reused from the
 * consolidated error-engine tables — NOTHING phonological is defined here.
 * Suffix capability is POS-based (lemma eligibility), not surface detection, so
 * extractSuffix is intentionally NOT used. The only literals defined locally are
 * this script's own vocabulary: FeatureCode, the feature→skill/error/task-type
 * maps, and RANK.
 *
 * ─── GUARDRAIL: primary_skill / primary_feature are HINTS, not crediting ─────
 * `primary_skill` and `primary_feature` are readability/sort hints. They have
 * NO consumers today. `skills_possible` is the load-bearing field — the
 * eligibility filter generation reads.
 *
 * Generation stays TARGET-DRIVEN: the session picks a task-type/skill, filters
 * words by `skills_possible ⊇ target`, and the task inherits its skill FROM THE
 * TASK TYPE. The DB column `Task.primary_skill` (which drives diagnostic +
 * mastery crediting in diagnostic-branching / skill-engine) MUST be set from the
 * target task-type's skill — NEVER copied from `Capability.primary_skill`.
 *
 * TRIGGER: if a future generator inverts to word-primary-driven (iterating words
 * and emitting "the word's primary task type", or copying primary_skill into
 * Task.primary_skill), then RANK becomes load-bearing and TAKES_SUFFIX — being
 * near-universal across nouns/verbs — would need demoting below SIMPLE, exactly
 * as FINAL_CONSONANT already was. Until then, RANK tuning is cosmetic.
 */

import {
  isVowel,
  isConsonant,
  isLongVowelPart,
  isReducedVowelPosition,
} from '../error-engine/mongolian-utils';
import type { SkillCode } from '../error-engine/error-skill-map';
import type { TaskTypeValue } from '@app/shared';

// ─── This script's own vocabulary (not phonological tables) ──────────────────

export type FeatureCode =
  | 'LONG_VOWEL'
  | 'REDUCED_VOWEL'
  | 'CONSONANT_CLUSTER'
  | 'FINAL_CONSONANT'
  | 'YOTATED_VOWEL'
  | 'SOFT_HARD_SIGN'
  | 'TAKES_SUFFIX'
  | 'SIMPLE';

/** Closed set of error codes this derivation can emit. */
export type DerivedErrorCode =
  | 'A1' | 'A2'
  | 'B1' | 'B2'
  | 'C1' | 'C2' | 'C4' | 'C5'
  | 'D4' | 'D5'
  | 'E4' | 'E5' | 'E6';

/**
 * The closed set of scheme-C (v3) task types this derivation can emit — a
 * deliberate subset of the canonical @app/shared list. Extract<> ties each
 * member to the canonical union, so a renamed or removed code fails to compile
 * here instead of drifting silently.
 */
export type TTCode = Extract<
  TaskTypeValue,
  | 'TT_1_2' | 'TT_1_3' | 'TT_1_4'
  | 'TT_2_1'
  | 'TT_3_1' | 'TT_3_2'
  | 'TT_4_2' | 'TT_4_3' | 'TT_4_4'
  | 'TT_5_1' | 'TT_5_2' | 'TT_5_3' | 'TT_5_4' | 'TT_5_5' | 'TT_5_6' | 'TT_5_7'
  | 'TT_7_3'
>;

export interface CapabilityInput {
  word: string;
  /** DB Mongolian value (нэр үг/ерөнхий, үйл үг, …) or an English token (noun/verb/adj). */
  part_of_speech: string;
  /** Derived from meaning_type upstream; gates picture task types. Defaults false. */
  imageable?: boolean;
}

export interface Capability {
  features: FeatureCode[];
  primary_feature: FeatureCode;
  skills_possible: SkillCode[];
  errors_possible: DerivedErrorCode[];
  task_types_possible: TTCode[];
  primary_skill: SkillCode;
  imageable: boolean;
  flags: { balarhai_unknown: boolean };
}

// ─── PRIMARY-FEATURE RANK (tunable — confirm with a teacher) ─────────────────
// primary_feature = the highest-ranked feature the word has; falls through to
// SIMPLE when nothing higher matches.
//
// FINAL_CONSONANT is deliberately ABSENT from this list. Most Mongolian words
// end in a consonant, so it's a near-universal property — a weak signal that
// would act like a strong one and inflate S4. It still lives in `features` and
// still contributes D5 + S4 to the capability sets; it just can never WIN the
// primary tag. A word whose only structural feature is FINAL_CONSONANT
// therefore resolves its primary to SIMPLE (and primary_skill S2), not S4.
export const RANK: readonly FeatureCode[] = [
  'REDUCED_VOWEL',
  'LONG_VOWEL',
  'CONSONANT_CLUSTER',
  'YOTATED_VOWEL',
  'SOFT_HARD_SIGN',
  'TAKES_SUFFIX',
  'SIMPLE',
] as const;

// ─── Feature → implied skill / errors ────────────────────────────────────────

const FEATURE_SKILL: Record<FeatureCode, SkillCode> = {
  REDUCED_VOWEL: 'S3',
  LONG_VOWEL: 'S3',
  CONSONANT_CLUSTER: 'S4',
  FINAL_CONSONANT: 'S4',
  YOTATED_VOWEL: 'S1',
  SOFT_HARD_SIGN: 'S4',
  TAKES_SUFFIX: 'S5',
  SIMPLE: 'S2',
};

const FEATURE_ERRORS: Record<FeatureCode, DerivedErrorCode[]> = {
  LONG_VOWEL: ['C1', 'C2'],
  REDUCED_VOWEL: ['C4', 'C5'],
  CONSONANT_CLUSTER: ['D4'],
  FINAL_CONSONANT: ['D5'],
  YOTATED_VOWEL: [],
  SOFT_HARD_SIGN: [],
  TAKES_SUFFIX: [], // POS-dependent: noun → E4,E5 ; verb → E6 (added at runtime)
  SIMPLE: ['B1', 'B2'],
};

// ─── Feature → eligible task types (interaction axis) ────────────────────────
// Cross-product is realised as the union of each present feature's TT set, plus
// the universal floor, plus picture types when imageable.

const FEATURE_TASK_TYPES: Record<FeatureCode, TTCode[]> = {
  LONG_VOWEL: ['TT_3_1', 'TT_3_2'],
  REDUCED_VOWEL: ['TT_3_2'],
  CONSONANT_CLUSTER: ['TT_4_2', 'TT_4_3', 'TT_4_4'],
  FINAL_CONSONANT: ['TT_4_2', 'TT_4_3', 'TT_4_4'],
  YOTATED_VOWEL: [],
  SOFT_HARD_SIGN: [],
  TAKES_SUFFIX: [], // resolved per POS — see NOUN/VERB_SUFFIX_TASK_TYPES
  SIMPLE: [],
};

/** Universal floor — every word, always. */
const UNIVERSAL_SKILLS: SkillCode[] = ['S1', 'S2', 'S7'];
const UNIVERSAL_ERRORS: DerivedErrorCode[] = ['B1', 'B2', 'A1', 'A2'];
const UNIVERSAL_TASK_TYPES: TTCode[] = ['TT_7_3', 'TT_2_1', 'TT_1_4'];
/** Picture types, added only when imageable. */
const IMAGEABLE_TASK_TYPES: TTCode[] = ['TT_1_2', 'TT_1_3'];

// TAKES_SUFFIX is POS-ELIGIBILITY, not surface detection. Our word bank holds
// bare lemmas (ном, аав), so "can this word take a suffix?" is answered by
// part_of_speech — never by detecting an already-present suffix (which these
// lemmas don't have). Nouns inflect for case/number/possession; verbs conjugate.
const NOUN_SUFFIX_TASK_TYPES: TTCode[] = ['TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_5', 'TT_5_6', 'TT_5_7'];
const VERB_SUFFIX_TASK_TYPES: TTCode[] = ['TT_5_4'];
const NOUN_SUFFIX_ERRORS: DerivedErrorCode[] = ['E4', 'E5']; // case / plural-possessive
const VERB_SUFFIX_ERRORS: DerivedErrorCode[] = ['E6'];        // conjugation

// ─── Part-of-speech normalisation (DB Mongolian + English tokens) ────────────

type PosClass = 'noun' | 'verb' | 'adjective' | 'other';

function classifyPos(pos: string): PosClass {
  const p = pos.normalize('NFC').trim().toLowerCase();
  if (p.startsWith('нэр үг') || p === 'noun') return 'noun';
  if (p === 'үйл үг' || p === 'verb') return 'verb';
  if (p === 'тэмдэг нэр' || p === 'adj' || p === 'adjective') return 'adjective';
  return 'other'; // туслах/төлөөний үг, pronouns, particles, unknown
}

// ─── Helpers (all built on imported phonology) ───────────────────────────────

function normalizeWord(w: string): string {
  return w.normalize('NFC').trim().toLowerCase();
}

const YOTATED = new Set(['я', 'е', 'ё', 'ю']); // rule literal; no yotated table exists upstream
const SOFT_HARD = new Set(['ь', 'ъ']);

function firstVowelIndex(w: string): number {
  for (let i = 0; i < w.length; i++) if (isVowel(w[i])) return i;
  return -1;
}

/** A word is in the балархай dictionary iff some position is a known reduced vowel. */
function inReducedVowelDict(w: string): boolean {
  for (let i = 0; i < w.length; i++) if (isReducedVowelPosition(w, i)) return true;
  return false;
}

/**
 * Conservative structural precondition for балархай in an out-of-dictionary word:
 * a NON-INITIAL short vowel (not part of a long-vowel digraph) wedged between two
 * consonants (C-V-C). Mirrors the dictionary's pattern (газар: …з-*а*-р…). Used
 * ONLY to raise the balarhai_unknown review flag — it never emits C4/C5, so an
 * over-flag (e.g. алим) is safe; a wrong tag is never produced. TUNABLE.
 */
function hasReducedVowelCandidate(w: string): boolean {
  const fv = firstVowelIndex(w);
  if (fv < 0) return false;
  for (let i = fv + 1; i < w.length - 1; i++) {
    if (
      isVowel(w[i]) &&
      !isLongVowelPart(w, i) &&
      isConsonant(w[i - 1]) &&
      isConsonant(w[i + 1])
    ) {
      return true;
    }
  }
  return false;
}

function hasLongVowel(w: string): boolean {
  for (let i = 0; i < w.length; i++) if (isLongVowelPart(w, i)) return true;
  return false;
}

function hasConsonantCluster(w: string): boolean {
  for (let i = 0; i < w.length - 1; i++) {
    if (isConsonant(w[i]) && isConsonant(w[i + 1])) return true;
  }
  return false;
}

function endsInConsonant(w: string): boolean {
  return w.length > 0 && isConsonant(w[w.length - 1]);
}

function containsAny(w: string, set: Set<string>): boolean {
  for (const ch of w) if (set.has(ch)) return true;
  return false;
}

// ─── Main derivation ─────────────────────────────────────────────────────────

export function deriveCapability(input: CapabilityInput): Capability {
  const word = normalizeWord(input.word);
  const pos = classifyPos(input.part_of_speech);
  const imageable = input.imageable ?? false;

  const features: FeatureCode[] = [];
  let balarhai_unknown = false;

  // Each rule is independent; a word may match several.
  if (hasLongVowel(word)) features.push('LONG_VOWEL');

  // REDUCED_VOWEL: emit only if the word is in the curated dictionary (verified).
  // Otherwise never emit; raise the review flag iff there's a structural candidate.
  if (inReducedVowelDict(word)) {
    features.push('REDUCED_VOWEL');
  } else if (hasReducedVowelCandidate(word)) {
    balarhai_unknown = true;
  }

  if (hasConsonantCluster(word)) features.push('CONSONANT_CLUSTER');
  if (endsInConsonant(word)) features.push('FINAL_CONSONANT');
  if (containsAny(word, YOTATED)) features.push('YOTATED_VOWEL');
  if (containsAny(word, SOFT_HARD)) features.push('SOFT_HARD_SIGN');

  // POS-eligibility (lemma-based): any noun or verb can take suffixes.
  const takesSuffix = pos === 'noun' || pos === 'verb';
  if (takesSuffix) features.push('TAKES_SUFFIX');

  // SIMPLE only when no structural feature fired.
  if (features.length === 0) features.push('SIMPLE');

  // ── Primary feature by RANK ──
  // SIMPLE is the always-available fallback. Because FINAL_CONSONANT is absent
  // from RANK it can never win, so a final-consonant-only word resolves to
  // SIMPLE even though FINAL_CONSONANT remains in `features`.
  const primary_feature: FeatureCode =
    RANK.find((f) => f === 'SIMPLE' || features.includes(f)) ?? 'SIMPLE';
  const primary_skill = FEATURE_SKILL[primary_feature];

  // ── Accumulate skills / errors / task types ──
  const skills = new Set<SkillCode>(UNIVERSAL_SKILLS);
  const errors = new Set<DerivedErrorCode>(UNIVERSAL_ERRORS);
  const taskTypes = new Set<TTCode>(UNIVERSAL_TASK_TYPES);

  for (const f of features) {
    skills.add(FEATURE_SKILL[f]);
    for (const e of FEATURE_ERRORS[f]) errors.add(e);
    for (const t of FEATURE_TASK_TYPES[f]) taskTypes.add(t);
  }

  if (takesSuffix) {
    const sufErrors = pos === 'verb' ? VERB_SUFFIX_ERRORS : NOUN_SUFFIX_ERRORS;
    const sufTasks = pos === 'verb' ? VERB_SUFFIX_TASK_TYPES : NOUN_SUFFIX_TASK_TYPES;
    for (const e of sufErrors) errors.add(e);
    for (const t of sufTasks) taskTypes.add(t);
  }

  if (imageable) for (const t of IMAGEABLE_TASK_TYPES) taskTypes.add(t);

  return {
    features,
    primary_feature,
    skills_possible: [...skills],
    errors_possible: [...errors],
    task_types_possible: [...taskTypes],
    primary_skill,
    imageable,
    flags: { balarhai_unknown },
  };
}
