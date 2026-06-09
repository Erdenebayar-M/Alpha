/**
 * Error Classifier — takes raw diffs from answer-checker and classifies each
 * diff into one of the full v3 error codes (A1–H4).
 *
 * Classification priority order (word-level):
 *   C1 → C2 → C4 → C5 → C3 → C6 → D1 → D2 → D4 → D3 → D5 → A1 → A2 → A3
 *   → E1 → E2 → E3 → E7 → B3 → B1 → B2 → B4
 *
 * Sentence-level adds: G1 → G2 → G3 → G4 → G5
 * Self-check adds: H4
 * Metric-only: H2 (speed), H3 (attention) — via detectMetricErrors()
 * Context-assigned: F1–F4, H1 — set by task.error_targets, not auto-classified
 */

import type { AnswerDiff, SentenceDiff } from './answer-checker';
import {
  isLongVowelPart,
  isReducedVowelPosition,
  extractSuffix,
  CONFUSABLE_CONSONANT_PAIRS,
  isConsonant,
  isVowel,
} from './mongolian-utils';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'A1' | 'A2' | 'A3'
  | 'B1' | 'B2' | 'B3' | 'B4'
  | 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6'
  | 'D1' | 'D2' | 'D3' | 'D4' | 'D5'
  | 'E1' | 'E2' | 'E3' | 'E7'
  | 'G1' | 'G2' | 'G3' | 'G4' | 'G5'
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
  taskType: string;
  knownRoot?: string;
  originalAttempt?: string;
  revision?: string | null;
  correctAnswer?: string;
}

// ─── Mongolian vowel sets ────────────────────────────────────────────────────

const VOWELS = new Set([
  'а', 'э', 'и', 'о', 'у', 'ө', 'ү', 'е', 'ё',
]);

function isVowelChar(ch: string): boolean {
  return VOWELS.has(ch.toLowerCase());
}

// Masculine vowels (эр үг) vs feminine vowels (эм үг) for harmony detection
const MASCULINE_VOWELS = new Set(['а', 'о', 'у']);
const FEMININE_VOWELS = new Set(['э', 'ө', 'ү']);

function getVowelHarmony(word: string): 'masculine' | 'feminine' | 'neutral' {
  let lastHarmony: 'masculine' | 'feminine' | 'neutral' = 'neutral';
  for (const ch of word) {
    if (MASCULINE_VOWELS.has(ch)) lastHarmony = 'masculine';
    else if (FEMININE_VOWELS.has(ch)) lastHarmony = 'feminine';
  }
  return lastHarmony;
}

// ─── Confusable pair lookup ──────────────────────────────────────────────────

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

function trySuffixExtraction(word: string): ReturnType<typeof extractSuffix> {
  for (let rootLen = word.length - 1; rootLen >= 1; rootLen--) {
    const candidateRoot = word.slice(0, rootLen);
    const result = extractSuffix(word, candidateRoot);
    if (result) return result;
  }
  return null;
}

function isInSuffix(position: number, rootLength: number): boolean {
  return position >= rootLength;
}

// ─── Core word-level classifier ──────────────────────────────────────────────

export function classifyWordErrors(
  diff: AnswerDiff,
  expectedWord: string,
  actualWord: string,
  taskMeta?: TaskMeta,
): ClassifiedError[] {
  if (diff.isCorrect) return [];

  const errors: ClassifiedError[] = [];
  const classifiedMissing = new Set<number>();
  const classifiedExtra = new Set<number>();
  const classifiedWrong = new Set<number>();
  const classifiedTranspositions = new Set<number>();

  const knownRoot = taskMeta?.knownRoot;
  const expectedSuffix = knownRoot
    ? extractSuffix(expectedWord, knownRoot)
    : extractSuffix(expectedWord);
  const actualSuffix = knownRoot
    ? extractSuffix(actualWord, knownRoot)
    : extractSuffix(actualWord);

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
        errorCode: 'C1', severity: 2, position,
        expectedChar: char + char, actualChar: char, contextWord: expectedWord,
        message: `Урт эгшиг орхигдол: "${expectedWord}" дотор давхар ${char} байх ёстой`,
      });
      classifiedMissing.add(i);
    }
  }

  // ── 2. C2 — Урт эгшиг илүүдэл ──────────────────────────────────────────
  for (let i = 0; i < diff.extraChars.length; i++) {
    const { char, position } = diff.extraChars[i];
    if (!isVowelChar(char)) continue;
    const actualPos = position;
    const hasAdjacentSame =
      (actualPos > 0 && actualWord[actualPos - 1] === char) ||
      (actualPos < actualWord.length - 1 && actualWord[actualPos + 1] === char);
    if (hasAdjacentSame) {
      errors.push({
        errorCode: 'C2', severity: 2, position,
        expectedChar: char, actualChar: char + char, contextWord: expectedWord,
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
        errorCode: 'C4', severity: 2, position,
        expectedChar: char, actualChar: undefined, contextWord: expectedWord,
        message: `Балархай эгшиг орхигдол: "${expectedWord}" дотор ${char} сул дуудагдах ч бичих ёстой`,
      });
      classifiedMissing.add(i);
    }
  }

  // ── 4. C5 — Балархай эгшиг илүүдэл ──────────────────────────────────────
  // Extra vowel that doesn't form a long-vowel pair → reduced vowel added incorrectly
  for (let i = 0; i < diff.extraChars.length; i++) {
    if (classifiedExtra.has(i)) continue;
    const { char, position } = diff.extraChars[i];
    if (!isVowelChar(char)) continue;
    errors.push({
      errorCode: 'C5', severity: 2, position,
      expectedChar: undefined, actualChar: char, contextWord: expectedWord,
      message: `Балархай эгшиг илүүдэл: "${expectedWord}" дотор "${char}" нэмэлт эгшиг бичсэн`,
    });
    classifiedExtra.add(i);
  }

  // ── 5. D3 — Гийгүүлэгч андуурал (confusable pairs, incl. о/у) ──────────
  // Must run BEFORE C3 since о/у is a confusable pair classified as D3
  for (let i = 0; i < diff.wrongChars.length; i++) {
    if (classifiedWrong.has(i)) continue;
    const { expected, actual, position } = diff.wrongChars[i];
    if (isInSuffix(position, expectedRootLen)) continue;
    if (isConfusablePair(expected, actual)) {
      errors.push({
        errorCode: 'D3', severity: 2, position,
        expectedChar: expected, actualChar: actual, contextWord: expectedWord,
        message: `Гийгүүлэгч андуурал: "${expected}" байх ёстой газар "${actual}" бичсэн`,
      });
      classifiedWrong.add(i);
    }
  }

  // ── 6. C3 — Эгшиг андуурах ───────────────────────────────────────────────
  // Vowel-for-vowel substitution not already classified as D3 (confusable pair)
  for (let i = 0; i < diff.wrongChars.length; i++) {
    if (classifiedWrong.has(i)) continue;
    const { expected, actual, position } = diff.wrongChars[i];
    if (
      isVowelChar(expected) && isVowelChar(actual) &&
      !isInSuffix(position, expectedRootLen)
    ) {
      errors.push({
        errorCode: 'C3', severity: 2, position,
        expectedChar: expected, actualChar: actual, contextWord: expectedWord,
        message: `Эгшиг андуурах: "${expected}" байх ёстой газар "${actual}" бичсэн`,
      });
      classifiedWrong.add(i);
    }
  }

  // D1/D2/D4/D5: consonant-specific codes are assigned via task.error_targets
  // rather than auto-classified from diff, to avoid stealing B1's catch-all role.
  // The enum values exist in the DB and can be written by the admin/content pipeline.

  // ── 7. E1 / E2 / E3 / E7 — Залгаврын алдаанууд ──────────────────────────
  const eFamilyClassified = classifyEFamily(
    expectedWord, actualWord, expectedSuffix, actualSuffix, knownRoot,
  );
  if (eFamilyClassified) {
    errors.push(eFamilyClassified);
    if (hasKnownRootTail || expectedSuffix) {
      for (let i = 0; i < diff.missingChars.length; i++) {
        if (diff.missingChars[i].position >= expectedRootLen) classifiedMissing.add(i);
      }
      for (let i = 0; i < diff.extraChars.length; i++) {
        if (diff.extraChars[i].position >= expectedRootLen) classifiedExtra.add(i);
      }
      for (let i = 0; i < diff.wrongChars.length; i++) {
        if (diff.wrongChars[i].position >= expectedRootLen) classifiedWrong.add(i);
      }
    }
  }

  // ── 8. B3 — Үсгийн байрлал солигдол ─────────────────────────────────────
  for (let i = 0; i < diff.transpositions.length; i++) {
    if (classifiedTranspositions.has(i)) continue;
    const { chars, position } = diff.transpositions[i];
    errors.push({
      errorCode: 'B3', severity: 1, position,
      expectedChar: chars[0] + chars[1], actualChar: chars[1] + chars[0],
      contextWord: expectedWord,
      message: `Үсгийн байрлал солигдол: "${chars[0]}${chars[1]}" → "${chars[1]}${chars[0]}"`,
    });
    classifiedTranspositions.add(i);
  }

  // ── 9. B1 — Үсэг орхигдол (catch-all for remaining deletions) ───────────
  for (let i = 0; i < diff.missingChars.length; i++) {
    if (classifiedMissing.has(i)) continue;
    const { char, position } = diff.missingChars[i];
    errors.push({
      errorCode: 'B1', severity: 2, position,
      expectedChar: char, actualChar: undefined, contextWord: expectedWord,
      message: `Үсэг орхигдол: "${expectedWord}" дотор "${char}" дутуу`,
    });
    classifiedMissing.add(i);
  }

  // ── 10. B2 — Үсэг илүүдэл (catch-all for remaining insertions) ──────────
  for (let i = 0; i < diff.extraChars.length; i++) {
    if (classifiedExtra.has(i)) continue;
    const { char, position } = diff.extraChars[i];
    errors.push({
      errorCode: 'B2', severity: 2, position,
      expectedChar: undefined, actualChar: char, contextWord: expectedWord,
      message: `Үсэг илүүдэл: "${expectedWord}" дотор "${char}" илүү бичсэн`,
    });
    classifiedExtra.add(i);
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
  const root = expectedSuffix?.root ?? knownRoot;
  if (!root) return null;
  if (!expectedWord.startsWith(root) || expectedWord.length <= root.length) return null;

  const expectedTail = expectedWord.slice(root.length);

  if (actualWord === root) {
    return {
      errorCode: 'E1', severity: 2, position: root.length,
      expectedChar: expectedTail, actualChar: undefined, contextWord: expectedWord,
      message: `Залгавар орхигдол: "${expectedTail}" залгавар бичигдээгүй`,
    };
  }

  if (!actualWord.startsWith(root)) return null;
  const actualTail = actualWord.slice(root.length);
  if (actualTail === expectedTail) return null;

  if (actualTail.length === 0) {
    return {
      errorCode: 'E1', severity: 2, position: root.length,
      expectedChar: expectedTail, actualChar: undefined, contextWord: expectedWord,
      message: `Залгавар орхигдол: "${expectedTail}" залгавар бичигдээгүй`,
    };
  }

  if (expectedTail.startsWith(actualTail) && actualTail.length < expectedTail.length) {
    return {
      errorCode: 'E1', severity: 2, position: root.length + actualTail.length,
      expectedChar: expectedTail, actualChar: actualTail, contextWord: expectedWord,
      message: `Залгавар хэсэгчлэн орхигдол: "${actualTail}" бичсэн, "${expectedTail}" байх ёстой`,
    };
  }

  // E3: Vowel harmony violation — same suffix class but wrong harmony form
  // (e.g. эрийн vs арийн, рүү vs руу)
  if (actualSuffix && expectedSuffix && actualSuffix.root === root) {
    if (actualSuffix.suffix !== expectedSuffix.suffix) {
      const expHarmony = getVowelHarmony(root);
      const actHarmony = getVowelHarmony(actualTail);
      const isHarmonyError =
        (expHarmony === 'masculine' && actHarmony === 'feminine') ||
        (expHarmony === 'feminine' && actHarmony === 'masculine');
      if (isHarmonyError) {
        return {
          errorCode: 'E3', severity: 2, position: root.length,
          expectedChar: expectedTail, actualChar: actualTail, contextWord: expectedWord,
          message: `Эр/эм залгаврын алдаа: "${actualTail}" биш "${expectedTail}" байх ёстой (эгшгийн зохицол)`,
        };
      }
      return {
        errorCode: 'E2', severity: 2, position: root.length,
        expectedChar: expectedTail, actualChar: actualTail, contextWord: expectedWord,
        message: `Буруу залгавар: "${actualTail}" биш "${expectedTail}" байх ёстой`,
      };
    }
  }

  if (knownRoot) {
    const expSuffix = extractSuffix(expectedWord, knownRoot);
    const actSuffix = extractSuffix(actualWord, knownRoot);
    if (expSuffix && actSuffix && expSuffix.suffix !== actSuffix.suffix) {
      return {
        errorCode: 'E2', severity: 2, position: root.length,
        expectedChar: expectedTail, actualChar: actualTail, contextWord: expectedWord,
        message: `Буруу залгавар: "${actualTail}" биш "${expectedTail}" байх ёстой`,
      };
    }
  }

  return {
    errorCode: 'E7', severity: 2, position: root.length,
    expectedChar: expectedTail, actualChar: actualTail, contextWord: expectedWord,
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
      errorCode: 'G1', severity: 1, position: ce.position,
      expectedChar: ce.expected, actualChar: ce.actual, contextWord: '',
      message: `Том үсгийн алдаа: "${ce.expected}" байх ёстой газар "${ce.actual}" бичсэн`,
    });
  }

  // ── G2 — Цэг орхигдол ───────────────────────────────────────────────────
  for (const mp of sentenceDiff.missingPunctuation) {
    const isFullStop = mp.char === '.';
    const isQuestionExclam = mp.char === '?' || mp.char === '!';
    if (isFullStop) {
      errors.push({
        errorCode: 'G2', severity: 1, position: mp.position,
        expectedChar: mp.char, actualChar: undefined, contextWord: '',
        message: `Цэг орхигдол: "${mp.char}" дутуу`,
      });
    } else if (isQuestionExclam) {
      // ── G3 — Асуулт/анхааруулах тэмдгийн алдаа ───────────────────────
      errors.push({
        errorCode: 'G3', severity: 1, position: mp.position,
        expectedChar: mp.char, actualChar: undefined, contextWord: '',
        message: `Асуулт/анхааруулах тэмдэг орхигдол: "${mp.char}" дутуу`,
      });
    } else {
      // ── G4 — Таслалын алдаа ───────────────────────────────────────────
      errors.push({
        errorCode: 'G4', severity: 1, position: mp.position,
        expectedChar: mp.char, actualChar: undefined, contextWord: '',
        message: `Таслал орхигдол: "${mp.char}" дутуу`,
      });
    }
  }

  // ── G5 — Өгүүлбэрийн хил заагийн алдаа ─────────────────────────────────
  // Extra or missing words signal sentence boundary confusion
  if (sentenceDiff.extraWords.length > 0 || sentenceDiff.missingWords.length > 0) {
    errors.push({
      errorCode: 'G5', severity: 2, position: 0,
      expectedChar: undefined, actualChar: undefined, contextWord: '',
      message: `Өгүүлбэрийн хил заагийн алдаа: үгийн тоо зөрж байна`,
    });
  }

  // ── Word-level errors ────────────────────────────────────────────────────
  for (const wordDiff of sentenceDiff.words) {
    if (wordDiff.diff.isCorrect) continue;
    const wordErrors = classifyWordErrors(
      wordDiff.diff, wordDiff.expectedWord, wordDiff.actualWord, taskMeta,
    );
    errors.push(...wordErrors);
  }

  // ── H4 — Өөрийгөө шалгаагүй ────────────────────────────────────────────
  const isSelfCheck = taskMeta?.taskType &&
    ['TT_8_4'].includes(taskMeta.taskType);
  if (isSelfCheck) {
    const h4 = classifyH4(taskMeta!);
    if (h4) errors.push(h4);
  }

  return errors;
}

// ─── H4 classifier ──────────────────────────────────────────────────────────

function classifyH4(taskMeta: TaskMeta): ClassifiedError | null {
  const { originalAttempt, revision, correctAnswer } = taskMeta;
  if (revision === null || revision === undefined) {
    return {
      errorCode: 'H4', severity: 1, position: 0, contextWord: '',
      message: 'Өөрийгөө шалгаагүй: засвар хийгээгүй',
    };
  }
  if (originalAttempt === correctAnswer) return null;
  if (revision === originalAttempt) {
    return {
      errorCode: 'H4', severity: 1, position: 0, contextWord: '',
      message: 'Өөрийгөө шалгаагүй: анхны хариуг засаагүй',
    };
  }
  return null;
}

// ─── Scoring function ───────────────────────────────────────────────────────

export function calculateScore(errors: ClassifiedError[]): number {
  if (errors.length === 0) return 1.0;
  const sev2Plus = errors.filter((e) => e.severity >= 2);
  if (sev2Plus.length === 0) return 0.75;
  if (sev2Plus.length <= 2) return 0.5;
  return 0.25;
}
