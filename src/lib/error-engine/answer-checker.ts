/**
 * Answer Checker — character-level alignment using Wagner-Fischer (Levenshtein
 * with backtrace) plus transposition detection. Produces raw diffs consumed by
 * the Error Classifier.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CharDiff {
  type: 'match' | 'substitution' | 'insertion' | 'deletion' | 'transposition';
  position: number;        // position in expected word
  actualPosition: number;  // position in actual input
  expected?: string;
  actual?: string;
}

export interface AnswerDiff {
  isCorrect: boolean;
  editDistance: number;
  operations: CharDiff[];
  missingChars: { char: string; position: number }[];
  extraChars: { char: string; position: number }[];
  wrongChars: { expected: string; actual: string; position: number }[];
  transpositions: { chars: [string, string]; position: number }[];
}

export interface WordDiff {
  expectedWord: string;
  actualWord: string;
  wordPosition: number;
  diff: AnswerDiff;
}

export interface SentenceDiff {
  words: WordDiff[];
  missingPunctuation: { char: string; position: number }[];
  extraPunctuation: { char: string; position: number }[];
  caseErrors: { position: number; expected: string; actual: string }[];
  missingWords: { word: string; position: number }[];
  extraWords: { word: string; position: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PUNCTUATION = /^[.,!?;:…"""''«»()—–\-\u2014\u2013]$/;

function isPunctuation(ch: string): boolean {
  return PUNCTUATION.test(ch);
}

/**
 * Strip trailing/leading punctuation from a token, returning the word and
 * any punctuation characters with their original positions.
 */
function stripPunctuation(
  token: string,
  basePosition: number,
): { word: string; punctuation: { char: string; position: number }[] } {
  const punctuation: { char: string; position: number }[] = [];
  let start = 0;
  let end = token.length;

  while (start < end && isPunctuation(token[start])) {
    punctuation.push({ char: token[start], position: basePosition + start });
    start++;
  }
  while (end > start && isPunctuation(token[end - 1])) {
    punctuation.push({ char: token[end - 1], position: basePosition + end - 1 });
    end--;
  }

  return { word: token.slice(start, end), punctuation };
}

// ─── Wagner-Fischer with backtrace + transposition ───────────────────────────

/**
 * Compute optimal edit operations between `expected` and `actual` using the
 * Damerau-Levenshtein algorithm (Wagner-Fischer with adjacent transpositions).
 *
 * The DP uses three operation costs: substitution=1, insertion=1, deletion=1,
 * transposition=1. After computing the matrix we backtrace to recover the
 * actual sequence of operations.
 */
/** Parent-pointer codes for the DP forward trace. */
const enum PtrOp {
  NONE = 0,
  MATCH = 1,
  SUB = 2,
  DEL = 3,
  INS = 4,
  TRANS = 5,
}

function computeOperations(expected: string, actual: string): CharDiff[] {
  const n = expected.length;
  const m = actual.length;

  // dp[i][j] = min edit distance for expected[0..i-1] vs actual[0..j-1]
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  // parent[i][j] = which operation reached this cell optimally
  const parent: PtrOp[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(PtrOp.NONE),
  );

  for (let i = 1; i <= n; i++) { dp[i][0] = i; parent[i][0] = PtrOp.DEL; }
  for (let j = 1; j <= m; j++) { dp[0][j] = j; parent[0][j] = PtrOp.INS; }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = expected[i - 1] === actual[j - 1] ? 0 : 1;

      let best = dp[i - 1][j - 1] + cost;
      let bestOp: PtrOp = cost === 0 ? PtrOp.MATCH : PtrOp.SUB;

      const delCost = dp[i - 1][j] + 1;
      if (delCost < best) {
        best = delCost;
        bestOp = PtrOp.DEL;
      }

      const insCost = dp[i][j - 1] + 1;
      if (insCost < best) {
        best = insCost;
        bestOp = PtrOp.INS;
      }

      // Transposition: adjacent swap
      if (
        i > 1 &&
        j > 1 &&
        expected[i - 1] === actual[j - 2] &&
        expected[i - 2] === actual[j - 1]
      ) {
        const transCost = dp[i - 2][j - 2] + 1;
        if (transCost < best) {
          best = transCost;
          bestOp = PtrOp.TRANS;
        }
      }

      dp[i][j] = best;
      parent[i][j] = bestOp;
    }
  }

  // Forward trace using parent pointers (backtrace then reverse)
  const ops: CharDiff[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    const op = parent[i][j];

    switch (op) {
      case PtrOp.TRANS:
        ops.push({
          type: 'transposition',
          position: i - 2,
          actualPosition: j - 2,
          expected: expected[i - 2] + expected[i - 1],
          actual: actual[j - 2] + actual[j - 1],
        });
        i -= 2;
        j -= 2;
        break;

      case PtrOp.MATCH:
        ops.push({
          type: 'match',
          position: i - 1,
          actualPosition: j - 1,
          expected: expected[i - 1],
          actual: actual[j - 1],
        });
        i--;
        j--;
        break;

      case PtrOp.SUB:
        ops.push({
          type: 'substitution',
          position: i - 1,
          actualPosition: j - 1,
          expected: expected[i - 1],
          actual: actual[j - 1],
        });
        i--;
        j--;
        break;

      case PtrOp.DEL:
        ops.push({
          type: 'deletion',
          position: i - 1,
          actualPosition: j,
          expected: expected[i - 1],
        });
        i--;
        break;

      case PtrOp.INS:
        ops.push({
          type: 'insertion',
          position: i,
          actualPosition: j - 1,
          actual: actual[j - 1],
        });
        j--;
        break;

      default:
        // Should not happen
        i = 0;
        j = 0;
        break;
    }
  }

  ops.reverse();

  // Post-process: slide deletions and insertions rightward through adjacent
  // matches of the same character. This ensures that when a long vowel like
  // "оо" loses one "о", the *second* position is reported as missing (not the
  // first), which is the natural reading for C1/C2 error detection.
  let changed = true;
  while (changed) {
    changed = false;
    for (let k = 0; k < ops.length - 1; k++) {
      // Slide deletion right through a match of the same character
      if (
        ops[k].type === 'deletion' &&
        ops[k + 1].type === 'match' &&
        ops[k].expected === ops[k + 1].expected
      ) {
        const delPos = ops[k].position;
        const matchPos = ops[k + 1].position;
        const matchActualPos = ops[k + 1].actualPosition!;
        ops[k] = {
          type: 'match',
          position: delPos,
          actualPosition: matchActualPos,
          expected: ops[k].expected,
          actual: ops[k].expected,
        };
        ops[k + 1] = {
          type: 'deletion',
          position: matchPos,
          actualPosition: matchActualPos + 1,
          expected: ops[k].expected,
        };
        changed = true;
      }
      // Slide insertion right through a match of the same character
      if (
        ops[k].type === 'insertion' &&
        ops[k + 1].type === 'match' &&
        ops[k].actual === ops[k + 1].actual
      ) {
        const insActualPos = ops[k].actualPosition;
        const matchPos = ops[k + 1].position;
        const matchActualPos = ops[k + 1].actualPosition;
        ops[k] = {
          type: 'match',
          position: matchPos,
          actualPosition: insActualPos,
          expected: ops[k + 1].expected,
          actual: ops[k].actual,
        };
        ops[k + 1] = {
          type: 'insertion',
          position: matchPos + 1,
          actualPosition: matchActualPos,
          actual: ops[k + 1].actual,
        };
        changed = true;
      }
    }
  }

  return ops;
}

// ─── checkAnswer ─────────────────────────────────────────────────────────────

export function checkAnswer(expected: string, actual: string): AnswerDiff {
  if (expected === actual) {
    const ops: CharDiff[] = expected.split('').map((ch, i) => ({
      type: 'match' as const,
      position: i,
      actualPosition: i,
      expected: ch,
      actual: ch,
    }));
    return {
      isCorrect: true,
      editDistance: 0,
      operations: ops,
      missingChars: [],
      extraChars: [],
      wrongChars: [],
      transpositions: [],
    };
  }

  const operations = computeOperations(expected, actual);

  // Compute edit distance from operations
  const editDistance = operations.filter((op) => op.type !== 'match').length;

  const missingChars: AnswerDiff['missingChars'] = [];
  const extraChars: AnswerDiff['extraChars'] = [];
  const wrongChars: AnswerDiff['wrongChars'] = [];
  const transpositions: AnswerDiff['transpositions'] = [];

  for (const op of operations) {
    switch (op.type) {
      case 'deletion':
        missingChars.push({ char: op.expected!, position: op.position });
        break;
      case 'insertion':
        extraChars.push({ char: op.actual!, position: op.actualPosition });
        break;
      case 'substitution':
        wrongChars.push({
          expected: op.expected!,
          actual: op.actual!,
          position: op.position,
        });
        break;
      case 'transposition':
        transpositions.push({
          chars: [op.expected![0], op.expected![1]],
          position: op.position,
        });
        break;
    }
  }

  return {
    isCorrect: false,
    editDistance,
    operations,
    missingChars,
    extraChars,
    wrongChars,
    transpositions,
  };
}

// ─── checkSentence ───────────────────────────────────────────────────────────

/**
 * Tokenize a sentence into word tokens, keeping track of original character
 * positions. Punctuation attached to words is preserved in the token for now —
 * it gets separated during analysis.
 */
function tokenize(sentence: string): { token: string; charPos: number }[] {
  const tokens: { token: string; charPos: number }[] = [];
  let i = 0;

  while (i < sentence.length) {
    // Skip whitespace
    while (i < sentence.length && sentence[i] === ' ') i++;
    if (i >= sentence.length) break;

    const start = i;
    while (i < sentence.length && sentence[i] !== ' ') i++;
    tokens.push({ token: sentence.slice(start, i), charPos: start });
  }

  return tokens;
}

/**
 * Align two word arrays using the same Levenshtein approach to handle
 * missing/extra words.
 */
function alignWords(
  expectedWords: string[],
  actualWords: string[],
): { type: 'match' | 'missing' | 'extra' | 'changed'; eIdx: number; aIdx: number }[] {
  const n = expectedWords.length;
  const m = actualWords.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );

  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = expectedWords[i - 1] === actualWords[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  // Backtrace
  const alignment: { type: 'match' | 'missing' | 'extra' | 'changed'; eIdx: number; aIdx: number }[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (
      i > 0 && j > 0 &&
      expectedWords[i - 1] === actualWords[j - 1] &&
      dp[i][j] === dp[i - 1][j - 1]
    ) {
      alignment.push({ type: 'match', eIdx: i - 1, aIdx: j - 1 });
      i--; j--;
    } else if (
      i > 0 && j > 0 &&
      dp[i][j] === dp[i - 1][j - 1] + 1
    ) {
      alignment.push({ type: 'changed', eIdx: i - 1, aIdx: j - 1 });
      i--; j--;
    } else if (j > 0 && dp[i][j] === dp[i][j - 1] + 1) {
      alignment.push({ type: 'extra', eIdx: i, aIdx: j - 1 });
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      alignment.push({ type: 'missing', eIdx: i - 1, aIdx: j });
      i--;
    } else {
      break;
    }
  }

  alignment.reverse();
  return alignment;
}

export function checkSentence(expected: string, actual: string): SentenceDiff {
  const result: SentenceDiff = {
    words: [],
    missingPunctuation: [],
    extraPunctuation: [],
    caseErrors: [],
    missingWords: [],
    extraWords: [],
  };

  // 1. Check first-character capitalization
  if (expected.length > 0 && actual.length > 0) {
    const eFirst = expected[0];
    const aFirst = actual[0];
    if (eFirst !== aFirst && eFirst.toLowerCase() === aFirst.toLowerCase()) {
      result.caseErrors.push({
        position: 0,
        expected: eFirst,
        actual: aFirst,
      });
    }
  }

  // 2. Tokenize both sentences
  const expectedTokens = tokenize(expected);
  const actualTokens = tokenize(actual);

  // 3. Strip punctuation from each token to get pure words and punctuation lists
  const expectedParsed = expectedTokens.map((t) => {
    const { word, punctuation } = stripPunctuation(t.token, t.charPos);
    return { word: word.toLowerCase(), originalWord: word, punctuation, charPos: t.charPos, token: t.token };
  });
  const actualParsed = actualTokens.map((t) => {
    const { word, punctuation } = stripPunctuation(t.token, t.charPos);
    return { word: word.toLowerCase(), originalWord: word, punctuation, charPos: t.charPos, token: t.token };
  });

  // 4. Compare punctuation between expected and actual
  const expectedPuncSet = new Map<string, { char: string; position: number }[]>();
  const actualPuncSet = new Map<string, { char: string; position: number }[]>();

  // Collect all punctuation from expected tokens
  for (const p of expectedParsed) {
    for (const punc of p.punctuation) {
      const key = punc.char;
      if (!expectedPuncSet.has(key)) expectedPuncSet.set(key, []);
      expectedPuncSet.get(key)!.push(punc);
    }
  }

  // Collect all punctuation from actual tokens
  for (const p of actualParsed) {
    for (const punc of p.punctuation) {
      const key = punc.char;
      if (!actualPuncSet.has(key)) actualPuncSet.set(key, []);
      actualPuncSet.get(key)!.push(punc);
    }
  }

  // Check sentence-final punctuation specifically
  const expectedLastToken = expectedTokens[expectedTokens.length - 1];
  const actualLastToken = actualTokens[actualTokens.length - 1];

  if (expectedLastToken && actualLastToken) {
    const eLast = expectedLastToken.token;
    const aLast = actualLastToken.token;
    const eEndPunc = eLast.length > 0 && isPunctuation(eLast[eLast.length - 1]) ? eLast[eLast.length - 1] : null;
    const aEndPunc = aLast.length > 0 && isPunctuation(aLast[aLast.length - 1]) ? aLast[aLast.length - 1] : null;

    if (eEndPunc && !aEndPunc) {
      result.missingPunctuation.push({
        char: eEndPunc,
        position: expectedLastToken.charPos + eLast.length - 1,
      });
    } else if (!eEndPunc && aEndPunc) {
      result.extraPunctuation.push({
        char: aEndPunc,
        position: actualLastToken.charPos + aLast.length - 1,
      });
    }
  }

  // 5. Extract pure words for alignment
  const expectedWords = expectedParsed.map((p) => p.word);
  const actualWords = actualParsed.map((p) => p.word);

  // 6. Align word arrays
  const alignment = alignWords(expectedWords, actualWords);

  for (const entry of alignment) {
    switch (entry.type) {
      case 'match': {
        const ew = expectedParsed[entry.eIdx];
        const aw = actualParsed[entry.aIdx];
        const diff = checkAnswer(ew.word, aw.word);
        result.words.push({
          expectedWord: ew.word,
          actualWord: aw.word,
          wordPosition: entry.eIdx,
          diff,
        });
        break;
      }
      case 'changed': {
        const ew = expectedParsed[entry.eIdx];
        const aw = actualParsed[entry.aIdx];
        const diff = checkAnswer(ew.word, aw.word);
        result.words.push({
          expectedWord: ew.word,
          actualWord: aw.word,
          wordPosition: entry.eIdx,
          diff,
        });
        break;
      }
      case 'missing':
        result.missingWords.push({
          word: expectedParsed[entry.eIdx].word,
          position: entry.eIdx,
        });
        break;
      case 'extra':
        result.extraWords.push({
          word: actualParsed[entry.aIdx].word,
          position: entry.aIdx,
        });
        break;
    }
  }

  return result;
}
