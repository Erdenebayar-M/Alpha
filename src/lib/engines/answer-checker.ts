/**
 * answer-checker.ts
 *
 * Produces a structured `RawDiff` for every task type without applying
 * any Mongolian-specific error codes. The error-classification engine
 * consumes RawDiff and maps it to pedagogical error codes.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RawDiff {
  isCorrect: boolean;
  missingChars: { char: string; position: number }[];
  extraChars: { char: string; position: number }[];
  wrongChars: { expected: string; actual: string; position: number }[];
  missingPunctuation: { char: string; expectedPosition: string }[];
  caseErrors: { expected: string; actual: string; position: number }[];
  transpositions: { chars: [string, string]; position: number }[];
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type EditOp =
  | { type: "match";       char: string;                       inputPos: number; expectedPos: number }
  | { type: "insert";      char: string;                       inputPos: number; expectedPos: number }
  | { type: "delete";      char: string;                       inputPos: number; expectedPos: number }
  | { type: "substitute";  expected: string; actual: string;   inputPos: number; expectedPos: number };

type ProcessedOp =
  | EditOp
  | { type: "transposition"; chars: [string, string]; inputPos: number; expectedPos: number };

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

const TERMINAL_PUNCT = new Set([".", "?", "!"]);

function emptyDiff(isCorrect: boolean): RawDiff {
  return {
    isCorrect,
    missingChars: [],
    extraChars: [],
    wrongChars: [],
    missingPunctuation: [],
    caseErrors: [],
    transpositions: [],
  };
}

/** NFC-normalise, trim whitespace, collapse internal runs of spaces. */
function normalizeStr(s: string): string {
  return s.normalize("NFC").trim().replace(/\s+/g, " ");
}

/**
 * Prepare a string for character-level comparison.
 * Strips terminal punctuation (already captured by sentence-level checks)
 * and lowercases the first character (case error already captured).
 */
function stripForCharDiff(s: string): string {
  let r = s;
  if (r.length > 0 && TERMINAL_PUNCT.has(r[r.length - 1])) {
    r = r.slice(0, -1).trimEnd();
  }
  if (r.length > 0) {
    r = r[0].toLowerCase() + r.slice(1);
  }
  return r;
}

function isDiffEmpty(diff: RawDiff): boolean {
  return (
    diff.missingChars.length === 0 &&
    diff.extraChars.length === 0 &&
    diff.wrongChars.length === 0 &&
    diff.missingPunctuation.length === 0 &&
    diff.caseErrors.length === 0 &&
    diff.transpositions.length === 0
  );
}

// ---------------------------------------------------------------------------
// Levenshtein edit-operation extraction
// ---------------------------------------------------------------------------

/**
 * Standard Levenshtein alignment returned as an ordered list of edit ops.
 * Tie-breaking order: match > substitute > insert > delete.
 * Preferring substitute over insert/delete ensures adjacent swaps produce
 * two consecutive substitutions that detectTranspositions can recognise.
 */
function levenshteinOps(input: string, expected: string): EditOp[] {
  const m = input.length;
  const n = expected.length;

  // Build distance table
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array<number>(n + 1).fill(0);
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (input[i - 1] === expected[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] =
          1 +
          Math.min(
            dp[i - 1][j - 1], // substitute
            dp[i][j - 1],     // insert (char missing from input)
            dp[i - 1][j],     // delete (extra char in input)
          );
      }
    }
  }

  // Backtrack
  const ops: EditOp[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && input[i - 1] === expected[j - 1]) {
      ops.push({ type: "match", char: input[i - 1], inputPos: i - 1, expectedPos: j - 1 });
      i--;
      j--;
      continue;
    }

    const costSub = i > 0 && j > 0 ? dp[i - 1][j - 1] : Infinity;
    const costIns = j > 0 ? dp[i][j - 1] : Infinity;   // insert missing char
    const costDel = i > 0 ? dp[i - 1][j] : Infinity;   // delete extra char

    // Prefer substitute when it ties, so adjacent swaps yield two consecutive
    // substitutions that detectTranspositions can merge into one transposition.
    if (costSub <= costIns && costSub <= costDel) {
      ops.push({
        type: "substitute",
        expected: expected[j - 1],
        actual: input[i - 1],
        inputPos: i - 1,
        expectedPos: j - 1,
      });
      i--;
      j--;
    } else if (costIns <= costDel) {
      ops.push({ type: "insert", char: expected[j - 1], inputPos: i, expectedPos: j - 1 });
      j--;
    } else {
      ops.push({ type: "delete", char: input[i - 1], inputPos: i - 1, expectedPos: j });
      i--;
    }
  }

  ops.reverse();
  return ops;
}

/**
 * Scan the edit-op list and merge consecutive (A→B, B→A) substitutions
 * into a single transposition op.
 */
function detectTranspositions(ops: EditOp[]): ProcessedOp[] {
  const result: ProcessedOp[] = [];
  let i = 0;
  while (i < ops.length) {
    const op = ops[i];
    const next = i + 1 < ops.length ? ops[i + 1] : null;

    if (
      op.type === "substitute" &&
      next !== null &&
      next.type === "substitute" &&
      op.expected === next.actual &&
      op.actual === next.expected
    ) {
      result.push({
        type: "transposition",
        chars: [op.expected, op.actual],
        inputPos: op.inputPos,
        expectedPos: op.expectedPos,
      });
      i += 2;
    } else {
      result.push(op);
      i++;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sentence-level checks
// ---------------------------------------------------------------------------

function checkSentenceLevel(
  input: string,
  expected: string,
): { caseErrors: RawDiff["caseErrors"]; missingPunctuation: RawDiff["missingPunctuation"] } {
  const caseErrors: RawDiff["caseErrors"] = [];
  const missingPunctuation: RawDiff["missingPunctuation"] = [];

  // First-character case
  if (input.length > 0 && expected.length > 0) {
    const eFirst = expected[0];
    const iFirst = input[0];
    if (eFirst !== iFirst && eFirst.toLowerCase() === iFirst.toLowerCase()) {
      caseErrors.push({ expected: eFirst, actual: iFirst, position: 0 });
    }
  }

  // Terminal punctuation
  const eLast = expected[expected.length - 1];
  const iLast = input[input.length - 1];
  if (TERMINAL_PUNCT.has(eLast) && !TERMINAL_PUNCT.has(iLast)) {
    missingPunctuation.push({ char: eLast, expectedPosition: "end" });
  }

  return { caseErrors, missingPunctuation };
}

// ---------------------------------------------------------------------------
// Character-level diff
// ---------------------------------------------------------------------------

function charLevelDiff(input: string, expected: string): {
  missingChars: RawDiff["missingChars"];
  extraChars: RawDiff["extraChars"];
  wrongChars: RawDiff["wrongChars"];
  transpositions: RawDiff["transpositions"];
} {
  const missingChars: RawDiff["missingChars"] = [];
  const extraChars: RawDiff["extraChars"] = [];
  const wrongChars: RawDiff["wrongChars"] = [];
  const transpositions: RawDiff["transpositions"] = [];

  const ops = detectTranspositions(levenshteinOps(input, expected));

  for (const op of ops) {
    switch (op.type) {
      case "insert":
        missingChars.push({ char: op.char, position: op.expectedPos });
        break;
      case "delete":
        extraChars.push({ char: op.char, position: op.inputPos });
        break;
      case "substitute":
        wrongChars.push({ expected: op.expected, actual: op.actual, position: op.inputPos });
        break;
      case "transposition":
        transpositions.push({ chars: op.chars, position: op.inputPos });
        break;
    }
  }

  return { missingChars, extraChars, wrongChars, transpositions };
}

// ---------------------------------------------------------------------------
// Full diff  (TT3_CORRECTION, TT6_SELF_CHECK)
// ---------------------------------------------------------------------------

function checkFullDiff(input: string, expected: string): RawDiff {
  const { caseErrors, missingPunctuation } = checkSentenceLevel(input, expected);

  // Strip already-captured issues so they are not double-reported
  const inpStripped = stripForCharDiff(input);
  const expStripped = stripForCharDiff(expected);

  const charDiffs = charLevelDiff(inpStripped, expStripped);

  const diff: RawDiff = {
    isCorrect: false,
    ...charDiffs,
    caseErrors,
    missingPunctuation,
  };
  diff.isCorrect = isDiffEmpty(diff);
  return diff;
}

// ---------------------------------------------------------------------------
// Dictation (TT4_DICTATION)  — word-by-word char diff, no sentence checks
// ---------------------------------------------------------------------------

function checkDictation(input: string, expected: string): RawDiff {
  const split = (s: string) => s.split(/[\s,]+/).filter(Boolean);

  const expWords = split(expected);
  const inpWords = split(input);

  const merged = emptyDiff(false);
  const len = Math.max(expWords.length, inpWords.length);

  for (let w = 0; w < len; w++) {
    const expWord = expWords[w] ?? "";
    const inpWord = inpWords[w] ?? "";

    if (!expWord) {
      // Entirely extra word
      for (let k = 0; k < inpWord.length; k++) {
        merged.extraChars.push({ char: inpWord[k], position: k });
      }
      continue;
    }
    if (!inpWord) {
      // Entirely missing word
      for (let k = 0; k < expWord.length; k++) {
        merged.missingChars.push({ char: expWord[k], position: k });
      }
      continue;
    }

    const wordDiff = charLevelDiff(inpWord, expWord);
    merged.missingChars.push(...wordDiff.missingChars);
    merged.extraChars.push(...wordDiff.extraChars);
    merged.wrongChars.push(...wordDiff.wrongChars);
    merged.transpositions.push(...wordDiff.transpositions);
  }

  merged.isCorrect = isDiffEmpty(merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Mini-text (TT5_MINI_TEXT)  — sentence-by-sentence full diff
// ---------------------------------------------------------------------------

function checkMiniText(input: string, expected: string): RawDiff {
  // Split on terminal punctuation, keeping the delimiter attached
  const splitSentences = (s: string) =>
    s.match(/[^.?!]+[.?!]?/g)?.map((x) => x.trim()).filter(Boolean) ?? [s.trim()];

  const expSentences = splitSentences(expected);
  const inpSentences = splitSentences(input);

  const merged = emptyDiff(false);
  const len = Math.max(expSentences.length, inpSentences.length);

  for (let s = 0; s < len; s++) {
    const expSent = expSentences[s] ?? "";
    const inpSent = inpSentences[s] ?? "";
    const sentDiff = checkFullDiff(inpSent, expSent);
    merged.missingChars.push(...sentDiff.missingChars);
    merged.extraChars.push(...sentDiff.extraChars);
    merged.wrongChars.push(...sentDiff.wrongChars);
    merged.caseErrors.push(...sentDiff.caseErrors);
    merged.missingPunctuation.push(...sentDiff.missingPunctuation);
    merged.transpositions.push(...sentDiff.transpositions);
  }

  merged.isCorrect = isDiffEmpty(merged);
  return merged;
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Compares a learner's `input` against the `expected` answer for a task
 * identified by `taskType` (a `TaskType` enum value as a string).
 *
 * Pre-processing applied to both strings for every task type:
 *   - Unicode NFC normalisation
 *   - Leading/trailing whitespace trimmed
 *   - Internal runs of spaces collapsed to a single space
 */
export function checkAnswer(
  input: string,
  expected: string,
  taskType: string,
): RawDiff {
  const inp = normalizeStr(input);
  const exp = normalizeStr(expected);

  switch (taskType) {
    case "TT1_CHOICE": {
      return emptyDiff(inp === exp);
    }

    case "TT2_FILL": {
      const isCorrect = inp.toLowerCase() === exp.toLowerCase();
      const diff = emptyDiff(isCorrect);
      if (!isCorrect) {
        diff.wrongChars.push({ expected: exp, actual: inp, position: 0 });
      }
      return diff;
    }

    case "TT4_DICTATION":
      return checkDictation(inp, exp);

    case "TT5_MINI_TEXT":
      return checkMiniText(inp, exp);

    // TT3_CORRECTION and TT6_SELF_CHECK both use full sentence + char diff
    default:
      return checkFullDiff(inp, exp);
  }
}
