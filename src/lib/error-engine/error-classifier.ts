/**
 * Error Classifier — takes raw diffs from answer-checker and classifies each
 * diff into one of 12 MVP error codes.
 *
 * Classification priority order:
 *   C1 → C2 → C4 → D3 → E1 → E2 → E7 → B3 → B1 → G1 → G2 → H4
 */

import type { AnswerDiff, SentenceDiff } from './answer-checker';
import {
  isLongVowelPart,
  isReducedVowelPosition,
  extractSuffix,
  CONFUSABLE_CONSONANT_PAIRS,
} from './mongolian-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'B1' | 'B3'
  | 'C1' | 'C2' | 'C4'
  | 'D3'
  | 'E1' | 'E2' | 'E7'
  | 'G1' | 'G2'
  | 'H4';

export interface ClassifiedError {
  errorCode: ErrorCode;
  severity: 1 | 2 | 3;
  position: number;
  expectedChar?: string;
  actualChar?: string;
  contextWord: string;
  message: string;
}

export interface TaskMeta {
  taskType: string;       // 'TT1'–'TT6'
  knownRoot?: string;     // root form for suffix analysis
  originalAttempt?: string;  // for H4: child's first answer
  revision?: string | null;  // for H4: child's self-check revision
  correctAnswer?: string;    // the model answer
}

// ─── Mongolian vowel set ─────────────────────────────────────────────────────

const VOWELS = new Set([
  'а', 'э', 'и', 'о', 'у', 'ө', 'ү', 'е', 'ё',
]);

function isVowel(ch: string): boolean {
  return VOWELS.has(ch.toLowerCase());
}

// ─── Confusable pair lookup ──────────────────────────────────────────────────

/**
 * Additional confusable pairs from the doc that aren't purely consonant pairs.
 * The doc explicitly classifies о/у substitution as D3 (example #1).
 */
const EXTRA_CONFUSABLE_PAIRS: readonly [string, string][] = [
  ['о', 'у'],
];

function isConfusablePair(a: string, b: string): boolean {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  for (const [x, y] of CONFUSABLE_CONSONANT_PAIRS) {
    if ((al === x && bl === y) || (al === y && bl === x)) return true;
  }
  for (const [x, y] of EXTRA_CONFUSABLE_PAIRS) {
    if ((al === x && bl === y) || (al === y && bl === x)) return true;
  }
  return false;
}

// ─── Suffix helpers ──────────────────────────────────────────────────────────

/**
 * Try to find a suffix by testing progressively shorter prefixes of the word
 * as potential roots, returning the first match.
 */
function trySuffixExtraction(word: string): ReturnType<typeof extractSuffix> {
  // Try from longest root (word minus 1 char) to shortest reasonable root (2 chars)
  for (let rootLen = word.length - 1; rootLen >= 1; rootLen--) {
    const candidateRoot = word.slice(0, rootLen);
    const result = extractSuffix(word, candidateRoot);
    if (result) return result;
  }
  return null;
}

/**
 * Check if a position is inside the suffix portion of the word.
 */
function isInSuffix(word: string, position: number, rootLength: number): boolean {
  return position >= rootLength;
}

// ─── Core classifier ────────────────────────────────────────────────────────

export function classifyWordErrors(
  diff: AnswerDiff,
  expectedWord: string,
  actualWord: string,
  taskMeta?: TaskMeta,
): ClassifiedError[] {
  if (diff.isCorrect) return [];

  const errors: ClassifiedError[] = [];

  // Track which diff items have been classified to avoid double-classification
  const classifiedMissing = new Set<number>();
  const classifiedExtra = new Set<number>();
  const classifiedWrong = new Set<number>();
  const classifiedTranspositions = new Set<number>();

  // Determine suffix info for E-family classification.
  // Only attempt suffix extraction when a knownRoot is explicitly provided —
  // auto-detection is too aggressive and misclassifies root-final characters.
  const knownRoot = taskMeta?.knownRoot;
  const expectedSuffix = knownRoot
    ? extractSuffix(expectedWord, knownRoot)
    : null;
  const actualSuffix = knownRoot
    ? extractSuffix(actualWord, knownRoot)
    : null;

  // Even when extractSuffix fails (compound/unknown suffix), if knownRoot is
  // provided and the expected word extends beyond the root, treat the tail as
  // the suffix for E-family analysis.
  const hasKnownRootTail = knownRoot
    && expectedWord.startsWith(knownRoot)
    && expectedWord.length > knownRoot.length;

  const expectedRootLen = knownRoot && hasKnownRootTail
    ? knownRoot.length
    : (expectedSuffix ? expectedSuffix.root.length : expectedWord.length);

  // ── 1. C1 — Урт эгшиг орхигдол ──────────────────────────────────────────
  for (let i = 0; i < diff.missingChars.length; i++) {
    const { char, position } = diff.missingChars[i];
    if (isLongVowelPart(expectedWord, position)) {
      errors.push({
        errorCode: 'C1',
        severity: 2,
        position,
        expectedChar: char + char,
        actualChar: char,
        contextWord: expectedWord,
        message: `Урт эгшиг орхигдол: "${expectedWord}" дотор давхар ${char} байх ёстой`,
      });
      classifiedMissing.add(i);
    }
  }

  // ── 2. C2 — Урт эгшиг илүүдэл ──────────────────────────────────────────
  for (let i = 0; i < diff.extraChars.length; i++) {
    const { char, position } = diff.extraChars[i];
    if (!isVowel(char)) continue;

    // Check that this extra vowel creates a doubling in the actual word
    // (the actual word has a vowel pair where expected doesn't)
    const actualPos = position;
    const hasAdjacentSame =
      (actualPos > 0 && actualWord[actualPos - 1] === char) ||
      (actualPos < actualWord.length - 1 && actualWord[actualPos + 1] === char);

    if (hasAdjacentSame) {
      errors.push({
        errorCode: 'C2',
        severity: 2,
        position,
        expectedChar: char,
        actualChar: char + char,
        contextWord: expectedWord,
        message: `Урт эгшиг илүүдэл: "${expectedWord}" дотор давхар ${char} байх ёсгүй`,
      });
      classifiedExtra.add(i);
    }
  }

  // ── 3. C4 — Балархай эгшиг орхигдол ─────────────────────────────────────
  for (let i = 0; i < diff.missingChars.length; i++) {
    if (classifiedMissing.has(i)) continue;
    const { char, position } = diff.missingChars[i];
    if (isReducedVowelPosition(expectedWord, position)) {
      errors.push({
        errorCode: 'C4',
        severity: 2,
        position,
        expectedChar: char,
        actualChar: undefined,
        contextWord: expectedWord,
        message: `Балархай эгшиг орхигдол: "${expectedWord}" дотор ${char} сул дуудагдах ч бичих ёстой`,
      });
      classifiedMissing.add(i);
    }
  }

  // ── 4. D3 — Гийгүүлэгч андуурал ────────────────────────────────────────
  for (let i = 0; i < diff.wrongChars.length; i++) {
    const { expected, actual, position } = diff.wrongChars[i];

    // NOT D3 if the difference is in a suffix position → that's E2
    if (expectedSuffix && isInSuffix(expectedWord, position, expectedRootLen)) {
      continue;
    }

    if (isConfusablePair(expected, actual)) {
      errors.push({
        errorCode: 'D3',
        severity: 2,
        position,
        expectedChar: expected,
        actualChar: actual,
        contextWord: expectedWord,
        message: `Гийгүүлэгч андуурал: "${expected}" байх ёстой газар "${actual}" бичсэн`,
      });
      classifiedWrong.add(i);
    }
  }

  // ── 5–7. E1 / E2 / E7 — Залгаврын алдаанууд ────────────────────────────
  // E-family errors are mutually exclusive per suffix
  const eFamilyClassified = classifyEFamily(
    expectedWord,
    actualWord,
    expectedSuffix,
    actualSuffix,
    knownRoot,
  );
  if (eFamilyClassified) {
    errors.push(eFamilyClassified);
    // Mark relevant diff items as classified based on suffix positions
    if (hasKnownRootTail || expectedSuffix) {
      for (let i = 0; i < diff.missingChars.length; i++) {
        if (diff.missingChars[i].position >= expectedRootLen) {
          classifiedMissing.add(i);
        }
      }
      for (let i = 0; i < diff.extraChars.length; i++) {
        if (diff.extraChars[i].position >= expectedRootLen) {
          classifiedExtra.add(i);
        }
      }
      for (let i = 0; i < diff.wrongChars.length; i++) {
        if (diff.wrongChars[i].position >= expectedRootLen) {
          classifiedWrong.add(i);
        }
      }
    }
  }

  // ── 8. B3 — Үсгийн байрлал солигдол ─────────────────────────────────────
  for (let i = 0; i < diff.transpositions.length; i++) {
    if (classifiedTranspositions.has(i)) continue;
    const { chars, position } = diff.transpositions[i];
    errors.push({
      errorCode: 'B3',
      severity: 1,
      position,
      expectedChar: chars[0] + chars[1],
      actualChar: chars[1] + chars[0],
      contextWord: expectedWord,
      message: `Үсгийн байрлал солигдол: "${chars[0]}${chars[1]}" → "${chars[1]}${chars[0]}"`,
    });
    classifiedTranspositions.add(i);
  }

  // ── 9. B1 — Үсэг орхигдол (catch-all for remaining deletions) ──────────
  for (let i = 0; i < diff.missingChars.length; i++) {
    if (classifiedMissing.has(i)) continue;
    const { char, position } = diff.missingChars[i];
    errors.push({
      errorCode: 'B1',
      severity: 2,
      position,
      expectedChar: char,
      actualChar: undefined,
      contextWord: expectedWord,
      message: `Үсэг орхигдол: "${expectedWord}" дотор "${char}" дутуу`,
    });
    classifiedMissing.add(i);
  }

  // Cap at 3 errors per word, keeping highest severity
  if (errors.length > 3) {
    errors.sort((a, b) => b.severity - a.severity);
    errors.length = 3;
  }

  return errors;
}

// ─── E-family classifier ────────────────────────────────────────────────────

function classifyEFamily(
  expectedWord: string,
  actualWord: string,
  expectedSuffix: ReturnType<typeof extractSuffix>,
  actualSuffix: ReturnType<typeof extractSuffix>,
  knownRoot?: string,
): ClassifiedError | null {
  // Determine the root — either from extractSuffix result or from knownRoot directly
  const root = expectedSuffix?.root ?? knownRoot;
  if (!root) return null;

  // Expected must extend beyond root to have a suffix
  if (!expectedWord.startsWith(root) || expectedWord.length <= root.length) return null;

  const expectedTail = expectedWord.slice(root.length);

  // E1: Actual equals root — suffix completely missing
  if (actualWord === root) {
    return {
      errorCode: 'E1',
      severity: 2,
      position: root.length,
      expectedChar: expectedTail,
      actualChar: undefined,
      contextWord: expectedWord,
      message: `Залгавар орхигдол: "${expectedTail}" залгавар бичигдээгүй`,
    };
  }

  // Actual must also start with root for E-family to apply
  if (!actualWord.startsWith(root)) return null;

  const actualTail = actualWord.slice(root.length);

  // If tails are identical, no error
  if (actualTail === expectedTail) return null;

  // No actual tail → E1
  if (actualTail.length === 0) {
    return {
      errorCode: 'E1',
      severity: 2,
      position: root.length,
      expectedChar: expectedTail,
      actualChar: undefined,
      contextWord: expectedWord,
      message: `Залгавар орхигдол: "${expectedTail}" залгавар бичигдээгүй`,
    };
  }

  // E1: Actual tail is a strict prefix of expected tail → partial suffix omission
  if (expectedTail.startsWith(actualTail) && actualTail.length < expectedTail.length) {
    return {
      errorCode: 'E1',
      severity: 2,
      position: root.length + actualTail.length,
      expectedChar: expectedTail,
      actualChar: actualTail,
      contextWord: expectedWord,
      message: `Залгавар хэсэгчлэн орхигдол: "${actualTail}" бичсэн, "${expectedTail}" байх ёстой`,
    };
  }

  // E2: Both tails are recognized suffixes but different → wrong suffix selection
  if (actualSuffix && expectedSuffix && actualSuffix.root === root) {
    if (actualSuffix.suffix !== expectedSuffix.suffix) {
      return {
        errorCode: 'E2',
        severity: 2,
        position: root.length,
        expectedChar: expectedTail,
        actualChar: actualTail,
        contextWord: expectedWord,
        message: `Буруу залгавар: "${actualTail}" биш "${expectedTail}" байх ёстой`,
      };
    }
  }

  // E2 fallback: both have different recognized suffixes even without extractSuffix match
  // (e.g. knownRoot-based where tails map to different suffix types)
  if (knownRoot) {
    const expSuffix = extractSuffix(expectedWord, knownRoot);
    const actSuffix = extractSuffix(actualWord, knownRoot);
    if (expSuffix && actSuffix && expSuffix.suffix !== actSuffix.suffix) {
      return {
        errorCode: 'E2',
        severity: 2,
        position: root.length,
        expectedChar: expectedTail,
        actualChar: actualTail,
        contextWord: expectedWord,
        message: `Буруу залгавар: "${actualTail}" биш "${expectedTail}" байх ёстой`,
      };
    }
  }

  // E7: Tail exists but differs — spelling error within the suffix
  return {
    errorCode: 'E7',
    severity: 2,
    position: root.length,
    expectedChar: expectedTail,
    actualChar: actualTail,
    contextWord: expectedWord,
    message: `Залгавар бичлэгийн алдаа: "${actualTail}" биш "${expectedTail}" байх ёстой`,
  };
}

// ─── Sentence-level classifier ──────────────────────────────────────────────

export function classifySentenceErrors(
  sentenceDiff: SentenceDiff,
  taskMeta?: TaskMeta,
): ClassifiedError[] {
  const errors: ClassifiedError[] = [];

  // ── G1 — Том үсгийн алдаа ───────────────────────────────────────────────
  for (const ce of sentenceDiff.caseErrors) {
    errors.push({
      errorCode: 'G1',
      severity: 1,
      position: ce.position,
      expectedChar: ce.expected,
      actualChar: ce.actual,
      contextWord: '',
      message: `Том үсгийн алдаа: "${ce.expected}" байх ёстой газар "${ce.actual}" бичсэн`,
    });
  }

  // ── G2 — Цэг орхигдол ───────────────────────────────────────────────────
  for (const mp of sentenceDiff.missingPunctuation) {
    errors.push({
      errorCode: 'G2',
      severity: 1,
      position: mp.position,
      expectedChar: mp.char,
      actualChar: undefined,
      contextWord: '',
      message: `Цэг тэмдэг орхигдол: "${mp.char}" дутуу`,
    });
  }

  // ── Word-level errors ────────────────────────────────────────────────────
  for (const wordDiff of sentenceDiff.words) {
    if (wordDiff.diff.isCorrect) continue;
    const wordErrors = classifyWordErrors(
      wordDiff.diff,
      wordDiff.expectedWord,
      wordDiff.actualWord,
      taskMeta,
    );
    errors.push(...wordErrors);
  }

  // ── H4 — Өөрийгөө шалгаагүй ────────────────────────────────────────────
  if (taskMeta?.taskType === 'TT6') {
    const h4 = classifyH4(taskMeta);
    if (h4) errors.push(h4);
  }

  return errors;
}

// ─── H4 classifier ──────────────────────────────────────────────────────────

function classifyH4(taskMeta: TaskMeta): ClassifiedError | null {
  const { originalAttempt, revision, correctAnswer } = taskMeta;

  // No revision submitted → H4
  if (revision === null || revision === undefined) {
    return {
      errorCode: 'H4',
      severity: 1,
      position: 0,
      contextWord: '',
      message: 'Өөрийгөө шалгаагүй: засвар хийгээгүй',
    };
  }

  // Original was already correct → no H4
  if (originalAttempt === correctAnswer) return null;

  // Revision is identical to the original wrong answer → H4
  if (revision === originalAttempt) {
    return {
      errorCode: 'H4',
      severity: 1,
      position: 0,
      contextWord: '',
      message: 'Өөрийгөө шалгаагүй: анхны хариуг засаагүй',
    };
  }

  // Revision differs from original (child attempted correction) → no H4
  return null;
}

// ─── Scoring function ───────────────────────────────────────────────────────

export function calculateScore(errors: ClassifiedError[]): number {
  if (errors.length === 0) return 1.0;

  const sev2Plus = errors.filter((e) => e.severity >= 2);

  if (sev2Plus.length === 0) return 0.75; // only severity 1
  if (sev2Plus.length <= 2) return 0.5;
  return 0.25; // 3+ severity 2+ errors
}
