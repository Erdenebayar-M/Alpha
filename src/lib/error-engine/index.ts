/**
 * Error Engine — public API for the Mongolian spelling error classification pipeline.
 *
 * Pipeline: answer-checker → error-classifier → attempt-processor
 * Utilities: mongolian-utils (syllabify, suffix extraction, vowel helpers)
 */

// ─── Answer Checker ──────────────────────────────────────────────────────────

export { checkAnswer, checkSentence } from './answer-checker';

export type {
  AnswerDiff,
  SentenceDiff,
  CharDiff,
  WordDiff,
} from './answer-checker';

// ─── Error Classifier ────────────────────────────────────────────────────────

export {
  classifyWordErrors,
  classifySentenceErrors,
  calculateScore,
} from './error-classifier';

export type {
  ClassifiedError,
  ErrorCode,
} from './error-classifier';

// ─── Attempt Processor ───────────────────────────────────────────────────────

export { processAttempt } from './attempt-processor';

export type {
  AttemptInput,
  AttemptResult,
  TaskRecord,
  TaskRepository,
  AttemptRepository,
  ErrorLogRepository,
} from './attempt-processor';

// ─── Mongolian Utilities ─────────────────────────────────────────────────────

export {
  syllabify,
  extractSuffix,
  isLongVowelPart,
  isLongVowelPosition,
  isReducedVowelPosition,
  isVowel,
  isConsonant,
  isConsonantConfusionPair,
  LONG_VOWEL_PAIRS,
  CONFUSABLE_CONSONANT_PAIRS,
} from './mongolian-utils';

export type { SuffixType } from './mongolian-utils';
