/**
 * Two-tier task classification: word-anchored vs sentence-level.
 *
 * Word-anchored: the target word IS the answer (fill/choose/assemble/word-dictation).
 *   - Hard-filter candidates by task_types_possible ⊇ taskType.
 *   - Reject the LLM output if correct_answer ≠ the pinned word.
 *
 * Sentence-level: the target word appears IN the sentence but is not the answer.
 *   - Softer faithfulness: the word must appear, need not be the answer.
 *
 * Sources:
 *   - derive-capability TTCode union (TT_1_2…TT_7_3) — types the DB already tags words with
 *   - Additional single-word types not in derive-capability's TTCode but still word-anchored
 */

import type { TTCode } from './derive-capability';

/** Additional scheme-C codes that are word-anchored but not in derive-capability's TTCode. */
const EXTRA_WORD_ANCHORED = [
  'TT_1_1', // Авиа сонсоод үсэг сонгох
  'TT_1_5', // Төсөөтэй үсгүүдийг ялгах
  'TT_2_2', // Үсэг угсарч үг болгох
  'TT_2_3', // Зөв бичлэгийг сонгох
  'TT_4_1', // Төстэй сонсогддог гийгүүлэгчүүдийг ялгах
  'TT_7_1', // Хуулж бичих
  'TT_7_2', // Харж тогтоон бичих
] as const;

/** Union of derive-capability TTCode + extra single-word types. */
type AllTaskCode = TTCode | (typeof EXTRA_WORD_ANCHORED)[number];

/**
 * All task codes where the selected word IS the answer.
 * Populated from derive-capability.ts TTCode values + the extra list above.
 * Used by select-words.ts (hard-filter) and generator.ts (faithfulness check).
 */
export const WORD_ANCHORED: Set<string> = new Set<string>([
  // derive-capability TTCode union
  'TT_1_2', 'TT_1_3', 'TT_1_4',
  'TT_2_1',
  'TT_3_1', 'TT_3_2',
  'TT_4_2', 'TT_4_3', 'TT_4_4',
  'TT_5_1', 'TT_5_2', 'TT_5_3', 'TT_5_4', 'TT_5_5', 'TT_5_6', 'TT_5_7',
  'TT_7_3',
  // extra single-word types
  ...EXTRA_WORD_ANCHORED,
]);

export type TaskTier = 'word' | 'sentence';

/** Returns which tier a task type belongs to. */
export function tierFor(taskType: string): TaskTier {
  return WORD_ANCHORED.has(taskType) ? 'word' : 'sentence';
}

// Re-export type for consumers that need it
export type { AllTaskCode };
