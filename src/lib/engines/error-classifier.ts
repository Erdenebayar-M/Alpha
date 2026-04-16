/**
 * error-classifier.ts
 *
 * Maps a RawDiff produced by answer-checker.ts into structured
 * ErrorClassification objects using Mongolian orthography helpers.
 *
 * Rules implemented:
 *   C1  — long vowel character missing
 *   C4  — reduced (балархай) vowел missing
 *   B1  — general character missing (catch-all for missingChars)
 *   C2  — vowel added where the expected word has none / one
 *   D3  — consonant confusion pair (root region only)
 *   B3  — transposition
 *   E1  — suffix completely missing
 *   E2  — wrong suffix (recognised suffix, but different from expected)
 *   E7  — spelling error within suffix
 *   G1  — capital letter error (first char not capitalised, or all-caps input)
 *   G2  — missing terminal punctuation
 *   H4  — self-check failure (TT6_SELF_CHECK only)
 *
 * Classification order:
 *   1. G1 from caseErrors (position 0)
 *   2. Extract suffixes from both expected and input
 *   3. Suffix differences → E1, E2, E7  (highest priority)
 *   4. G1 from all-caps wrongChars (consume before D3)
 *   5. Remaining wrongChars not in suffix → D3
 *   6. Transpositions → B3
 *   7. Missing chars → C1 → C4 → B1
 *   8. Extra vowels → C2
 *   9. G2 from missingPunctuation
 *  10. H4 when taskType is TT6_SELF_CHECK and diff is not correct
 *
 * A single diff entry receives exactly ONE code (consumed sets prevent
 * double-classification).
 */

import type { RawDiff } from "./answer-checker";
import {
  LONG_VOWEL_PAIRS,
  isLongVowelPosition,
  isReducedVowelPosition,
  isVowel,
  extractSuffix,
  isConsonantConfusionPair,
} from "./mongolian-helpers";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface ErrorClassification {
  code: string;
  severity: 1 | 2 | 3;
  position?: number;
  expectedChar?: string;
  actualChar?: string;
  contextWord?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Normalise `expected` to the same form that `charLevelDiff` operates on
 * inside answer-checker — so that position indices in RawDiff entries align
 * with character indices of the returned string.
 *
 * Mirrors `stripForCharDiff(normalizeStr(expected))`:
 *   1. NFC + trim + collapse spaces
 *   2. Strip a single terminal punctuation character (.?!)
 *   3. Lowercase the whole string (first-char case errors are captured
 *      separately in caseErrors, not in missingChars/extraChars)
 */
function normaliseExpected(expected: string): string {
  let s = expected.normalize("NFC").trim().replace(/\s+/g, " ");
  if (s.length > 0 && [".", "?", "!"].includes(s[s.length - 1])) {
    s = s.slice(0, -1).trimEnd();
  }
  return s.toLowerCase();
}

/**
 * Returns true when the missing character at `position` in `expected` belongs
 * to a long-vowel pair — regardless of whether the Levenshtein backtracker
 * chose to represent it as the first or the second character of that pair.
 *
 * Two cases:
 *   • `position` is the SECOND character of a pair  — isLongVowelPosition()
 *   • `position` is the FIRST character of a pair   — look one step forward
 */
function isMissingFromLongVowel(expected: string, position: number): boolean {
  // Case 1: the second character of a long pair is missing
  if (isLongVowelPosition(expected, position)) return true;

  // Case 2: the first character of a long pair is missing
  if (position >= 0 && position + 1 < expected.length) {
    const pair = expected[position] + expected[position + 1];
    if (LONG_VOWEL_PAIRS.includes(pair)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Classify all errors present in `diff` and return a list of
 * ErrorClassification objects.
 *
 * @param diff       RawDiff from checkAnswer()
 * @param expected   The canonical correct answer string (as passed to checkAnswer)
 * @param taskType   TaskType enum value as string (e.g. "TT3_CORRECTION")
 * @param input      The learner's raw input string (required for E1/E2/E7/D3)
 */
export function classifyErrors(
  diff: RawDiff,
  expected: string,
  taskType: string,
  input?: string,
): ErrorClassification[] {
  if (diff.isCorrect) return [];

  const result: ErrorClassification[] = [];
  const expNorm = normaliseExpected(expected);
  const inpNorm = input !== undefined ? normaliseExpected(input) : undefined;

  // ── G1 (case 1): First character not capitalised ──────────────────────
  for (const ce of diff.caseErrors) {
    if (ce.position === 0) {
      result.push({
        code: "G1",
        severity: 1,
        position: ce.position,
        expectedChar: ce.expected,
        actualChar: ce.actual,
      });
    }
  }

  // Extract suffixes once; used by E1, E2, E7, and D3 boundary check.
  const expSuffix = extractSuffix(expNorm);
  const inpSuffix: ReturnType<typeof extractSuffix> | undefined =
    inpNorm !== undefined ? extractSuffix(inpNorm) : undefined;

  // Index into expNorm where the suffix begins (or past-end if no suffix).
  const suffixStart = expSuffix !== null ? expSuffix.root.length : expNorm.length;

  // Sets of indices (into diff.wrongChars / diff.missingChars) that have
  // already been claimed by a higher-priority rule.
  const consumedWrong = new Set<number>();
  const consumedMissing = new Set<number>();

  // ── E1: Suffix completely missing ─────────────────────────────────────
  // Expected has a known suffix; input has none and equals the expected root.
  if (
    expSuffix !== null &&
    inpNorm !== undefined &&
    inpSuffix === null &&
    inpNorm === expSuffix.root
  ) {
    result.push({ code: "E1", severity: 2, contextWord: expNorm });
    diff.missingChars.forEach((mc, i) => {
      if (mc.position >= suffixStart) consumedMissing.add(i);
    });
  }

  // ── E2: Wrong suffix ──────────────────────────────────────────────────
  // Both words have recognised suffixes with the same root but different
  // suffix morphemes.
  if (
    expSuffix !== null &&
    inpSuffix !== undefined &&
    inpSuffix !== null &&
    expSuffix.suffix !== inpSuffix.suffix &&
    expSuffix.root === inpSuffix.root
  ) {
    result.push({ code: "E2", severity: 2, contextWord: expNorm });
    diff.wrongChars.forEach((wc, i) => {
      if (wc.position >= suffixStart) consumedWrong.add(i);
    });
    diff.missingChars.forEach((mc, i) => {
      if (mc.position >= suffixStart) consumedMissing.add(i);
    });
  }

  // ── E7: Spelling error within suffix ──────────────────────────────────
  // A wrongChar falls inside the suffix region but is not an E2 case.
  let e7Fired = false;
  for (let i = 0; i < diff.wrongChars.length; i++) {
    if (consumedWrong.has(i)) continue;
    const wc = diff.wrongChars[i];
    if (expSuffix !== null && wc.position >= suffixStart) {
      result.push({
        code: "E7",
        severity: 2,
        position: wc.position,
        expectedChar: wc.expected,
        actualChar: wc.actual,
        contextWord: expNorm,
      });
      consumedWrong.add(i);
      e7Fired = true;
    }
  }
  // Consume any suffix missingChars that belong to the same mangled suffix.
  if (e7Fired) {
    diff.missingChars.forEach((mc, i) => {
      if (mc.position >= suffixStart) consumedMissing.add(i);
    });
  }

  // ── G1 (case 2): All-caps input — uppercase wrongChars ───────────────────
  // When the child typed entirely in uppercase, the char diff produces
  // wrongChars where actual is the uppercase version of the (lowercased)
  // expected character.  Detect by: actual.toLowerCase() === expected.
  for (let i = 0; i < diff.wrongChars.length; i++) {
    if (consumedWrong.has(i)) continue;
    const wc = diff.wrongChars[i];
    if (wc.actual !== wc.expected && wc.actual.toLowerCase() === wc.expected) {
      result.push({
        code: "G1",
        severity: 1,
        position: wc.position,
        expectedChar: wc.expected,
        actualChar: wc.actual,
        contextWord: expNorm,
      });
      consumedWrong.add(i);
    }
  }

  // ── D3: Consonant confusion (root region only) ────────────────────────
  // Substitution of a consonant with its confusion pair, outside the suffix.
  for (let i = 0; i < diff.wrongChars.length; i++) {
    if (consumedWrong.has(i)) continue;
    const wc = diff.wrongChars[i];
    if (isConsonantConfusionPair(wc.expected, wc.actual)) {
      result.push({
        code: "D3",
        severity: 2,
        position: wc.position,
        expectedChar: wc.expected,
        actualChar: wc.actual,
        contextWord: expNorm,
      });
      consumedWrong.add(i);
    }
  }

  // ── Missing characters: C1 → C4 → B1 ──────────────────────────────────
  for (let i = 0; i < diff.missingChars.length; i++) {
    if (consumedMissing.has(i)) continue;
    const { char, position } = diff.missingChars[i];

    if (isMissingFromLongVowel(expNorm, position)) {
      result.push({
        code: "C1",
        severity: 2,
        position,
        expectedChar: char,
        contextWord: expNorm,
      });
    } else if (isReducedVowelPosition(expNorm, position)) {
      result.push({
        code: "C4",
        severity: 2,
        position,
        expectedChar: char,
        contextWord: expNorm,
      });
    } else {
      result.push({
        code: "B1",
        severity: 2,
        position,
        expectedChar: char,
        contextWord: expNorm,
      });
    }
  }

  // ── Extra characters: C2 ───────────────────────────────────────────────
  // An extra vowel means the child doubled a vowel that should not be doubled.
  // ь (soft sign) is explicitly excluded — it is not a vowel.
  for (const ec of diff.extraChars) {
    if (isVowel(ec.char)) {
      result.push({
        code: "C2",
        severity: 2,
        position: ec.position,
        actualChar: ec.char,
        contextWord: expNorm,
      });
    }
  }

  // ── B3: Transpositions ────────────────────────────────────────────────
  for (const tr of diff.transpositions) {
    result.push({
      code: "B3",
      severity: 1,
      position: tr.position,
      contextWord: expNorm,
    });
  }

  // ── G2: Missing terminal punctuation ─────────────────────────────────
  for (const mp of diff.missingPunctuation) {
    result.push({
      code: "G2",
      severity: 1,
      expectedChar: mp.char,
      contextWord: expNorm,
    });
  }

  // ── H4: Self-check failure ─────────────────────────────────────────────
  // Only for TT6_SELF_CHECK; fires whenever the diff is not correct
  // (the early return above already handles the "fixed it" case).
  if (taskType === "TT6_SELF_CHECK") {
    result.push({ code: "H4", severity: 1 });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Score helper
// ---------------------------------------------------------------------------

/**
 * Convert a list of ErrorClassification objects to an attempt score.
 *
 * Scores: 1.0 (perfect) | 0.75 (minor) | 0.5 (moderate) | 0.25 (severe)
 */
export function calculateTaskScore(errors: ErrorClassification[]): number {
  if (errors.length === 0) return 1.0;

  const hasSeverity3 = errors.some((e) => e.severity === 3);
  const severity2Count = errors.filter((e) => e.severity >= 2).length;

  if (hasSeverity3 || severity2Count >= 3) return 0.25;
  if (severity2Count >= 1) return 0.5;
  return 0.75; // only severity-1 errors
}
